CREATE TABLE IF NOT EXISTS curation (
  key text PRIMARY KEY,
  hidden boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE curation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON curation USING (false);
