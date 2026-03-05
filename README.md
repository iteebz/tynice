# tynice.com

Wedding media site. Guests upload photos/videos → R2 → gallery with lightbox.

## Architecture

```
tynice.com (Fly.io)
├── server.js          Node.js — presign URLs, gallery API, auth
├── index.html         Upload + gallery + notes (single page)
├── public/
│   ├── login.html     Password gate ("name the venue")
│   ├── admin.html     Media/note curation
│   └── db.js          Supabase client (guest notes)
└── lib/r2.js          R2 client (list, presign, delete)

Storage: Cloudflare R2 (direct upload via presigned PUT)
Notes:   Supabase (single `notes` table)
```

## Routes

| Path | Method | Description |
|------|--------|-------------|
| `/` | GET | Upload + gallery page |
| `/login` | GET/POST | Site password gate |
| `/presign` | GET | Generate presigned upload URL |
| `/gallery` | GET | List uploaded media |
| `/admin` | GET | Admin curation (requires `ADMIN_PASSWORD`) |
| `/admin/login` | GET/POST | Admin auth |
| `/admin/delete` | DELETE | Delete media from R2 |
| `/admin/notes` | GET/DELETE | Manage guest notes |

## Setup

```bash
# R2
npx wrangler r2 bucket create tynice-videos
# Get API credentials: Cloudflare → R2 → Manage R2 API Tokens

# Fly
fly apps create tynice
fly secrets set \
  R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com \
  R2_ACCESS_KEY_ID=<key> \
  R2_SECRET_ACCESS_KEY=<secret> \
  R2_BUCKET=tynice-videos \
  SITE_PASSWORD=merribee \
  ADMIN_PASSWORD=<password>
fly deploy

# DNS
# A    @  →  66.241.124.235
# AAAA @  →  2a09:8280:1::d1:1dca:0
```

## Development

```bash
npm install
npm start   # :3000, needs .env with R2 creds
```

## Outreach Message

> Hey! As you might know, our wedding videographer lost all the footage 😅
>
> We've set up a little site to collect whatever photos and videos you took on the day — anything you have would mean the world to us.
>
> tynice.com
>
> It'll ask you to name the venue to get in (not case sensitive).
>
> You can upload straight from your camera roll — just tap and pick. Thanks so much ❤️
>
> — Tyson & Janice
