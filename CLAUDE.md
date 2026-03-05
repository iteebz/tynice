# tynice.com

Wedding media site for Tyson & Janice. Guests upload photos/videos from the wedding day.

## What This Is

Our videographer lost the footage. This site collects whatever our guests captured. It's live at tynice.com — real people use it, so don't break things.

## Stack

- **Frontend**: Single `index.html` with inline CSS/JS. Vanilla, no framework.
- **Server**: `server.js` — plain Node.js HTTP server. No Express, no dependencies beyond `@aws-sdk/client-s3`.
- **Storage**: Cloudflare R2 (S3-compatible). Uploads go direct via presigned URLs.
- **Notes**: Supabase (guest messages). Client config in `public/db.js`.
- **Hosting**: Fly.io. Deploy with `fly deploy`.

## Development

```bash
npm install
npm start        # runs on :3000
```

Needs `.env` with R2 credentials to work locally. Ask Tyson if you don't have it.

## Design Direction

- Warm, elegant, editorial. Think linen textures, not tech startup.
- Fonts: Cormorant Garamond (headings), Crimson Pro (body).
- Palette: cream, sand, walnut, espresso. See CSS variables at top of `index.html`.
- Zero border-radius. Sharp edges everywhere. This is intentional.
- Mobile-first — most guests will upload from their phones.

## Rules

- Don't touch `server.js` or `lib/r2.js` unless fixing a bug. The backend is done.
- Don't add frameworks, build tools, or npm dependencies for the frontend.
- Don't change the upload flow — it works and people are using it.
- All styling lives inline in `index.html` and `public/login.html`. Keep it that way.
- Test on mobile viewport before calling anything done.
- Keep it simple. This site has a finite lifespan.

## What Could Use Love

- Mobile upload experience — is the tap target obvious enough? Progress clear?
- Gallery layout on different screen sizes
- The "leave a note" section styling
- Login page (`public/login.html`) — currently minimal
- Overall polish, spacing, typography refinement
- Lightbox experience on mobile

## Git

```bash
# Commit format
git commit -m "style(gallery): tighten card spacing on mobile"

# Types: style, fix, feat, chore
# Keep commits atomic — one visual change per commit
```
