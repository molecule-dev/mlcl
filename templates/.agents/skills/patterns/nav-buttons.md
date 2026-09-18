---
id: nav-buttons
intent: navigation
title: Navigation buttons / CTAs
hooks: [Link, useNavigate]
---

# Buttons that navigate

**Rule of thumb:**

- Does the click take the user to a different URL? → `<Link to="...">`
- Does the click trigger an action (submit, open modal) and THEN maybe navigate? → `<button onClick={...}>` + `useNavigate()`

```tsx
// Plain nav CTA — replace the stitch <button>Sign up</button> with:
<Link to="/signup" className="...stitch classes...">Sign up</Link>

// Action that navigates — keep the button, add an onClick:
const navigate = useNavigate()
<button onClick={() => navigate('/posts/new')}>New post</button>
```

**Anti-patterns:**

- Don't use `<Link>` for actions that aren't pure navigation (e.g., "Delete" button).
- Don't use plain anchors (`<a href>`) — they cause full-page reloads.
- Preserve all className / inline style from the original button; React Router `Link` forwards all props.
