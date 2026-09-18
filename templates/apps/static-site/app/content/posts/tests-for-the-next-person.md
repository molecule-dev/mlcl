---
title: 'Tests for the next person'
date: 2026-08-04
description: 'A test is a sentence about behaviour that a machine keeps true.'
tags: [code, craft]
templateDemo: true # sample post shipped with the template — delete this file once the site has real posts
---

The best tests read like the documentation you wish existed: _a signed-up user can log out and log back in_. The name says what is true; the body proves it.

## Test the outcome, not the mechanism

A test that asserts a function was called passes when the function does the wrong thing. A test that asserts the result the user sees fails when it should.

## Anchor to something visible

For user interfaces, at least one assertion per test should touch the screen — a heading, a button, a URL. A suite that only hits the API stays green while the page is blank.
