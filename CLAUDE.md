# tynice.com

Static wedding memory site. Everything lives in `public/index.html` — inline CSS and JS, no framework, no build step.

## Stack

- **Hosting**: Cloudflare Pages. Deploy root is `public/`
- **Videos**: Cloudflare R2. Public base: `https://pub-1626a2fd71ac4f9c9ee945339681bd31.r2.dev`
- **Fonts**: Medusa (headings, Adobe Typekit `byo4nzt`), Crimson Pro (body, Google Fonts)
- **Palette**: cream `#faf8f5`, black. No border-radius anywhere.

## Gate

Shows on every load. Answer: `merribee`. No cookie — intentional.

## Deploy

```bash
just deploy   # wrangler pages deploy public/
```

Auto-deploys on push to `main` via GitHub Actions — needs `CLOUDFLARE_API_TOKEN` secret.

## Videos on R2

| File | Label |
|------|-------|
| `videos/tynice-super8.mp4` | super 8 |
| `videos/tynice-trailer.mp4` | trailer |
| `videos/tynice-tea-ceremony.mp4` | tea ceremony |

Upload:
```bash
AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
aws s3 cp <file> s3://tynice/<file> \
--endpoint-url https://80cc805d16aa1dd81cc6f459124b0c51.r2.cloudflarestorage.com
```
