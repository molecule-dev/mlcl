---
name: rich-text-editor
intent: |
  - "Rich text editor"
  - "WYSIWYG editor"
  - "Formatted text input (bold / italic / lists)"
  - "Compose a post / note / comment with formatting"
  - "Quill editor"
keywords:
  [
    rich,
    text,
    editor,
    wysiwyg,
    quill,
    formatting,
    format,
    bold,
    italic,
    toolbar,
    prose,
    compose,
    content,
    html,
  ]
---

# Rich text editor (WYSIWYG, Quill)

**When to copy this example:** the user wants formatted text input — a
post/note/comment composer with a bold/italic/list toolbar, not a plain
`<textarea>`.

## What you'll install

```bash
cd /workspace
# The editor feature + its real Quill provider (quill + dompurify come with it).
# WITHOUT the -quill bond, @molecule/app-rich-text falls back to a bare
# contentEditable with NO toolbar.
npm install @molecule/app-rich-text @molecule/app-rich-text-quill --workspace=app
```

## Files in this example

| Path                               | What it does                                                                                                                                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/RichTextField.tsx` | Reusable field: wraps the imperative `createEditor()` from `@molecule/app-rich-text` in a ref + effect, forwards edits via `onChange` (the normalized `{ text, html }` value), destroys the editor on unmount. Provider-agnostic — no `quill` import. |
| `app/components/NoteEditor.tsx`    | Concrete usage: holds the value in state and hands it to `onSave`. Shows the `text` (plain) + `html` dual value you should persist.                                                                                                                   |

## Bond wiring (app entry, e.g. `app/src/main.tsx`, ONCE)

```typescript
import 'quill/dist/quill.snow.css' // REQUIRED — without it the toolbar renders broken
import { setProvider } from '@molecule/app-rich-text'
import { provider } from '@molecule/app-rich-text-quill'

setProvider(provider) // now createEditor() renders a real Quill editor + toolbar
```

## Anti-patterns

- Do not forget `import 'quill/dist/quill.snow.css'` once in your app
  entry (use `quill.bubble.css` for `theme: 'bubble'`). Without it the
  editor renders unstyled and the toolbar is a broken bullet list — the
  #1 "my Quill editor looks broken" cause.
- Do not skip `setProvider(provider)`. If you forget, `@molecule/app-rich-text`
  silently self-bonds a bare contentEditable — the field appears to work but
  has no toolbar, no presets, no delta. No error is thrown, so a "missing
  toolbar" almost always means the quill provider was never bonded.
- Do not re-mount the editor on every keystroke. `createEditor()` is
  imperative and owns its content after mount — RichTextField builds it
  ONCE in a `[]` effect; rebuilding drops the caret and selection.
- Do not skip `editor.destroy()` on unmount. It tears down the editor AND
  the sibling `.ql-toolbar`; without it, re-mounting stacks duplicate
  toolbars and leaks listeners.
- Do not trust `editor.getHTML()` as safe output. Quill sanitizes on input,
  but stored HTML must still be sanitized server-side before you persist or
  re-serve it. Store BOTH `value.text` (plain — for search/preview/validation)
  and `value.html` (for rendering); never keep the Quill `delta` as your only
  copy.
- Do not hardcode toolbar buttons. Pass a preset — `toolbar: 'minimal' |
'standard' | 'full'` — or a `ToolbarConfig`; presets live in `quillToolbars`.
- Do not construct the editor during SSR. `createEditor({ container })` needs
  a mounted DOM node — build it in a client-only effect (RichTextField does).

## Verify

The editor renders with a formatting toolbar (bold / italic / lists) →
typing + formatting text fires `onChange` with updated `{ text, html }` →
Save is enabled once there's text and receives the value.
