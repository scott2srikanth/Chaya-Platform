/*
  # Create Storage Buckets for Video Files

  1. Storage Configuration
    - Create `videos` bucket for video file uploads
    - Set bucket to public for easy video playback
    - Configure file size limits (200MB max)

  2. Security
    - Only authenticated admins can upload
    - Public read access for video playback
    - Validate file types (mp4, mov, webm)
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  209715200,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'ADMIN' OR profiles.role = 'SUPER_ADMIN')
  )
);

CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos');

CREATE POLICY "Admins can delete their videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'ADMIN' OR profiles.role = 'SUPER_ADMIN')
  )
);
