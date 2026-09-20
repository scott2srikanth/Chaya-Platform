/*
  # Add image URL field to hotspots

  1. Changes
    - Add `image_url` column to `hotspots` table to support transparent PNG image overlays
    - This allows hotspots to display custom images instead of just colored borders
    - Images will be shown during the hotspot's active time period

  2. Notes
    - The field is optional (nullable) so existing hotspots continue to work
    - When set, the image will be displayed instead of the default border style
    - Supports transparent PNG images for overlay effects
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotspots' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE hotspots ADD COLUMN image_url text;
  END IF;
END $$;
