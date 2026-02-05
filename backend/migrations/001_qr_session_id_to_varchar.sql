-- Migration: Change qr_sessions.id from UUID to VARCHAR(64)
-- Reason: Allow cryptographically strong session IDs using secrets.token_urlsafe(32)
-- Run this in Supabase SQL Editor

-- Step 1: Drop foreign key constraint on attendance_records
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_qr_session_id_fkey;

-- Step 2: Change qr_sessions.id column type
-- First, drop the default since VARCHAR doesn't use gen_random_uuid()
ALTER TABLE qr_sessions ALTER COLUMN id DROP DEFAULT;

-- Change the column type (this works if table is empty or you need to cast existing data)
ALTER TABLE qr_sessions ALTER COLUMN id TYPE VARCHAR(64);

-- Step 3: Change attendance_records.qr_session_id column type
ALTER TABLE attendance_records ALTER COLUMN qr_session_id TYPE VARCHAR(64);

-- Step 4: Re-add foreign key constraint
ALTER TABLE attendance_records 
ADD CONSTRAINT attendance_records_qr_session_id_fkey 
FOREIGN KEY (qr_session_id) REFERENCES qr_sessions(id);

-- Verify changes
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name IN ('qr_sessions', 'attendance_records') 
AND column_name IN ('id', 'qr_session_id');
