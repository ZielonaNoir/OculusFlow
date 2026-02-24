import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const { priceId, mode, planId } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    if (!['subscription', 'payment'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    // Get current authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to purchase.' }, { status: 401 });
    }

    // Enable Alipay and WeChat Pay for all payments to support the 30-day access model
    // Note: These must be enabled in your Stripe Dashboard Payment Methods settings
    const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = 
      ['card', 'alipay', 'wechat_pay'];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethodTypes,
      payment_method_options: {
        wechat_pay: {
          client: 'web',
        },
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode as 'subscription' | 'payment',
      customer_email: user.email, // Auto-fill email in Stripe Checkout
      client_reference_id: user.id, // Crucial for identifying the user in webhooks
      metadata: {
        type: mode, // Can be 'subscription' or 'payment' to distinguish handling
        planId: planId || '',
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?canceled=true`,
      // For automated tax collection, etc.
      // automatic_tax: { enabled: true },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Stripe Checkout Error:', err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
