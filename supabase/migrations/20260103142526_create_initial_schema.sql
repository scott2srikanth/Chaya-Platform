/*
  # Interactive Video Platform - Initial Schema

  ## Overview
  Creates the foundational database schema for an interactive video learning platform
  with admin authoring tools and client viewing capabilities.

  ## New Tables

  ### `profiles`
  Extends Supabase auth.users with application-specific data:
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User email
  - `role` (text) - Either 'ADMIN' or 'USER'
  - `created_at` (timestamptz) - Account creation timestamp

  ### `videos`
  Stores video metadata and content:
  - `id` (uuid, primary key)
  - `title` (text) - Video title
  - `url` (text) - Video file URL
  - `thumbnail_url` (text, nullable) - Thumbnail image URL
  - `duration` (float) - Video duration in seconds
  - `transcript` (text, nullable) - Full video transcript
  - `status` (text) - 'DRAFT' or 'PUBLISHED'
  - `created_by` (uuid) - Admin who created the video
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `hotspots`
  Stores interactive hotspot overlays:
  - `id` (uuid, primary key)
  - `video_id` (uuid) - Parent video reference
  - `start_time` (float) - Start time in seconds
  - `end_time` (float) - End time in seconds
  - `x` (float) - Horizontal position (0-1 relative scale)
  - `y` (float) - Vertical position (0-1 relative scale)
  - `width` (float) - Width (0-1 relative scale)
  - `height` (float) - Height (0-1 relative scale)
  - `action` (jsonb) - Action configuration (type, content, url, etc.)
  - `created_at` (timestamptz) - Creation timestamp

  ## Security

  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Admins have full access to all data
  - Users can view published videos and their hotspots
  - Users can view their own profile

  ### Policies
  1. **profiles table**
     - Users can read their own profile
     - Admins can read all profiles
     - Only authenticated users can insert/update their profile

  2. **videos table**
     - Admins can create, read, update, delete all videos
     - Users can read published videos only

  3. **hotspots table**
     - Admins can create, read, update, delete all hotspots
     - Users can read hotspots for published videos only

  ## Important Notes
  - Uses Supabase auth.users for authentication
  - Role-based access control enforced at database level
  - All timestamps use timestamptz for timezone support
  - Hotspot positions use 0-1 relative scale for responsive design
  - Action data stored as JSONB for flexibility
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  thumbnail_url text,
  duration float NOT NULL DEFAULT 0,
  transcript text,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Create hotspots table
CREATE TABLE IF NOT EXISTS hotspots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  start_time float NOT NULL,
  end_time float NOT NULL,
  x float NOT NULL CHECK (x >= 0 AND x <= 1),
  y float NOT NULL CHECK (y >= 0 AND y <= 1),
  width float NOT NULL CHECK (width >= 0 AND width <= 1),
  height float NOT NULL CHECK (height >= 0 AND height <= 1),
  action jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotspots ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Videos policies
CREATE POLICY "Admins can create videos"
  ON videos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can read all videos"
  ON videos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Users can read published videos"
  ON videos FOR SELECT
  TO authenticated
  USING (status = 'PUBLISHED');

CREATE POLICY "Admins can update videos"
  ON videos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete videos"
  ON videos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Hotspots policies
CREATE POLICY "Admins can create hotspots"
  ON hotspots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can read all hotspots"
  ON hotspots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Users can read hotspots for published videos"
  ON hotspots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = hotspots.video_id
      AND videos.status = 'PUBLISHED'
    )
  );

CREATE POLICY "Admins can update hotspots"
  ON hotspots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete hotspots"
  ON hotspots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created_by ON videos(created_by);
CREATE INDEX IF NOT EXISTS idx_hotspots_video_id ON hotspots(video_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Create updated_at trigger for videos
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();