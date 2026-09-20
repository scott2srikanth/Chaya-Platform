import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import type { PlanKey } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { plan?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const requestedPlan: PlanKey = (body.plan === 'ELITE' ? 'ELITE' : 'PRO');

    const priceId = STRIPE_PRICE_IDS[requestedPlan];
    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe price not configured for ${requestedPlan} plan` },
        { status: 500 }
      );
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    if (subscription.plan === requestedPlan && subscription.status === 'ACTIVE') {
      return NextResponse.json(
        { error: `Already subscribed to ${requestedPlan}` },
        { status: 400 }
      );
    }

    let customerId = subscription.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        plan: requestedPlan,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
