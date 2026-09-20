/*
  # Add trigger type to hotspots

  1. Changes
    - Add `trigger_type` column to `hotspots` table with values 'click' or 'automatic'
    - Default to 'click' for existing hotspots
  
  2. Notes
    - 'click' means the user must click the hotspot to trigger the action
    - 'automatic' means the action triggers automatically when the hotspot appears
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotspots' AND column_name = 'trigger_type'
  ) THEN
    ALTER TABLE hotspots ADD COLUMN trigger_type text NOT NULL DEFAULT 'click';
    
    ALTER TABLE hotspots ADD CONSTRAINT hotspots_trigger_type_check 
      CHECK (trigger_type IN ('click', 'automatic'));
  END IF;
END $$;