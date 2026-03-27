# tynice.com

Wedding memories site for Tyson & Janice. Guests can watch wedding videos and browse photos.

## Stack

- **Frontend**: Single `public/index.html` — inline CSS, no JS, no framework
- **Videos**: Cloudflare R2 (`tynice` bucket on Tyson's account). Public base URL: `https://pub-1626a2fd71ac4f9c9ee945339681bd31.r2.dev`
- **Hosting**: Cloudflare Pages. Deploy root is `public/`

## Deploy

```bash
wrangler pages deploy public/ --project-name tynice
```

`media/videos/` is excluded via `.cfignore` — videos live on R2, not in the deploy.

## Development

```bash
just dev   # serves public/ on localhost
just ci    # biome check
```

## Design

- Fonts: Medusa (headings, via Adobe Typekit `byo4nzt`), Crimson Pro (body, via Google Fonts)
- Palette: cream (`#faf8f5`), sand (`#d8d8d8`), black. No border-radius anywhere.
- Noise texture overlay via inline SVG data URI on `body::before`

## Videos on R2

| File | Label |
|------|-------|
| `tynice-super8.mov` | super 8 |
| `tynice-trailer.mov` | trailer |
| `tynice-tea-ceremony.mov` | tea ceremony |

Upload with:
```bash
AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
aws s3 cp <file> s3://tynice/<file> \
--endpoint-url https://80cc805d16aa1dd81cc6f459124b0c51.r2.cloudflarestorage.com
```
