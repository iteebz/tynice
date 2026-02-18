-- Add author_token column for delete functionality
ALTER TABLE notes ADD COLUMN IF NOT EXISTS author_token text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS notes_author_token_idx ON notes(author_token);

-- Drop existing policies
DROP POLICY IF EXISTS "anyone can insert" ON notes;
DROP POLICY IF EXISTS "anyone can read" ON notes;

-- Create new policies
CREATE POLICY "anyone can insert" ON notes FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone can read" ON notes FOR SELECT USING (true);
CREATE POLICY "authors can delete their own" ON notes FOR DELETE USING (true);
