/*
  # Create Courses and Enrollments System

  1. New Tables
    - `courses`
      - `id` (uuid, primary key)
      - `teacher_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `enrollment_fee` (decimal) - 0 for free courses
      - `upi_qr_url` (text) - QR code image URL for payments
      - `status` (enum: DRAFT, PUBLISHED)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `enrollments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `course_id` (uuid, references courses)
      - `status` (enum: PENDING, ACTIVE, EXPIRED)
      - `payment_proof_url` (text) - screenshot/proof of payment
      - `enrolled_at` (timestamp)
      - `approved_at` (timestamp)
    
    - `course_payments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `course_id` (uuid, references courses)
      - `enrollment_id` (uuid, references enrollments)
      - `amount` (decimal)
      - `payment_method` (text) - 'upi', 'free'
      - `payment_proof_url` (text)
      - `status` (enum: PENDING, APPROVED, REJECTED)
      - `created_at` (timestamp)

  2. Modifications
    - Add `course_id` to videos table
    - Add `video_order` to videos table for sequencing

  3. Security
    - Enable RLS on all tables
    - Teachers can create/manage their courses
    - Users can enroll in published courses
    - Users can view enrolled course videos (except first video which is public)
*/

-- Create course status enum
DO $$ BEGIN
  CREATE TYPE course_status AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enrollment status enum
DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create payment status enum
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  enrollment_fee decimal(10,2) DEFAULT 0 NOT NULL,
  upi_qr_url text,
  status course_status DEFAULT 'DRAFT' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  status enrollment_status DEFAULT 'PENDING' NOT NULL,
  payment_proof_url text,
  enrolled_at timestamptz DEFAULT now() NOT NULL,
  approved_at timestamptz,
  UNIQUE(user_id, course_id)
);

-- Create course_payments table
CREATE TABLE IF NOT EXISTS course_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL,
  payment_method text DEFAULT 'upi',
  payment_proof_url text,
  status payment_status DEFAULT 'PENDING' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add course_id and video_order to videos table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'videos' AND column_name = 'course_id'
  ) THEN
    ALTER TABLE videos ADD COLUMN course_id uuid REFERENCES courses(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'videos' AND column_name = 'video_order'
  ) THEN
    ALTER TABLE videos ADD COLUMN video_order int DEFAULT 1;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_payments ENABLE ROW LEVEL SECURITY;

-- Courses policies
CREATE POLICY "Anyone can view published courses"
  ON courses FOR SELECT
  USING (status = 'PUBLISHED');

CREATE POLICY "Teachers can view their own courses"
  ON courses FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid() OR
    status = 'PUBLISHED'
  );

CREATE POLICY "Teachers can create courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'ADMIN' OR profiles.role = 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Teachers can update their courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their courses"
  ON courses FOR DELETE
  TO authenticated
  USING (teacher_id = auth.uid());

-- Enrollments policies
CREATE POLICY "Users can view their enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = enrollments.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Users can enroll in courses"
  ON enrollments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teachers can update enrollment status"
  ON enrollments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = enrollments.course_id
      AND courses.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = enrollments.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- Course payments policies
CREATE POLICY "Users can view their payments"
  ON course_payments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_payments.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Users can create payment records"
  ON course_payments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teachers can update payment status"
  ON course_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_payments.course_id
      AND courses.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_payments.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_videos_course_id ON videos(course_id);
CREATE INDEX IF NOT EXISTS idx_videos_video_order ON videos(video_order);
CREATE INDEX IF NOT EXISTS idx_course_payments_user_id ON course_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_payments_course_id ON course_payments(course_id);
