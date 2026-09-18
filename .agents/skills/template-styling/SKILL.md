---
name: template-styling
description: Rules for styling in molecule app templates. UIClassMap system, zero raw Tailwind, framework-specific idioms for React/Vue/Svelte/Solid/Angular/React Native.
---

# Template Styling Rules

Templates MUST use the UIClassMap system. Never use raw Tailwind (or similar) where a ClassMap equivalent exists.

Templates live in `templates/app/{framework}/`.

## Framework Idioms

Each `@molecule/app-ui-{framework}` package has its own approach (components vs class generators vs raw ClassMap). Read the package's README.md or `src/index.ts` for available exports:

```
~/molecule-workspace/molecule/packages/app/frameworks/{framework}-ui/
```

The ClassMap interface itself is defined in `@molecule/app-ui` — read its `src/types.ts` for all available methods (`cm.button()`, `cm.container()`, `cm.sp()`, etc.).

`style` attributes (e.g., `style="z-index: 50"`) are OK when no ClassMap equivalent exists.

## Import Rules

```typescript
// WRONG - references styling library
import { Button } from '@molecule/app-ui-tailwind-react'

// RIGHT - styling-library agnostic
import { Button } from '@molecule/app-ui-react'
```

The `@molecule/app-ui-{framework}` packages use `getClassMap()` internally. The only Tailwind-specific bonds are `@molecule/app-ui-tailwind` (web) and `@molecule/app-ui-nativewind` (React Native), wired at startup in `bonds/index.ts`.

## i18n in Templates

All user-visible text in templates must use i18n. Never hardcode English strings — use `t('key')` or `useTranslation()`. This includes:

- Button labels, headings, form placeholders
- `aria-label` attributes
- Loading/saving indicators
- Modal titles
- Error messages

See `/app-patterns` skill for the full i18n framework reference.

## Dynamic Class Names — Critical Gotcha

**Never build Tailwind class names via string interpolation.** The Tailwind scanner is static — it can only generate CSS for class names that appear as complete literal strings somewhere in a scanned file. Dynamically constructed strings like `` `${property}-${scale}` `` are invisible to it.

This affects the following `UIClassMap` methods, which all return dynamically-constructed class strings:

- `cm.sp(property, scale)` — spacing (`p-3`, `pr-2`, etc.)
- `cm.stack(scale)` — `space-y-{scale}`
- `cm.textSize(scale)` — `text-{scale}`
- `cm.fontWeight(weight)` — `font-{weight}`
- `cm.w(value)`, `cm.h(value)`, `cm.minH(value)`, `cm.maxW(scale)`
- `cm.gridRows(n)` — `grid-rows-{n}`

These work in practice because all valid combinations are pre-safelisted via `@source inline(...)` in the generated project's `index.css`. **Do not remove those `@source inline` directives.**

### Conflicting class overrides

`cm.cn()` is a simple concatenator — it is NOT tailwind-merge. When conflicting utilities appear in the same `className` (e.g., `p-3 pr-2`), CSS file order determines the winner, not DOM class order. **The last-defined rule in the stylesheet wins, regardless of class order in the HTML.**

```tsx
// BAD — pr-2 may or may not override p-3 depending on stylesheet order:
<div className={cm.cn(cm.sp('p', 3), cm.sp('pr', 2))}>

// GOOD — spread the override into the style prop; inline styles always win:
<div className={cm.sp('p', 3)} style={{ ...cm.sp({ pr: 2 }) }}>
```

The **compound `cm.sp()` overload** accepts an object and returns a `Record<string, string>` style object (e.g., `{ paddingRight: '0.5rem' }`), bypassing class generation entirely:

```tsx
// Spread into style prop for reliable compound spacing overrides:
<div
  className={cm.sp('p', 3)}
  style={{ flex: 1, overflow: 'auto', ...cm.sp({ pr: 2 }) }}
>
```

This pattern works for spacing (padding + margin). For other properties that need overrides (borders, font sizes, etc.), use inline `style` directly — the ClassMap has no compound override form for those.
