---
title: 'What llms.txt is for'
date: 2026-07-26
description: 'A short index that tells a language model where the readable versions of your pages are.'
tags: [web, meta]
templateDemo: true # sample post shipped with the template — delete this file once the site has real posts
---

`llms.txt` is a plain-text file at the root of a site: a title, a line about the site, and a list of links to markdown versions of its pages.

## Why markdown

A language model reading HTML spends most of its attention on navigation, scripts and markup. The same page as markdown is a tenth of the size and all signal.

## This site's copy

Every post here is served twice: as a page, and as the original markdown at `/<slug>.md`. [llms.txt](/llms.txt) lists the markdown copies with a one-line description each.
