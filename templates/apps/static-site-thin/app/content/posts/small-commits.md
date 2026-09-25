---
title: 'Small commits'
date: 2026-08-12
description: 'The commit is the undo button; keep it within reach.'
tags: [process, code]
templateDemo: true # sample post shipped with the template — delete this file once the site has real posts
---

A commit is a point you can return to. Hours of uncommitted work is hours you cannot get back if the next command goes wrong.

## One logical change

If the message needs the word "and", it is two commits. A reviewer can hold one idea in their head; a reverter can remove one idea without collateral.

## Commit before the risky step

About to run a script over two hundred files? Commit first. Recovering from a bad sweep is a one-line `git revert` — if the good state was committed.
