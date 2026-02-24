import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// We must use the Service Role Key in webhooks to bypass RLS securely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  console.log('--- Incoming Webhook Request ---');

  if (!signature || !endpointSecret) {
    console.error('Missing signature or secret');
    return NextResponse.json(
      { error: 'Missing stripe signature or endpoint secret' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    console.log(`Event constructed: ${event.type} [${event.id}]`);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${errorMessage}`);
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Processing checkout.session.completed:', session.id);
        console.log('Metadata:', session.metadata);
        console.log('Mode:', session.mode);

        // Retrieve user ID passed during checkout creation
        const userId = session.client_reference_id;
        if (!userId) {
          console.error('No client_reference_id found in session', session.id);
          break;
        }

        const mode = session.metadata?.type || session.mode; // our custom metadata or stripe mode
        const planId = session.metadata?.planId;
        const stripeCustomerId = session.customer as string;

        console.log('User ID from session:', userId);
        console.log('Handling mode:', mode, 'Plan ID:', planId);

        if (mode === 'subscription' || ['entry-30-days', 'pro-30-days', 'enterprise-30-days'].includes(planId || '')) {
          console.log('Entering membership grant block...');
          // Handle new subscription or 30-day buyout
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30); // Exactly 30 days

          let creditsToAdd = 0;
          if (planId === 'entry-30-days') creditsToAdd = 250;
          if (planId === 'pro-30-days') creditsToAdd = 1200;
          if (planId === 'enterprise-30-days') creditsToAdd = 7000;

          console.log('Target credits to add:', creditsToAdd);

          // Step 1: Update PRO status
          console.log('Attempting to update user_credits for PRO status...');
          const { error: proError } = await supabaseAdmin
            .from('user_credits')
            .update({
              is_pro: true,
              pro_expires_at: expiresAt.toISOString(),
              stripe_customer_id: stripeCustomerId,
            })
            .eq('user_id', userId);

          if (proError) {
            console.error('PRO update error:', proError);
            throw proError;
          }
          console.log('PRO status updated successfully');

          // Step 2: Add Credits
          if (creditsToAdd > 0) {
            console.log('Attempting to fetch current credit balance...');
            const { data, error: fetchError } = await supabaseAdmin
              .from('user_credits')
              .select('credit_balance')
              .eq('user_id', userId)
              .single();

            if (fetchError) {
              console.error('Credit fetch error:', fetchError);
              throw fetchError;
            }

            console.log('Current balance found:', data?.credit_balance);
            const newBalance = (data?.credit_balance || 0) + creditsToAdd;
            
            console.log('Attempting to update credit balance to:', newBalance);
            const { error: updateError } = await supabaseAdmin
              .from('user_credits')
              .update({ credit_balance: newBalance })
              .eq('user_id', userId);

            if (updateError) {
              console.error('Credit update error:', updateError);
              throw updateError;
            }
            console.log('Credit balance updated successfully');
          }

          console.log(`[Membership] User ${userId} granted 30-day PRO + ${creditsToAdd} credits`);
        } else if (mode === 'payment') {
          console.log('Entering one-time payment block...');
          // Handle one-time payment (Individual Credits Pack if we ever add them back)
          // const amountTotal = session.amount_total;
          // ... existing logic for credits if needed
        }
        break;
      }
      
      // Handle subscription cancellations/updates later
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        const { error } = await supabaseAdmin
          .from('user_credits')
          .update({
            is_pro: false,
            pro_expires_at: null,
          })
          .eq('stripe_customer_id', stripeCustomerId);

        if (error) console.error('Failed to update subscription deletion', error);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error('Webhook handler caught an exception:', err);
    const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
    console.error(`Detailed Webhook Error: ${errorMessage}`);
    return NextResponse.json({ error: 'Webhook handler failed', details: errorMessage }, { status: 500 });
  }
}
