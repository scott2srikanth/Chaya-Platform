import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.warn('Supabase environment variables are missing');
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: 'ADMIN' | 'USER' | 'SUPER_ADMIN';
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: 'ADMIN' | 'USER' | 'SUPER_ADMIN';
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'ADMIN' | 'USER' | 'SUPER_ADMIN';
          created_at?: string;
        };
      };
      videos: {
        Row: {
          id: string;
          title: string;
          url: string;
          thumbnail_url: string | null;
          duration: number;
          transcript: string | null;
          status: 'DRAFT' | 'PUBLISHED';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          url: string;
          thumbnail_url?: string | null;
          duration?: number;
          transcript?: string | null;
          status?: 'DRAFT' | 'PUBLISHED';
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          url?: string;
          thumbnail_url?: string | null;
          duration?: number;
          transcript?: string | null;
          status?: 'DRAFT' | 'PUBLISHED';
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      hotspots: {
        Row: {
          id: string;
          video_id: string;
          start_time: number;
          end_time: number;
          x: number;
          y: number;
          width: number;
          height: number;
          action: HotspotAction;
          trigger_type: 'click' | 'automatic';
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          start_time: number;
          end_time: number;
          x: number;
          y: number;
          width: number;
          height: number;
          action: HotspotAction;
          trigger_type?: 'click' | 'automatic';
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          start_time?: number;
          end_time?: number;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          action?: HotspotAction;
          trigger_type?: 'click' | 'automatic';
          image_url?: string | null;
          created_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: 'FREE' | 'PRO' | 'ELITE';
          status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE';
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          current_period_end: string | null;
          enrollment_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan?: 'FREE' | 'PRO' | 'ELITE';
          status?: 'ACTIVE' | 'CANCELED' | 'PAST_DUE';
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          current_period_end?: string | null;
          enrollment_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan?: 'FREE' | 'PRO' | 'ELITE';
          status?: 'ACTIVE' | 'CANCELED' | 'PAST_DUE';
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          current_period_end?: string | null;
          enrollment_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          currency: string;
          status: 'SUCCESS' | 'FAILED' | 'PENDING';
          provider: string;
          provider_reference: string;
          stripe_payment_intent_id: string | null;
          metadata: Record<string, any> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          currency?: string;
          status?: 'SUCCESS' | 'FAILED' | 'PENDING';
          provider: string;
          provider_reference: string;
          stripe_payment_intent_id?: string | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          status?: 'SUCCESS' | 'FAILED' | 'PENDING';
          provider?: string;
          provider_reference?: string;
          stripe_payment_intent_id?: string | null;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
      };
    };
  };
};

export type HotspotAction =
  | { type: 'popup'; content: string; title?: string }
  | { type: 'jump'; timestamp: number }
  | { type: 'url'; url: string }
  | { type: 'pause' };

export type Video = Database['public']['Tables']['videos']['Row'];
export type Hotspot = Database['public']['Tables']['hotspots']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
