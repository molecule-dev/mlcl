# Static Site / Markdown Blog

- **slug**: `static-site`
- **cluster**: content-social
- **type**: static
- **layout**: content

A prerendered static site of markdown posts with front matter: paginated index, post pages, tag pages, RSS + Atom feeds, sitemap, llms.txt, raw markdown per post, drafts — no API, no database; `npm run build` writes dist/ for any static host

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`markdown`, `front-matter`, `prerender`, `pagination`, `tags`, `rss`, `atom`, `sitemap`, `llms-txt`, `drafts`, `seo`, `theme`, `i18n`

## Screens (6)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Home** `/` → `app/src/pages/Home.tsx`
- **Post** `/:slug/` → `app/src/pages/Post.tsx`
- **Tags** `/tags/` → `app/src/pages/Tags.tsx`
- **Tag** `/tags/:tag/` → `app/src/pages/Tag.tsx`
- **About** `/about/` → `app/src/pages/About.tsx`
- **NotFound** `*` → `app/src/pages/NotFound.tsx`

## Integrations (12 @molecule/* packages)

_This app has no server. The Build-time (static generation) packages run inside `npm run build`, which prerenders the site to `dist/` — there is no request-time API to call or extend._

- **Build-time (static generation)**: `@molecule/api-content`, `@molecule/api-content-markdown`, `@molecule/api-feed-rss`, `@molecule/api-sitemap-xml`
- **Frontend / UI**: `@molecule/app-header-react`, `@molecule/app-i18n`, `@molecule/app-markdown`, `@molecule/app-markdown-marked`, `@molecule/app-routing-react-router`, `@molecule/app-shell-layout-react`, `@molecule/app-theme-css-variables`, `@molecule/app-ui-tailwind`
