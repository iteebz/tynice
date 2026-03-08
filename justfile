default:
    @just --list

install:
    @pnpm install
    @just hooks

hooks:
    @git config core.hooksPath .githooks

dev:
    @node server.js

deploy:
    @fly deploy

ci:
    @pnpm install
    @pnpm exec eslint .
