---
name: color-picker
intent: |
  - "Color picker"
  - "Pick a color / hex"
  - "Brand / theme color input"
  - "Swatch selector"
  - "Choose a colour"
keywords: [color, colour, picker, hex, rgb, hsv, swatch, palette, theme, brand, tint, colorpicker]
---

# Color picker (hex color input)

**When to copy this example:** the user wants to choose a color — a brand/
theme color, a label/tag color, a canvas fill.

**Works out of the box — no provider to bond.** `<ColorPicker>` is a
self-contained React component.

## What you'll install

```bash
cd /workspace
npm install @molecule/app-color-picker-react --workspace=app
```

## Files in this example

| Path                            | What it does                                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `app/components/ColorField.tsx` | Holds the hex-string state and renders the shared `<ColorPicker>`. Forwards changes via `onChange`. |

Usage — the value is a hex string:

```tsx
<ColorField initialColor="#10b981" onChange={(hex) => setBrandColor(hex)} />
```

## Anti-patterns

- Do not rebuild a hue/saturation/hex picker from scratch. Use
  `<ColorPicker>` from `@molecule/app-color-picker-react` — it handles the
  gradient/hue UI, hex parsing, `getClassMap()` styling, and `data-mol-id`
  (via `dataMolId`).
- Do not ignore `onChange`. `<ColorPicker>` is CONTROLLED — it renders your
  `value` (hex) and never mutates it. Store the next hex or the pick is lost.
- Do not store the color as RGB/HSV objects as your source of truth. Persist
  the hex string; convert on demand with the exported `hexToRgb` / `rgbToHex`
  / `rgbToHsv` / `hsvToRgb` helpers.
- Do not pass a non-hex `value` (named colors, `rgb(...)`, or a bare
  `2563eb`). Pass a full `#rrggbb` string; validate untrusted input with the
  exported `isValidHex` first.

## Verify

The picker renders → choosing a color fires `onChange` with the new
`#rrggbb` hex → the value round-trips (re-opening shows the stored color).
