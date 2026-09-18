---
id: card-link-wrap
intent: linkability
title: Wrap repeated cards/tiles in a Link to the detail page
hooks: [Link]
---

# Make entire card clickable

**When to use:** any list where each item has a corresponding detail page (blog posts → post detail, bots → bot editor, tickets → ticket detail, etc.).

```tsx
import { Link } from 'react-router'
// inside parent:
{
  posts.map((post) => (
    <Link
      key={post.id}
      to={`/post/${post.id}`}
      className="contents" // do NOT change the card's visual layout
    >
      <PostCard post={post} />
    </Link>
  ))
}
```

**Key rules:**

- `className="contents"` on the Link — CSS `display: contents` makes the Link tag effectively invisible for layout purposes so the card keeps its original styling.
- The Link wraps the CARD, not the title inside the card. Whole-card click is the standard UX.
- If the card has an internal button (Edit, More, Favorite), add `e.stopPropagation()` to that button's `onClick` so nested clicks don't double-fire.

**Anti-patterns:**

- Don't wrap just the title — users expect the whole card to be clickable.
- Don't use `<a href="/post/id">` — React Router's `Link` is the correct primitive.
- Don't forget `e.stopPropagation()` on nested interactive elements.
