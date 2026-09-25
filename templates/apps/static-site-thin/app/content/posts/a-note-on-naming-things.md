---
title: 'A note on naming things'
date: 2026-09-01
description: 'Names are the cheapest documentation you will ever write.'
tags: [code, craft]
templateDemo: true # sample post shipped with the template — delete this file once the site has real posts
---

A good name answers the question the reader was about to ask. A bad one makes them open the file.

## Three tests

1. **Could it mean something else?** If a name fits two things, it describes neither.
2. **Does it say what the thing is, not what it is near?** `userHelper` is near users; `formatUserName` is a thing.
3. **Would a stranger place it?** Read the name out of context. If it needs the folder to make sense, it is not finished.

```ts
// before
const data = await get(id)
// after
const invoice = await fetchInvoice(id)
```

Renaming is cheap early and expensive late — a published API name is forever.
