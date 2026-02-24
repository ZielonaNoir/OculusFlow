import Stripe from 'stripe';

// Bun automatically loads .env.local
const key = process.env.STRIPE_SECRET_KEY;

if (!key) {
  console.error('STRIPE_SECRET_KEY not found in process.env');
  process.exit(1);
}

// Check for invisible characters
const cleanKey = key.trim();
if (cleanKey !== key) {
  console.log('WARNING: Key had leading/trailing whitespace');
}

console.log('--- Key Debug Info ---');
console.log('Raw length:', key.length);
console.log('Clean length:', cleanKey.length);
console.log('Prefix:', key.substring(0, 8));
console.log('Suffix:', key.substring(key.length - 8));
console.log('Hex representation of prefix:', Buffer.from(key.substring(0, 8)).toString('hex'));

const stripe = new Stripe(cleanKey);

async function test() {
  try {
    console.log('\n--- Testing Stripe authentication ---');
    const account = await stripe.accounts.retrieve();
    console.log('✅ SUCCESS: Authenticated successfully!');
    console.log('Account ID:', account.id);
    console.log('Business Name:', account.business_profile?.name || 'N/A');
    
    console.log('\n--- Testing Price IDs ---');
    const prices = await stripe.prices.list({ limit: 10 });
    if (prices.data.length === 0) {
      console.log('⚠️ No prices found in this account.');
    } else {
      console.log('Found prices:');
      prices.data.forEach(p => {
        console.log(`- ID: ${p.id} | Amount: ${p.unit_amount ? p.unit_amount / 100 : 0} ${p.currency.toUpperCase()} | Type: ${p.type}`);
      });
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('\n❌ FAILURE:', errorMessage);
    if (err && typeof err === 'object' && 'raw' in err) {
      const stripeErr = err as { code?: string; rawType?: string; requestId?: string };
      console.error('Error Code:', stripeErr.code);
      console.error('Error Type:', stripeErr.rawType);
      console.error('Request ID:', stripeErr.requestId);
    }
  }
}

test();
