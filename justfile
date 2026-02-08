default:
    @just --list

install:
    @pnpm install

dev:
    @node server.js

deploy:
    @fly deploy

ci:
    @pnpm lint:fix
    @pnpm typecheck
