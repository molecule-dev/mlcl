---
name: tags-input
intent: |
  - "Edit tag chips and show saved tags on detail and preview screens"
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
    saved tags,
  ]
planPhrases: [tag chips, tags input, label chips, saved tags]
---

# Tags input (chip/token field)

Use this example to edit tags, labels, keywords or skills as removable chips
and display the saved values wherever readers need them.

`<TagInput>` and `<SavedTags>` use the app's ClassMap and i18n setup.

## What you'll install

```bash
cd /workspace
npm install @molecule/app-tag-input-react --workspace=app
```

## Files in this example

| Path                           | What it does                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `app/components/TagsInput.tsx` | Exports a controlled editor built on `<TagInput>` and a read-only `<SavedTags>` built on `<TagList>`. |

Keep the editor's array in the form and send it with the other fields. On the
detail page, pass the tags from the loaded or newly saved record to `<SavedTags>`.
Use the same component in a preview that shows tags.

```tsx
<TagsInput initialTags={['react', 'typescript']} maxTags={10} onChange={setSkills} />
<SavedTags value={record.labels} aria-label="Skills" />
```

`<SavedTags>` hides an empty list. Use `className` and `itemClassName` for the
app's styles or `renderTag` for custom content such as a link.

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

Add two values with Enter, save, and check that both appear after opening or
reloading the detail page. Remove all tags, save the empty array, and check
that the detail page clears them. Blank and duplicate entries are rejected.
