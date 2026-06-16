-- 1. Create documents storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security on storage.objects (if not already enabled)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access to Documents" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert to Documents" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete to Documents" ON storage.objects;

-- Create policies for documents storage bucket
CREATE POLICY "Public Access to Documents"
ON storage.objects FOR SELECT
USING ( bucket_id = 'documents' );

CREATE POLICY "Public Insert to Documents"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'documents' );

CREATE POLICY "Public Delete to Documents"
ON storage.objects FOR DELETE
USING ( bucket_id = 'documents' );

-- 3. Add agenda column to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS agenda jsonb DEFAULT '[]'::jsonb;

-- 4. Add meeting_id column to tasks table and link to meetings table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE;
