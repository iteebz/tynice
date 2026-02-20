# Architecture

## Overview

Wedding media collection site. Guests upload photos/videos → stored in Cloudflare R2 → displayed in gallery with lightbox.

## Stack

```
┌─────────────────────────────────────────┐
│  tynice.com (Fly.io)                    │
│  ┌───────────────────────────────────┐  │
│  │  Node.js Server (server.js)       │  │
│  │  - Presigned URL generation       │  │
│  │  - Gallery API                    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  Cloudflare R2                          │
│  - Photo/video storage                  │
│  - Presigned uploads (direct to R2)     │
│  - Public URL for playback              │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  Supabase                               │
│  - Guest notes (name, message)          │
│  - Author token for self-delete         │
└─────────────────────────────────────────┘
```

## Routes

| Path | Method | Description |
|------|--------|-------------|
| `/` | GET | Upload + gallery page |
| `/login` | GET/POST | Password auth |
| `/presign` | GET | Generate presigned upload URL |
| `/gallery` | GET | List uploaded media |
| `/stats` | GET | Upload count |
| `/folder-link` | GET | R2 public URL |
| `/admin` | GET | Admin curation page (requires `ADMIN_PASSWORD`) |
| `/admin/login` | GET/POST | Admin auth |
| `/admin/logout` | POST | Clear admin session |
| `/admin/delete` | DELETE | Delete media from R2 (admin only) |

## Data Flow

```
1. Guest selects files (drag/drop or tap)
2. Frontend requests /presign per file
3. Server generates presigned S3 PUT URL
4. Frontend uploads directly to R2 via XHR (with progress)
5. Gallery fetches /gallery → lists R2 objects → public URLs
6. Card click opens lightbox (image) or plays video inline
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `R2_ENDPOINT` | Cloudflare R2 S3-compatible endpoint |
| `R2_ACCESS_KEY_ID` | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | R2 API secret |
| `R2_BUCKET` | Bucket name |
| `R2_PUBLIC_URL` | Public bucket URL for playback |
| `SITE_PASSWORD` | Optional: gate site behind password |
| `ADMIN_PASSWORD` | Required for `/admin` access |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |

## Files

```
tynice/
├── index.html          # Upload + gallery + notes
├── server.js           # Node.js server
├── lib/r2.js           # R2 client (list, presign)
├── public/
│   ├── login.html      # Password gate page
│   ├── login.css       # Login styles
│   └── db.js           # Supabase client
├── supabase/
│   └── migrations/     # DB schema
├── package.json
├── Dockerfile
├── fly.toml
└── justfile
```
