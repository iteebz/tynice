const SUPABASE_URL = 'https://ngrmxehoudbgrjsvdxbv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncm14ZWhvdWRiZ3Jqc3ZkeGJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTQ2MzYsImV4cCI6MjA4NjkzMDYzNn0.cLbx6BNRWi04Nuu2c97ut4A2vfyEPy6fEUq_5k734D0';

export async function dbFetch(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || '',
      ...opts.headers,
    },
  });
}
