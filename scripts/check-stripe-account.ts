import Stripe from 'stripe';

// Bun automatically loads .env files, so no need for dotenv
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function checkAccount() {
  try {
    const account = await stripe.accounts.retrieve();
    console.log('Account ID:', account.id);
    console.log('Country:', account.country);
    console.log('Default Currency:', account.default_currency);
    
    // Check capabilities for alipay and wechat_pay
    console.log('Capabilities:', JSON.stringify(account.capabilities, null, 2));
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Error:', errorMessage);
  }
}

checkAccount();
