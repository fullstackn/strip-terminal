import Stripe from "stripe";


// @ts-ignore
export const stripe = new Stripe(
    "sk_test_51PcUel2KdrNKvQJCUh4JsqOwo2uLneQEiNkvu4zeKoFEMVLwXsOldaCRj7k3ox9UJYrhjVQE1yNKAaj3SKwpK0hv00Eor0oKUs",
    {
        apiVersion: "2023-10-16",
        appInfo: {
            name: "stripe-samples/accept-a-payment",
            url: "https://github.com/stripe-samples",
            version: "0.0.2",
        },
        typescript: true,
    });

const readerId = 'tmr_FpD30gYPwhSd9i'

export async function createIntent(amount: any, currency: any)  {
  const paymentIntent: any = await stripe.paymentIntents.create(
      {
            amount: amount * 100,
            currency: currency,
            payment_method_types: ['card_present'],
            capture_method: 'automatic',
  });
  const readerIntent = await stripe.terminal.readers.processPaymentIntent(
        readerId,
        {
          payment_intent: paymentIntent.id,
        }
      );
  const reader = await stripe.testHelpers.terminal.readers.presentPaymentMethod(readerId);
  return reader;
}


export async function processRefund(pi_id: string)  {
    console.log('processRefund', pi_id);
    const refund = await stripe.refunds.create({
        payment_intent: pi_id,
    });
    console.log('refund', refund);
    return refund;

}

