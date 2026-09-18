---
name: dark-mode
intent: |
  - "Dark mode toggle"
  - "Light / dark theme"
  - "Theme switcher"
  - "Match system preference"
keywords: [dark-mode, theme, toggle, appearance, light, system-preference]
---

# Dark mode toggle (light / dark / system)

**When to copy this example:** the user wants users to choose
light, dark, or follow-system theme. Pairs with the ClassMap
bond — `getClassMap()` resolves theme tokens at render time.

## What you'll install

Nothing extra. ClassMap implementations already support theme
tokens; this example wires the user-facing toggle.

## How it works

`applyTheme()` toggles the `.dark` class on `<html>` — the SAME switch the
molecule theme provider (`@molecule/app-theme`) flips and what every ClassMap
dark variant reads. If your app already wires the theme provider (it does by
default, via `MoleculeProvider`), drive light/dark from React instead with
`useTheme()` from `@molecule/app-react` (`{ mode, setTheme, toggleTheme }`) —
that also persists the choice through the theme provider's storage.

The tiny `theme.ts` helper reads/writes the preference with **raw
`localStorage`** — a deliberate, documented exception to the
"use `@molecule/app-storage`" rule: the preference must be read _synchronously
before React boots_ so the theme is right on the first paint (an async
`StorageAdapter` would cause a light→dark flash). Every OTHER piece of app data
must still go through the storage abstraction.

## Files in this example

| Path                             | What it does                                                                                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/components/ThemeToggle.tsx` | Three-way toggle (Light / Dark / System) persisted to localStorage + user prefs.                                                                                                                             |
| `app/lib/theme.ts`               | `applyTheme(mode)` toggles the `.dark` class on `<html>` (the switch the molecule theme provider + ClassMap read — not a `data-theme` attribute, which recolors nothing), listens to `prefers-color-scheme`. |

## Anti-patterns

- Do not use raw Tailwind dark: classes in components. The
  ClassMap bond owns light/dark variants — components stay
  agnostic.
- Do not invent `@molecule/app-theme-toggle`. It's a component +
  a localStorage wrapper.
- Do not flash light theme on first render for users who picked
  dark. Inject the saved preference inline in `<head>` BEFORE
  React boots, so the document class matches from the first paint.
- Do not skip the system option. Many users want OS-driven theme.
- Do not write the same theme key to two storage locations
  (cookie + localStorage). Pick one as authoritative.

## Verify

Toggle to Dark → page recolors immediately + persists across
reloads. Toggle to System + change OS theme → app follows along
without reload. First load on a new device with OS in dark mode
→ app starts in dark, no flash.
