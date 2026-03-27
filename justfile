default:
    @just --list

install:
    @pnpm install

dev:
    @npx serve public

ci:
    @pnpm install
    @pnpm exec biome check .
