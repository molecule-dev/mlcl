---
name: examples
description: Working code examples to copy + adapt when the user asks for a feature. ALWAYS read INDEX.md before writing feature code from scratch.
---

# Examples — read this BEFORE writing feature code

When the user asks for a feature ("let people sign in with Google",
"add a paginated user list", "accept payments", "let users chat",
"let users upload a profile photo", etc.), do NOT immediately start
writing code. The work has been done already.

## The procedure

1. **Read `.agents/skills/examples/INDEX.md`** — it's a skim-optimized
   tree mapping common asks to specific example folders.
2. **Find the closest match** to the user's request. Match by meaning,
   not by exact words. Non-technical users often describe features
   without naming the underlying tech ("let people pay" → Stripe;
   "people sign up" → OAuth; "talk to each other" → chat).
3. **Read the matching example's `README.md`** — it lists exactly which
   files to copy, what to install, what env vars to set, and the
   anti-patterns to avoid.
4. **Copy the files into the user's project** at the paths the README
   describes. Adapt names to fit their domain (rename `users` →
   `customers`, etc.).
5. **Tell the user what env vars they need to set** before things will
   work end-to-end (OAuth client IDs, Stripe keys, S3 credentials).

## Why this matters

Examples are real, tested, build-passing code. Writing feature code
from scratch — bond wiring, handler signatures, ClassMap usage, locale
keys, ESM `.js` extensions, peer-dep care — is where weak models make
mistakes that break the build. Copy + adapt is dramatically more
reliable than greenfield generation.

## When examples don't cover the ask

If `INDEX.md` has nothing close, the user is asking for something
no @molecule/* feature package covers. Two options:

1. **It's a primitive that's actually a `@molecule/app-ui-react`
   building block** (button, dialog, card layout). Look in
   `molecule-packages` skill — if a low-level package fits, use it
   directly without a worked example.
2. **It needs custom code** (e.g. business logic, domain-specific
   workflow). Write it directly using standard npm libraries. Do NOT
   invent a `@molecule/*` package name. See the
   "anti-hallucination" guidance in the system prompt.

## Stack of skills

`molecule-packages` (the catalog) tells you WHAT exists.
`examples` (this skill) tells you HOW to wire it up.
Patterns at `.agents/skills/patterns/` cover styling/layout patterns.

Read in that order: catalog → example → pattern → write code.
