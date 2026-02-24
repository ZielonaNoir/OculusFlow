import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;

if (!key) {
  console.error('STRIPE_SECRET_KEY not found');
  process.exit(1);
}

const stripe = new Stripe(key);

async function setup() {
  try {
    console.log('--- Creating Test Mode Products & Prices ---');
    
    // 1. Oculus Pro
    const prodPro = await stripe.products.create({
      name: 'Oculus Pro (Test)',
      description: 'Premium subscription for OculusFlow AI Agents (Test Mode).',
    });
    const pricePro = await stripe.prices.create({
      product: prodPro.id,
      unit_amount: 1900,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log(`✅ Oculus Pro Price ID: ${pricePro.id}`);

    // 2. 100 Credits
    const prodCredits = await stripe.products.create({
      name: '100 Credits (Test)',
      description: '100 High-Speed Credits for OculusFlow AI Agents (Test Mode).',
    });
    const priceCredits = await stripe.prices.create({
      product: prodCredits.id,
      unit_amount: 1000,
      currency: 'usd',
    });
    console.log(`✅ 100 Credits Price ID: ${priceCredits.id}`);

    console.log('\n--- SUCCESS ---');
    console.log('Copy these IDs into your PRICING_PLANS in app/pricing/page.tsx');
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('❌ FAILURE:', errorMessage);
  }
}

setup();
