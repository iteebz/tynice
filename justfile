default:
    @just --list

install:
    @pnpm install

dev:
    @npx serve public

deploy:
    @wrangler pages deploy public/ --project-name tynice

ci:
    @pnpm install
    @pnpm exec biome check .
