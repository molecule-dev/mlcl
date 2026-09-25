---
title: 'Deploying a directory'
date: 2026-07-30
description: 'How this site ships: build, then copy a folder.'
tags: [web, process]
templateDemo: true # sample post shipped with the template — delete this file once the site has real posts
---

The deploy for this site is two steps, and the second one is `cp`.

## Build

```sh
npm run build
```

The build type-checks, bundles the app, then prerenders every route to `dist/<route>/index.html` — in Node, with no browser involved — and writes the feeds, the sitemap and `llms.txt` next to them.

## Copy

Upload `dist/` to any static host. If the site lives under a sub-path, build with `BASE_PATH=/notes` and every link, asset and feed URL follows.
