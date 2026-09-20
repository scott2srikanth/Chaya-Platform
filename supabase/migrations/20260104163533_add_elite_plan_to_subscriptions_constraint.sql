/*
  # Update Subscriptions Table for Elite Plan

  1. Modifications
    - Drop existing plan check constraint
    - Add new plan check constraint including ELITE
    - Update plan type to include ELITE option

  2. Notes
    - Allows Elite subscription tier in the subscriptions table
*/

-- Drop the existing check constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

-- Add new check constraint with ELITE included
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check 
  CHECK (plan IN ('FREE', 'PRO', 'ELITE'));
