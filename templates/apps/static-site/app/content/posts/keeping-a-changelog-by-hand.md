---
title: 'Keeping a changelog by hand'
date: 2026-08-28
description: 'Generated changelogs list commits; a written one tells the reader what changed for them.'
tags: [process, writing]
templateDemo: true # sample post shipped with the template — delete this file once the site has real posts
---

A generated changelog is a list of commits. A written one is a list of consequences: what a user can do now that they could not do before, and what they must change.

## One line per change, for strangers

Write each entry for someone who has never seen the code. Say what changed and why it matters, in their words. Internal narrative — which gate was wrong, what confused whom — does not belong there.

## Keep it as you go

An entry written the day of the change takes a minute. The same entry reconstructed a month later takes an hour and is worse.
