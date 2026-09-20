/*
  # Add Subscriptions and Payments System

  1. Schema Changes
    - Update `profiles` table to support SUPER_ADMIN role
    - Create `subscriptions` table for managing user subscription plans
    - Create `payments` table for transaction tracking

  2. Subscriptions Table
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to profiles)
    - `plan` (text: FREE, PRO)
    - `status` (text: ACTIVE, CANCELED, PAST_DUE)
    - `stripe_subscription_id` (text, nullable)
    - `stripe_customer_id` (text, nullable)
    - `current_period_end` (timestamptz, nullable)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  3. Payments Table
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to profiles)
    - `amount` (integer, amount in cents)
    - `currency` (text, default 'usd')
    - `status` (text: SUCCESS, FAILED, PENDING)
    - `provider` (text, e.g., 'stripe', 'gpay', 'ccavenue')
    - `provider_reference` (text)
    - `stripe_payment_intent_id` (text, nullable)
    - `metadata` (jsonb, nullable)
    - `created_at` (timestamptz)

  4. Security
    - Enable RLS on all new tables
    - Users can read their own subscription and payment data
    - SUPER_ADMIN can read all subscriptions and payments
    - Only system (service role) can insert/update subscriptions and payments
*/

-- Update profiles table CHECK constraint to include SUPER_ADMIN
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('ADMIN', 'USER', 'SUPER_ADMIN'));

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PRO')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELED', 'PAST_DUE')),
  stripe_subscription_id text,
  stripe_customer_id text,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
  provider text NOT NULL,
  provider_reference text NOT NULL,
  stripe_payment_intent_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Payments policies
CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Function to automatically create subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'FREE', 'ACTIVE');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscription for new profiles
DROP TRIGGER IF EXISTS create_subscription_on_profile_creation ON profiles;
CREATE TRIGGER create_subscription_on_profile_creation
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- Trigger to update updated_at on subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();