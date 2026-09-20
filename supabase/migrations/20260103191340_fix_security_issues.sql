/*
  # Fix Security and Performance Issues

  ## Overview
  Addresses multiple security warnings and performance optimizations identified by Supabase:
  
  ## Changes Made

  ### 1. RLS Performance Optimization
  - Replace `auth.uid()` with `(select auth.uid())` in profiles policies
  - Prevents re-evaluation of auth function for each row
  - Significantly improves query performance at scale

  ### 2. Remove Unused Indexes
  - Drop `idx_videos_created_by` - not used by any queries
  - Drop `idx_profiles_role` - not used by any queries
  - Reduces storage overhead and write performance impact

  ### 3. Consolidate Multiple Permissive Policies
  - Merge multiple SELECT policies into single policies with OR conditions
  - Applies to: profiles, videos, and hotspots tables
  - Simplifies policy evaluation and improves performance

  ### 4. Fix Function Search Path Mutability
  - Set explicit search_path for `update_updated_at_column()` function
  - Set explicit search_path for `is_admin()` function
  - Prevents potential security vulnerabilities from search_path manipulation

  ## Security Notes
  - All RLS protections remain in place
  - No changes to access control logic
  - Only performance and security hardening improvements
  
  ## Notes
  The following issues require Supabase Dashboard configuration:
  - Auth DB Connection Strategy: Switch to percentage-based allocation
  - Leaked Password Protection: Enable HaveIBeenPwned.org integration
*/

-- ============================================================================
-- 1. Fix RLS Performance Issues (auth.uid() optimization)
-- ============================================================================

-- Drop existing policies on profiles that need optimization
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- 2. Remove Unused Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_videos_created_by;
DROP INDEX IF EXISTS idx_profiles_role;

-- ============================================================================
-- 3. Consolidate Multiple Permissive Policies
-- ============================================================================

-- Profiles: Merge "Users can read own profile" and "Admins can read all profiles"
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

CREATE POLICY "Users can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = id  -- User's own profile
    OR is_admin()              -- Or user is admin
  );

-- Videos: Merge "Users can read published videos" and "Admins can read all videos"
DROP POLICY IF EXISTS "Users can read published videos" ON videos;
DROP POLICY IF EXISTS "Admins can read all videos" ON videos;

CREATE POLICY "Users can read videos"
  ON videos FOR SELECT
  TO authenticated
  USING (
    status = 'PUBLISHED'  -- Published videos
    OR is_admin()         -- Or user is admin
  );

-- Hotspots: Merge "Users can read hotspots for published videos" and "Admins can read all hotspots"
DROP POLICY IF EXISTS "Users can read hotspots for published videos" ON hotspots;
DROP POLICY IF EXISTS "Admins can read all hotspots" ON hotspots;

CREATE POLICY "Users can read hotspots"
  ON hotspots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = hotspots.video_id
      AND videos.status = 'PUBLISHED'
    )  -- Hotspots for published videos
    OR is_admin()  -- Or user is admin
  );

-- ============================================================================
-- 4. Fix Function Search Path Mutability
-- ============================================================================

-- Recreate update_updated_at_column with explicit search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = public, pg_catalog;

-- Recreate is_admin with explicit search_path
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   SET search_path = public, pg_catalog;