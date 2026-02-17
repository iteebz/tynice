CREATE TABLE IF NOT EXISTS notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert" ON notes FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone can read" ON notes FOR SELECT USING (true);
