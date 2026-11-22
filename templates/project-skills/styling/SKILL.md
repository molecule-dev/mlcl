---
name: styling
description: Styling with the ClassMap system. Valid values for spacing, text, flex, surfaces. Component examples. No raw Tailwind.
---

# Styling with ClassMap

Always use `getClassMap()` from `@molecule/app-ui` and its methods (`cm.sp`, `cm.textSize`, `cm.flex`, `cm.surface`, etc.) for everything they cover. For a Tailwind utility that ClassMap has **no method for** (e.g. `max-w-*`, `min-w-*`, `grid-cols-*`, `gap-y-*`, `aspect-*`, `overflow-*`), pass the **raw class string inside `cm.cn(...)`** — that's the expected escape hatch, exactly like `'rounded-md'`. Do NOT force a non-spacing utility through `cm.sp` (e.g. `cm.sp('max-w-7xl', …)` is a type error — `cm.sp` only takes the spacing sides below).

```tsx
import { getClassMap } from '@molecule/app-ui'

export function Card() {
  const cm = getClassMap() // INSIDE the component body, never at module scope
  // covered by a method → use it:        cm.sp('p', 4), cm.textSize('lg')
  // no method (max-width) → raw string:  cm.cn('max-w-7xl', cm.sp('p', 4))
  return <div className={cm.cn(cm.surface, cm.sp('p', 4))} />
}
```

Call `getClassMap()` inside the component body, never at module scope: a top-level `const cm = getClassMap()` runs at import time, before `setupProviders()` sets the ClassMap, so it throws "No UIClassMap has been set" and blanks the whole app while `tsc` stays green.

Import UI components from the framework package (`@molecule/app-ui-react` — `Button`, `Modal`, `Icon`, …), never from a styling-specific package: the framework components call `getClassMap()` internally, so they stay correct if the styling bond is ever swapped. The only Tailwind-coupled package is the ClassMap bond wired in `app/src/bonds/` — swapping it is how the app changes styling systems, if the user wants one (see the bond-system skill).

## Prose is never a control

Never wrap running text in `<button>`, `<a>` or `<summary>` to make it clickable or
focusable. The browser's own button stylesheet takes over the text — centred,
13px, its own font and padding — and no class you add later fully undoes it. Put
the control BESIDE the paragraph (a small button in the margin, `aria-controls`
pointing at the block) and keep every paragraph on the page, whoever wrote it, on
ONE type scale: the same `font-size`, `line-height` and `text-align` from one
`.prose` rule. Check it the way a reader would: `getComputedStyle(p)` on a paragraph
from each kind of page must agree.

## Actions look like buttons

Anything the user is meant to click to DO something — Run, Save, Delete, Apply,
Retry, Send — is a visible button: `cm.button({ variant: 'solid' })` for the one
primary action on a surface, `cm.button({ variant: 'outline' })` for the secondary
actions beside it, with a semantic `color` where one applies (`error` for Delete /
Stop, `primary` for the main call to action). `variant: 'ghost'` and `'link'` are
for dismiss/close controls and show/hide toggles ONLY — a ghost button reads as
plain text, and a row of plain-text "Run" links is a defect a reviewer will send
back. Sibling actions in one row share one size. Never hand-roll a button with
inline styles or a bare `<a>`; the design system's `DESIGN.md` ("Actions look like
buttons") is the contract.

## Theming — recolor the app (where the color palette lives)

The colors behind `bg-primary`, `text-primary`, `cm.surface`, `cm.textMuted`, etc.
come from CSS variables, NOT from the ClassMap methods. To recolor the app (e.g.
"make it blue"), edit the variables — a hex value or a raw Tailwind color class
(`bg-blue-600`) in a component does not follow the theme or dark mode. (A one-off
color the user asks for on one element is fine inline.)

- **If `app/src/theme.css` exists** (it does in template-based apps): that file IS the
  palette. Edit the `--color-*` variables there — under `:root` for the light theme
  and under `[data-mol-mode='dark']` for dark. Change the value in BOTH blocks, e.g.
  `--color-primary: #1565c0;`. This is the ONLY file that recolors such an app.
  **Do NOT edit `app/src/bonds/app-theme-css-variables.ts` to recolor** — its
  `--mol-color-*` values are overridden by theme.css and have NO visible effect; that
  bond only toggles light/dark mode.
- **If there is no `app/src/theme.css`** (custom builds): the palette comes from the
  light/dark `Theme` objects in `app/src/bonds/app-theme-css-variables.ts`. Edit their
  `colors` there.

Open the file first and confirm which case you're in before editing.

Beyond the UI palette, a COMPLETE rebrand touches separate files:

- **Logo / favicon / PWA theme color** → `BRAND_COLOR` in `app/src/branding.ts`
  (drives the generated logo SVG, app icons, and `<meta theme-color>`). So a full
  "make it blue" edits BOTH theme.css (UI) and BRAND_COLOR (brand assets).
- **App name / tab title** → `APP_NAME` in `app/src/branding.ts` AND the
  `<title>`/meta tags in `app/index.html` (the tab + social/PWA chrome don't read
  branding.ts at runtime).
- **Font** → set `--font-family` in `theme.css` to a family that is loaded
  **locally** in `app/index.html`. Fonts are served from `public/fonts/` via the
  `@font-face` block between `<!-- mol:fonts -->` markers — the `@molecule/app-fonts-*`
  packages (Inter, JetBrains Mono, Material Symbols, and many display/serif faces)
  provide these. To use a new family, add its `@font-face` to that block and drop
  the font file in `public/fonts/` (copy it from the package's `fonts/` dir).
  Local is the default: a CDN font (`<link href="https://fonts.googleapis.com…">`,
  `@import url(https://fonts.gstatic…)`, `next/font/google`) sends every visitor's IP
  to that host and delays first render. If the user asks for a CDN font, or an imported
  app already loads one, use it: fonts.googleapis.com and fonts.gstatic.com are
  reachable from a molecule.dev sandbox, where any other host is one click on the Allow card.
- **Images / avatars → prefer a local generated placeholder over an external image service.**
  `https://i.pravatar.cc/…`, `https://api.dicebear.com/…`, `images.unsplash.com`, `placehold.co`,
  `ui-avatars.com` and the like DO load when the **browser** fetches them (a plain client-side
  `<img src>` renders fine in the preview and in production) — but they BREAK the moment the
  **server** fetches them: Next.js `next/image` optimizing an external URL, SSR /
  `getServerSideProps`, or any server-side download hits a molecule.dev sandbox's egress filter (a blocked
  request + an egress-denial card). Even client-side they cost a third-party round-trip and leak
  the visitor's IP. A **deterministic local placeholder** sidesteps all of it — generate one from
  a seed (the user's id/name):
  a small inline-SVG data-URI is enough — initials on a hue derived from the seed, for example:

  ```ts
  const avatar = (seed: string, label: string) => {
    let h = 0
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360
    const initials = label
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
    return `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="hsl(${h} 60% 45%)"/><text x="50%" y="54%" font-family="system-ui" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`,
    )}`
  }
  ```

  It works offline, needs no network, and is stable per seed. Real user
  photos default to your own origin (an upload the app stores); an image service or CDN
  the user chooses works too (allow its host if a server-side fetch is blocked).

## Combining Classes

```tsx
<div className={cm.cn(cm.sp('p', 4), cm.textSize('sm'), cm.surface)}>
```

`cm.cn()` concatenates class strings. It is NOT tailwind-merge — conflicting utilities resolve by CSS file order, not DOM class order.

## Spacing — cm.sp(side, value)

| Side                           | Meaning                  |
| ------------------------------ | ------------------------ |
| `'p'`                          | padding all              | `'px'` | padding x | `'py'` | padding y |
| `'pt'`, `'pr'`, `'pb'`, `'pl'` | padding individual sides |
| `'m'`                          | margin all               | `'mx'` | margin x  | `'my'` | margin y  |
| `'mt'`, `'mr'`, `'mb'`, `'ml'` | margin individual sides  |

**Valid values:** `0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24`

```tsx
cm.sp('p', 4) // padding: 1rem
cm.sp('mb', 2) // margin-bottom: 0.5rem
cm.sp('px', 3) // padding-left + padding-right: 0.75rem
```

## Text — cm.textSize(scale) + cm.fontWeight(weight)

**textSize values:** `'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl'`

**fontWeight values:** `'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold'`

```tsx
cm.textSize('lg') // font-size: 1.125rem
cm.fontWeight('bold') // font-weight: 700
cm.textMuted // muted text color
cm.textPrimary // primary text color
```

## Flex — cm.flex(options)

```tsx
cm.flex({ direction: 'row', align: 'center', justify: 'between', gap: 'sm' })
```

| Option      | Values                                                              |
| ----------- | ------------------------------------------------------------------- |
| `direction` | `'row' \| 'col' \| 'row-reverse' \| 'col-reverse'`                  |
| `align`     | `'start' \| 'center' \| 'end' \| 'stretch' \| 'baseline'`           |
| `justify`   | `'start' \| 'center' \| 'end' \| 'between' \| 'around' \| 'evenly'` |
| `wrap`      | `'wrap' \| 'nowrap' \| 'wrap-reverse'` — **NOT a boolean!**         |
| `gap`       | `'none' \| 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'`                    |

## Surfaces & Borders

```tsx
cm.surface // primary surface (card-like background)
cm.surfaceSecondary // secondary surface
cm.borderAll // border on all sides
cm.borderB // border bottom only
cm.borderT // border top only
```

## Rounding

There is NO parametric `cm.rounded(...)` method. Full-round HAS a member — use
`cm.roundedFull`. The sized radii (`'rounded-sm'`, `'rounded-md'`, `'rounded-lg'`,
`'rounded-xl'`) have no method, so pass the raw class string inside `cm.cn(...)`:

```tsx
<div className={cm.cn(cm.surface, 'rounded-md')} />
<button className={cm.cn(cm.button({ variant: 'solid' }), cm.roundedFull)} />
```

## Buttons & Inputs

```tsx
cm.button({ variant: 'solid' | 'outline' | 'ghost', color?: string, size?: string })
cm.input()
```

## Component Examples

### Card

```tsx
<div className={cm.cn(cm.surface, cm.sp('p', 4), 'rounded-lg', cm.borderAll)}>
  <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>{title}</h2>
  <p className={cm.cn(cm.textMuted, cm.sp('mt', 2))}>{description}</p>
</div>
```

### Nav Bar

```tsx
<nav
  className={cm.cn(
    cm.surface,
    cm.sp('px', 4),
    cm.sp('py', 2),
    cm.borderB,
    cm.flex({ direction: 'row', align: 'center', justify: 'between' }),
  )}
>
  <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{appName}</span>
  <div className={cm.cn(cm.flex({ direction: 'row', gap: 'sm' }))}>{/* nav links */}</div>
</nav>
```

### Form Layout

```tsx
<form className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('p', 4))}>
  <div>
    <label className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>Title</label>
    <input className={cm.cn(cm.input(), cm.sp('mt', 1))} />
  </div>
  <button className={cm.cn(cm.button({ variant: 'solid' }), cm.sp('py', 2))}>Submit</button>
</form>
```

### List

```tsx
<div className={cm.cn(cm.flex({ direction: 'col' }))}>
  {items.map((item) => (
    <div
      key={item.id}
      className={cm.cn(
        cm.sp('p', 3),
        cm.borderB,
        cm.flex({ direction: 'row', align: 'center', justify: 'between' }),
      )}
    >
      <span>{item.title}</span>
      <button className={cm.cn(cm.button({ variant: 'outline', color: 'error', size: 'sm' }))}>
        Delete
      </button>
    </div>
  ))}
</div>
```

## Conflicting Classes

`cm.cn()` is NOT tailwind-merge. Conflicting utilities resolve by CSS file order, not class order in the HTML. Use inline style for reliable overrides — the compound `cm.sp(...)` overload takes an OBJECT and returns a style object (`{ paddingRight: '0.5rem' }`) on the same spacing scale, so you don't hand-write rem values:

```tsx
// BAD — pr-2 may or may not override p-3:
<div className={cm.cn(cm.sp('p', 3), cm.sp('pr', 2))}>

// GOOD — spread the compound form into style; inline styles always win:
<div className={cm.sp('p', 3)} style={{ flex: 1, ...cm.sp({ pr: 2 }) }}>
```

The compound form covers spacing (padding + margin) only. For other conflicting properties (borders, font sizes), write the inline `style` value directly.

## Dynamic Class Gotcha

ClassMap methods like `cm.sp()`, `cm.textSize()`, `cm.fontWeight()` generate dynamic Tailwind class strings. These work because all valid combinations are pre-safelisted via `@source inline(...)` in the project's `index.css`. Removing those directives makes the dynamic classes silently stop rendering.
