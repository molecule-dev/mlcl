---
title: 'The case for static sites'
date: 2026-08-24
description: 'A site that is only files has nothing to break at three in the morning.'
tags: [web, meta]
templateDemo: true # sample post shipped with the template — delete this file once the site has real posts
---

A static site is a directory of files. That sentence is the whole operations manual.

## What you give up

- No per-request logic: personalisation happens in the browser or not at all.
- No database: content is files in the repository, edited like code.

## What you get

- Nothing to patch, restart, scale or back up.
- Every page is cacheable forever and served from the edge.
- The build is the only moving part, and it runs on your machine or in CI where you can watch it.

For notes, documentation and most marketing pages, that trade is not close.
