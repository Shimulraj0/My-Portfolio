# Shimul Raj Das — Portfolio

Personal portfolio built with **Vite + React + Tailwind CSS v4 + Framer Motion**. Shows Flutter apps with live screenshots captured from a running Android emulator.

## Local development

```bash
npm install
npm run dev
```

## Build & preview

```bash
npm run build
npm run preview
```

## Lint

```bash
npm run lint
```

## Run with Docker

```bash
docker compose up --build
# open http://localhost:8080
```

Or build and run manually:

```bash
docker build -t shimulraj0/portfolio .
docker run -p 8080:80 shimulraj0/portfolio
```

The container serves the production build via Nginx with gzip and static-asset caching enabled.

## Deploy to GitHub Pages

```powershell
.\deploy.ps1
```

Builds the site and pushes `dist/` to the `Shimulraj0.github.io` repository.
