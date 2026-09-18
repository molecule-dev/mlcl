---
name: tags-input
intent: |
  - "Tags input"
  - "Add labels / keywords"
  - "Chip / token input"
  - "Multi-value text field"
  - "Categorize with tags"
keywords:
  [
    tag,
    tags,
    tagging,
    label,
    labels,
    chip,
    chips,
    token,
    keywords,
    categories,
    categorize,
    multi-value,
  ]
---

# Tags input (chip/token field)

**When to copy this example:** the user wants to enter a set of short
values — tags, labels, keywords, skills — as removable chips, not a
comma-separated string.

**Works out of the box — no provider to bond.** `<TagInput>` is a
self-contained React component.

## What you'll install

```bash
cd /workspace
npm install @molecule/app-tag-input-react --workspace=app
```

## Files in this example

| Path                           | What it does                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/TagsInput.tsx` | Holds the `string[]` state and renders the shared `<TagInput>`. Adds a `normalize` that lowercases + de-dupes, and forwards changes via `onChange`. |

Usage — you own the array:

```tsx
<TagsInput initialTags={['react', 'typescript']} maxTags={10} onChange={setSkills} />
```

## Anti-patterns

- Do not rebuild a chip/token input from scratch. Use `<TagInput>` (and
  `<TagChip>`) from `@molecule/app-tag-input-react` — it handles the
  keyboard commits, removal, `getClassMap()` styling, and `data-mol-id`.
- Do not ignore `onChange`. `<TagInput>` is CONTROLLED — it renders your
  `value` and never mutates it. Store the next array or edits are lost.
- Do not forget tags also commit on BLUR. Clicking away with a non-empty
  draft adds a tag — account for that when the field sits in a form that
  submits on blur/focus change.
- Do not skip `normalize` if you need clean data. It runs on every commit;
  return the cleaned value (e.g. lowercased) or `null` to reject
  (empties + duplicates are rejected by default). This is where you
  validate/canonicalize.
- Do not expect an error when `maxTags` is hit — further input is silently
  discarded (the draft clears). Show your own hint near the limit if users
  need to know why.

## Verify

Typing a value + Enter (or comma/Tab) adds a chip → duplicates and blank
entries are rejected → removing a chip updates the array → the parent
receives the new `string[]` via `onChange`.
