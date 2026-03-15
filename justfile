default:
    @just --list

install:
    @pnpm install
    @just hooks

hooks:
    @git config core.hooksPath .githooks

build:
    @rm -rf dist
    @mkdir -p dist
    @cp index.html dist/
    @cp -r public/* dist/

dev:
    @just build
    @npx wrangler pages dev dist --compatibility-date 2024-12-01

deploy:
    @just build
    @npx wrangler pages deploy dist --project-name tynice

ci:
    @pnpm install
    @pnpm exec biome check .
