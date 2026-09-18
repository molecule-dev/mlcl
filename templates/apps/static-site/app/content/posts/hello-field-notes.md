---
title: 'Hello, Field Notes'
date: 2026-09-06
description: 'What this site is, how it is built, and what to expect here.'
tags: [meta, writing]
templateDemo: true # sample post shipped with the template — delete this file once the site has real posts
---

This is a small site of notes: things learned while building software, written down before they are forgotten.

## How it is built

Every post is a markdown file with a little YAML front matter at the top. The build reads the files, renders them once to HTML, and writes one static page per post — no server, no database, nothing to keep running.

- Posts live in `content/posts/`
- The build runs `npm run build` and writes `dist/`
- `dist/` goes to any static host

## What to expect

Short notes, mostly. A longer piece now and then. Every post is also available as raw markdown at the same path with a `.md` extension, and there is an [RSS feed](/feed.xml) if you would rather read from a feed reader.
