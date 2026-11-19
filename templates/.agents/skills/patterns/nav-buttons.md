---
id: nav-buttons
intent: navigation
title: Navigation buttons / CTAs
hooks: [Link, useNavigate]
---

# Route links and action buttons

**Rule of thumb:**

- Does the click take the user to a different URL? → `<Link to="...">`
- Does the click trigger an action (submit, open modal) and THEN maybe navigate? → `<button onClick={...}>` + `useNavigate()`

```tsx
// Open a page with a real link.
;<Link to="/drafts/new" className={actionClass}>
  New draft
</Link>

// Save the draft, then navigate to the saved record.
const navigate = useNavigate()
async function saveAndOpenDraft() {
  const saved = await saveDraft(draft)
  navigate('/drafts/' + saved.id)
}
;<button type="button" onClick={saveAndOpenDraft}>
  Save draft
</button>
```

**Anti-patterns:**

- Don't use `<Link>` for actions that aren't pure navigation (e.g., "Delete" button).
- Don't use plain anchors (`<a href>`) — they cause full-page reloads.
- Preserve all className / inline style from the original button; React Router `Link` forwards all props.
