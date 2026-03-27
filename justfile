default:
    @just --list

install:
    @pnpm install

dev:
    @npx serve public

deploy:
    @CLOUDFLARE_ACCOUNT_ID=5b1295e874631bb6d428fc7a75806e6e wrangler pages deploy public/ --project-name tynice --commit-dirty=true

ci:
    @pnpm install
    @pnpm exec biome check .
