import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

if (!stripeSecretKey && typeof window === 'undefined') {
  console.warn('STRIPE_SECRET_KEY is not set - Stripe features will be disabled');
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  : null as any;

export const STRIPE_PRICE_IDS: Record<string, string> = {
  PRO: process.env.STRIPE_PRICE_ID || '',
  ELITE: process.env.STRIPE_ELITE_PRICE_ID || '',
};

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export type PlanKey = 'FREE' | 'PRO' | 'ELITE';

export function getPlanFromPriceId(priceId: string): PlanKey | null {
  for (const [plan, id] of Object.entries(STRIPE_PRICE_IDS)) {
    if (id && id === priceId) return plan as PlanKey;
  }
  return null;
}

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    videoLimit: 2,
    features: [
      'Upload up to 2 videos',
      'Basic hotspot editor',
      'Video player',
      'Community support'
    ]
  },
  PRO: {
    name: 'Pro',
    price: 10,
    videoLimit: Infinity,
    features: [
      'Unlimited video uploads',
      'Advanced hotspot editor',
      'AI-powered hotspot generation',
      'PNG image hotspots',
      'Video compression',
      'Priority support',
      'Analytics dashboard'
    ]
  },
  ELITE: {
    name: 'Elite',
    price: 20,
    videoLimit: Infinity,
    features: [
      'Everything in Pro',
      'Create unlimited courses',
      'Enable paid enrollments',
      'Custom UPI payment QR codes',
      'Student enrollment management',
      'Base $20/month + $4 per enrollment',
      'Priority support'
    ]
  }
} as const;
