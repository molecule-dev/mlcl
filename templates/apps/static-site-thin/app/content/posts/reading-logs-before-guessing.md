---
title: 'Reading logs before guessing'
date: 2026-08-16
description: 'One observed value beats thirty minutes of plausible theories.'
tags: [code, debugging]
templateDemo: true # sample post shipped with the template — delete this file once the site has real posts
---

The most expensive debugging session is the one that starts with a theory. The cheapest starts with a log line.

## Start at the entry point

Print the actual input where it enters the system. Not what the docs say it should be — what it is. Half the bugs end right there.

## Then work inward

Follow the value one step at a time, printing as you go, until it stops being what you expect. That step is the bug. Everything before it was fine.

```ts
console.log('[handler] body =', JSON.stringify(req.body))
```

Delete the line afterwards. Keep the habit.
