default:
    @just --list

dev:
    @node server.js

deploy:
    @fly deploy

ci:
    @echo "static html - no ci checks"
