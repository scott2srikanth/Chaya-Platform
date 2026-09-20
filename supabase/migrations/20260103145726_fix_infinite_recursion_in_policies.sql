/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  The profiles table policies were causing infinite recursion because they queried
  the profiles table itself to check admin status, creating a circular dependency.

  ## Solution
  1. Create a security definer function to check user role without triggering RLS
  2. Drop and recreate all policies using the new function
  3. Simplify policy logic to avoid circular dependencies

  ## Changes
  - Add `is_admin()` helper function that bypasses RLS
  - Update all policies to use the helper function
  - Ensure policies are more efficient and don't cause recursion

  ## Security
  - All tables maintain RLS protection
  - Admin checks are performed via secure function
  - No security vulnerabilities introduced
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can create videos" ON videos;
DROP POLICY IF EXISTS "Admins can read all videos" ON videos;
DROP POLICY IF EXISTS "Admins can update videos" ON videos;
DROP POLICY IF EXISTS "Admins can delete videos" ON videos;
DROP POLICY IF EXISTS "Admins can create hotspots" ON hotspots;
DROP POLICY IF EXISTS "Admins can read all hotspots" ON hotspots;
DROP POLICY IF EXISTS "Admins can update hotspots" ON hotspots;
DROP POLICY IF EXISTS "Admins can delete hotspots" ON hotspots;

-- Create helper function to check if current user is admin
-- This function uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate profiles policies
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());

-- Recreate videos policies  
CREATE POLICY "Admins can create videos"
  ON videos FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can read all videos"
  ON videos FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update videos"
  ON videos FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete videos"
  ON videos FOR DELETE
  TO authenticated
  USING (is_admin());

-- Recreate hotspots policies
CREATE POLICY "Admins can create hotspots"
  ON hotspots FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can read all hotspots"
  ON hotspots FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update hotspots"
  ON hotspots FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete hotspots"
  ON hotspots FOR DELETE
  TO authenticated
  USING (is_admin());