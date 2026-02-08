# Architecture

## Overview

Wedding video collection site. Guests upload videos → stored in R2 → displayed in feed.

## Stack

```
┌─────────────────────────────────────────┐
│  tynice.com (Fly.io)                    │
│  ┌───────────────────────────────────┐  │
│  │  Node.js Server (server.js)       │  │
│  │  - Presigned URL generation       │  │
│  │  - Stats tracking                 │  │
│  │  - Gallery API                    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  Cloudflare R2                          │
│  - Video/image storage                  │
│  - Presigned uploads (direct to R2)     │
│  - Optional public URL for playback     │
└─────────────────────────────────────────┘
```

## Routes

| Path | Method | Description |
|------|--------|-------------|
| `/` | GET | Upload page with gallery feed |
| `/upload` | GET | Alias for `/` |
| `/love` | GET | Thank you page with stats |
| `/presign` | GET | Generate presigned upload URL |
| `/stats` | GET | Upload statistics |
| `/gallery` | GET | List uploaded videos |
| `/sync-stats` | POST | Resync stats from R2 |

## Data Flow

```
1. Guest selects video
2. Frontend requests /presign with filename, type, size
3. Server generates presigned S3 URL, increments stats
4. Frontend uploads directly to R2 via presigned URL
5. Gallery fetches /gallery → lists R2 objects → signed URLs
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `R2_ENDPOINT` | Cloudflare R2 S3-compatible endpoint |
| `R2_ACCESS_KEY_ID` | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | R2 API secret |
| `R2_BUCKET` | Bucket name |
| `R2_PUBLIC_URL` | Optional: public bucket URL for faster playback |

## Files

```
tynice.com/
├── index.html      # Upload + gallery feed
├── love.html       # Thank you page
├── server.js       # Node.js server
├── package.json    # Dependencies
├── Dockerfile      # Container build
├── fly.toml        # Fly.io config
└── justfile        # Dev commands
```

## Persistence

Stats stored in `/data/stats.json` on Fly volume. Videos stored in R2.
