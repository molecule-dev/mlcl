# DESIGN.md — {{PROJECT_NAME}}

> This file extends the molecule base design system. AI tools should reference both this file and the molecule DESIGN.md when generating UI. Values here override the base system.

## Brand Colors

- Primary: `#4070e0`
- Primary Hover: `#6090f0`
- Primary Dark: `#3060c0`

## App-Specific Tokens

<!-- Override or add tokens specific to this app type -->

## Layout

- Content max-width: `1200px`
- Sidebar: `240px`
- Top bar: `56px`

## Reference

- Base design system: See `@molecule/DESIGN.md` for the complete token reference
- UIClassMap: Use `getClassMap()` from `@molecule/app-ui` — never hardcode class names
- Automation: Include `data-mol-id` on all interactive elements
