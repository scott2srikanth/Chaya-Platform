import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_WEBHOOK_SECRET, getPlanFromPriceId } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';
import type { PlanKey } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function resolvePlanFromSubscription(stripeSubscription: Stripe.Subscription, sessionMeta?: Record<string, string>): Promise<PlanKey> {
  if (sessionMeta?.plan === 'ELITE' || sessionMeta?.plan === 'PRO') {
    return sessionMeta.plan;
  }

  const items = stripeSubscription.items?.data;
  if (items && items.length > 0) {
    const priceId = items[0].price?.id;
    if (priceId) {
      const matched = getPlanFromPriceId(priceId);
      if (matched) return matched;
    }
  }

  return 'PRO';
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const periodEnd = new Date((stripeSubscription as any).current_period_end * 1000).toISOString();

  const plan = await resolvePlanFromSubscription(stripeSubscription, session.metadata as Record<string, string>);

  const { error: subError } = await supabase
    .from('subscriptions')
    .update({
      plan,
      status: 'ACTIVE',
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      current_period_end: periodEnd,
    })
    .eq('user_id', userId);

  if (subError) {
    console.error('Failed to update subscription:', subError);
    return;
  }

  const amount = session.amount_total || 0;

  await supabase.from('payments').insert({
    user_id: userId,
    amount,
    currency: session.currency || 'usd',
    status: 'SUCCESS',
    provider: 'stripe',
    provider_reference: session.id,
    stripe_payment_intent_id: session.payment_intent as string,
    metadata: {
      subscription_id: subscriptionId,
      plan,
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!existingSub) return;

  let status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' = 'ACTIVE';
  if (subscription.status === 'canceled') status = 'CANCELED';
  else if (subscription.status === 'past_due') status = 'PAST_DUE';

  const plan = await resolvePlanFromSubscription(subscription);

  await supabase
    .from('subscriptions')
    .update({
      status,
      plan,
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
    })
    .eq('stripe_customer_id', customerId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  await supabase
    .from('subscriptions')
    .update({
      plan: 'FREE',
      status: 'CANCELED',
      stripe_subscription_id: null,
      current_period_end: null,
    })
    .eq('stripe_customer_id', customerId);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as any).subscription as string;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!sub) return;

  await supabase.from('payments').insert({
    user_id: sub.user_id,
    amount: (invoice as any).amount_paid,
    currency: invoice.currency,
    status: 'SUCCESS',
    provider: 'stripe',
    provider_reference: invoice.id,
    stripe_payment_intent_id: (invoice as any).payment_intent as string,
    metadata: {
      subscription_id: subscriptionId,
      invoice_number: (invoice as any).number,
    },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!sub) return;

  await supabase.from('payments').insert({
    user_id: sub.user_id,
    amount: (invoice as any).amount_due,
    currency: invoice.currency,
    status: 'FAILED',
    provider: 'stripe',
    provider_reference: invoice.id,
    metadata: {
      error: 'Payment failed',
    },
  });

  await supabase
    .from('subscriptions')
    .update({ status: 'PAST_DUE' })
    .eq('stripe_customer_id', customerId);
}
