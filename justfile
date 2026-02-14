default:
    @just --list

install:
    @pnpm install

dev:
    @node server.js

deploy:
    @fly deploy

ci:
    @pnpm install
    @pnpm exec eslint .
