---
id: chip-links
intent: linkability
title: Tag chips, author avatars, date stamps — micro-linkability inside cards
hooks: [Link]
---

# Micro-links inside cards

**When to use:** the user has just encountered a list of posts/items; each card contains smaller nav-worthy elements that should also be links.

Common patterns:

- **Tag chips** on a post card → `<Link to="/tags">#typescript</Link>` (or `/tags/:slug` if a detail route exists; fall back to `/tags` otherwise).
- **Author avatar / name** → `/authors/:id` if a detail route exists; otherwise leave as unclickable text. Don't invent nonexistent routes.
- **Category badge** → `/categories` or the specific category route.
- **"N comments" indicator** → `/post/:id#comments` anchor on the same post.

```tsx
// Before — static chip inside a card:
<span className="px-2 py-0.5 bg-secondary-container/30 text-on-secondary-container text-[10px] font-bold rounded">{tag}</span>

// After — clickable chip with stopPropagation so outer Link/onClick doesn't fire:
<Link
  to="/tags"
  onClick={e => e.stopPropagation()}
  className="px-2 py-0.5 bg-secondary-container/30 text-on-secondary-container text-[10px] font-bold rounded hover:bg-secondary-container/50 transition-colors"
>{tag}</Link>
```

**Rules:**

- Only link to routes that actually exist in the app (check `App.tsx`'s `<Routes>`). Don't invent `/tags/:slug` if only `/tags` exists.
- `e.stopPropagation()` on the chip's onClick so the parent card's click handler doesn't also fire (double-navigation).
- Preserve all existing className and styling — add hover only if it aids affordance.

**Anti-patterns:**

- Don't wrap every piece of text in a Link — only elements that feel clickable (tags, author, category).
- Don't link to invented routes. Missing routes stay as plain text.
