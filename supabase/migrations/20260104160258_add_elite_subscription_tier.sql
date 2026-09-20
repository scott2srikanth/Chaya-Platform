/*
  # Add Elite Subscription Tier

  1. Modifications
    - Add enrollment tracking to subscriptions table
    - Update subscription logic to support Elite tier
    - Elite tier: $20/month base + $4/month per enrollment

  2. Notes
    - Elite tier enables course creation, paid courses, and user enrollment
    - Enrollment count tracked for billing purposes
*/

-- Add enrollment_count to subscriptions table for Elite tier billing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'enrollment_count'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN enrollment_count int DEFAULT 0;
  END IF;
END $$;

-- Function to count active enrollments for a teacher
CREATE OR REPLACE FUNCTION count_teacher_enrollments(teacher_uuid uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE c.teacher_id = teacher_uuid
    AND e.status = 'ACTIVE'
  );
END;
$$;

-- Function to update enrollment count for Elite subscribers
CREATE OR REPLACE FUNCTION update_enrollment_count()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE subscriptions
  SET enrollment_count = count_teacher_enrollments(user_id)
  WHERE plan = 'ELITE' AND status = 'ACTIVE';
END;
$$;
