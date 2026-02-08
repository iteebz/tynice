default:
    @just --list

dev:
    @cd worker && pnpm dev

deploy:
    @cd worker && pnpm deploy

ci:
    @echo "static html - no ci checks"
