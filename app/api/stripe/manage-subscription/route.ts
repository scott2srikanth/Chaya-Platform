import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

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

    const { action } = await req.json();

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!subscription || !subscription.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
    }

    if (action === 'cancel') {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      return NextResponse.json({ success: true, message: 'Subscription will cancel at period end' });
    }

    if (action === 'reactivate') {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: false,
      });

      return NextResponse.json({ success: true, message: 'Subscription reactivated' });
    }

    if (action === 'portal') {
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id!,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing`,
      });

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Manage subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to manage subscription' },
      { status: 500 }
    );
  }
}
