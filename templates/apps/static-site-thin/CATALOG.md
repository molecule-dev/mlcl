# Static Site / Markdown Blog (plain Node build)

- **slug**: `static-site-thin`
- **cluster**: content-social
- **type**: static
- **layout**: content

A static site of markdown posts built by one Node script — pages are HTML string templates, no framework, no hydration: paginated index, post pages, tag pages, RSS + Atom feeds, sitemap, llms.txt, raw markdown per post, drafts, and per-post AI provenance from agent transcripts. `npm run build` writes dist/ for any static host

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`markdown`, `front-matter`, `static-html`, `pagination`, `tags`, `rss`, `atom`, `sitemap`, `llms-txt`, `drafts`, `provenance`, `seo`

## Screens (6)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Home** `/` → `app/src/pages.ts`
- **Post** `/:slug/` → `app/src/pages.ts`
- **Tags** `/tags/` → `app/src/pages.ts`
- **Tag** `/tags/:tag/` → `app/src/pages.ts`
- **About** `/about/` → `app/src/pages.ts`
- **NotFound** `*` → `app/src/pages.ts`

## Integrations (9 @molecule/* packages)

_This app has no server. The Build-time (static generation) packages run inside `npm run build`, which prerenders the site to `dist/` — there is no request-time API to call or extend._

- **Build-time (static generation)**: `@molecule/api-agent-transcript`, `@molecule/api-agent-transcript-autodetect`, `@molecule/api-content`, `@molecule/api-content-markdown`, `@molecule/api-feed-rss`, `@molecule/api-sitemap-xml`, `@molecule/api-text-provenance`, `@molecule/api-text-provenance-overlap`
- **Frontend / UI**: `@molecule/app-markdown-marked`
