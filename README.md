# tynice.com

Wedding media site. Guests upload photos/videos → gallery with lightbox.

## Architecture

```
tynice.com (Cloudflare Pages)
├── functions/         Pages Functions (API routes)
│   ├── _middleware.js Site password gate
│   ├── presign.js     Upload URL (Stream for video, R2 for images)
│   ├── gallery.js     Merged gallery (Stream + R2)
│   ├── login.js       Password auth
│   └── admin/         Admin panel routes
├── index.html         Upload + gallery + notes (single page)
├── public/            Static assets (copied to dist/ on build)
│   ├── login.html     Password gate ("name the venue")
│   ├── admin.html     Media/note curation
│   └── db.js          Supabase client (guest notes)
└── lib/
    ├── r2.js          R2 client (images, video fallback)
    └── stream.js      Cloudflare Stream client (video)

Images:  Cloudflare R2 (direct upload via presigned PUT)
Videos:  Cloudflare Stream if enabled, R2 fallback
Notes:   Supabase (single `notes` table)
```

## Routes

| Path | Method | Description |
|------|--------|-------------|
| `/` | GET | Upload + gallery page |
| `/login` | GET/POST | Site password gate |
| `/presign` | GET | Generate upload URL (Stream or R2) |
| `/gallery` | GET | List uploaded media |
| `/admin` | GET | Admin curation (requires `ADMIN_PASSWORD`) |
| `/admin/login` | GET/POST | Admin auth |
| `/admin/delete` | DELETE | Delete media |
| `/admin/notes` | GET/DELETE | Manage guest notes |

## Setup

```bash
pnpm install
just build
just deploy
```

### Secrets (set via `npx wrangler pages secret put`)

Required:
- `R2_ENDPOINT` — R2 S3 API endpoint
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` — R2 credentials
- `R2_BUCKET` — R2 bucket name
- `R2_PUBLIC_URL` — R2 public bucket URL
- `SITE_PASSWORD` — guest access password
- `ADMIN_PASSWORD` — admin panel password
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — for guest notes

Optional:
- `CLOUDFLARE_API_TOKEN` — enables Cloudflare Stream for video uploads
  (requires Stream subscription: CF dashboard → Stream → $5/mo)
  Without this, videos upload to R2 directly (works but no transcoding/thumbnails)
- `SUPABASE_SERVICE_ROLE_KEY` — elevated access for admin note deletion

## Development

```bash
just dev   # wrangler pages dev on :8788, reads .env
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
