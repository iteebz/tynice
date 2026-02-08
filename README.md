# tynice.com

Wedding video collection site.

## Setup

### 1. Cloudflare R2

```bash
# Create bucket
npx wrangler r2 bucket create tynice-videos

# Get API credentials from Cloudflare dashboard
# R2 → Manage R2 API Tokens → Create API Token
```

### 2. Fly.io

```bash
# Create app
fly apps create tynice

# Create volume for stats persistence
fly volumes create tynice_data --size 1 --region sjc

# Set secrets
fly secrets set \
  R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com \
  R2_ACCESS_KEY_ID=<access_key> \
  R2_SECRET_ACCESS_KEY=<secret_key> \
  R2_BUCKET=tynice-videos

# Deploy
fly deploy

# Add custom domain
fly certs create tynice.com
```

### 3. DNS

```
A    @  →  66.241.124.235
AAAA @  →  2a09:8280:1::d1:1dca:0
```

## Development

```bash
# Install deps
npm install

# Run locally (needs R2 credentials in env)
npm start
```

## Commands

```bash
just dev      # Run worker locally
just deploy   # Deploy to Fly
```
