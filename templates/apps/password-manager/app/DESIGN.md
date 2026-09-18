# DESIGN.md — Password Manager

## Brand Identity

- **App Name:** Sigil
- **Tagline:** Your secrets, sealed
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Secure
- Serious
- Reassuring
- Crystalline

## Target Persona

Individuals and teams needing encrypted password storage, generator, and secure sharing.

## Screens

| Name              | Route            | Auth | Purpose                                                                      | deriveFrom |
| ----------------- | ---------------- | ---- | ---------------------------------------------------------------------------- | ---------- |
| Landing           | /                | No   | Marketing home                                                               | —          |
| Login             | /login           | No   | Sign in                                                                      | —          |
| Signup            | /signup          | No   | Create account                                                               | Login      |
| ForgotPassword    | /forgot-password | No   | Request reset                                                                | Login      |
| ResetPassword     | /reset-password  | No   | Set new password                                                             | Login      |
| Vault             | /vault           | Yes  | Encrypted vault with search, folders, type filters                           | —          |
| ItemDetail        | /vault/:id       | Yes  | Item detail with reveal, copy, history                                       | Vault      |
| NewItem           | /vault/new       | Yes  | Add new vault item with type selector                                        | Vault      |
| Generator         | /generator       | Yes  | Password generator with length, symbols, strength                            | Vault      |
| SharedVaults      | /shared          | Yes  | Shared team vaults with permissions                                          | Vault      |
| SecurityReport    | /security        | Yes  | Weak, reused, breached passwords report                                      | Vault      |
| Settings          | /settings        | Yes  | Master password, 2FA, sessions, devices                                      | Vault      |
| Notifications     | /notifications   | Yes  | Activity feed: share invites, breach alerts, recovery requests, audit events | —          |
| Trash             | /trash           | Yes  | Recently deleted vault items, restore or purge within 30 days                | —          |
| Profile           | /profile         | Yes  | Account identity, recovery kit, public sharing handle, connected SSO         | —          |
| SharedVaultDetail | /shared/:id      | Yes  | Members, permissions matrix, audit log, invite controls for one shared vault | —          |

## App Constraints

- Master password unlock on load
- Vault items with type icons (password, card, note, identity)
- Generator with strength meter

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#4338ca`
- Primary Hover: `#6366f1`
- Primary Dark: `#3730a3`
- Accent: `#10b981`
- Accent Hover: `#34d399`
- Accent Dark: `#059669`

### Semantic

- Strength Strong: `#10b981`
- Strength Medium: `#f59e0b`
- Strength Weak: `#ef4444`
- Encrypted: `#4338ca`
- Encrypted Light: `#e0e7ff`
- Shared: `#8b5cf6`
- Shared Light: `#ede9fe`
- Expired: `#ef4444`
- Expired Light: `#fee2e2`

### Backgrounds

- Primary: `#f1f0f9`
- Secondary: `#e8e7f3`
- Surface: `#ffffff`
- Surface Secondary: `#f8f7fc`
- Vault: `#fafaff`

### Text

- Primary: `#1e1b4b`
- Secondary: `#6b6b9b`
- Tertiary: `#4c4c7a`
- Link: `#4338ca`
- Link Hover: `#3730a3`
- Password: `#1e1b4b` (monospace, letter-spaced)
- Password Masked: `#6b6b9b`

### Borders

- Primary: `#ddd6fe`
- Secondary: `#c4b5fd`
- Focus: `#4338ca`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#34d399`
- Background: `#0c0a1d`
- Surface: `#1a1740`
- Surface Secondary: `#231f52`
- Text Primary: `#f1f0f9`
- Text Secondary: `#a5a3c9`
- Border Primary: `#312e5c`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Password: `"SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`
- Heading: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Overrides

- Password display: `font-family: Password; font-size: 1rem; letter-spacing: 0.05em; font-variant-numeric: tabular-nums`
- Generated password: `font-family: Password; font-size: 1.125rem; letter-spacing: 0.08em`

## Layout

- Content Max Width: `1120px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Sidebar Category List: scrollable, sticky header per category
- Detail Panel Width: `480px` (slide-in from right)
- Vault Grid Columns: `1` (list view default), `3` (card view desktop), `2` (card view tablet)
- Vault Grid Gap: `16px`
- Top Bar Height: `56px`
- Password Generator Drawer Width: `400px`

## Components

### Vault Entry Row

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Height: `64px`
- Background: surface, hover: surface-secondary
- Border: `1px solid` border-primary
- Layout: `[favicon 32px] [name + username col] [category badge] [actions]`
- Favicon: `32px` rounded `6px`, fallback: first letter on primary-light background
- Name: font-weight `600`, font-size `sm`
- Username/URL: font-size `xs`, text-secondary
- Hover actions: copy username, copy password, edit (icon buttons, `28px`)

### Vault Entry Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `16px`
- Min height: `140px`
- Top accent bar: `3px solid` category color
- Favicon: `40px` rounded `8px`
- Name: font-weight `600`, font-size `base`
- Username: font-size `sm`, text-secondary, truncate

### Password Field

- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Height: `44px`
- Padding: `8px 12px`
- Font: password font family, `tabular-nums`
- Masked state: `disc` characters, text-password-masked
- Revealed state: monospace, text-password, letter-spacing `0.05em`
- Toggle button: eye icon, `32px`, ghost variant, right-aligned inside input
- Copy button: clipboard icon, `32px`, ghost variant

### Password Strength Meter

- Height: `4px`
- Border radius: `full`
- Background: background-secondary
- Segments: 4 equal-width bars with `3px` gap
- Colors: 1 bar `strength-weak`, 2 bars `strength-weak`, 3 bars `strength-medium`, 4 bars `strength-strong`
- Label: font-size `xs`, font-weight `500`, color matches active segment

### Password Generator

- Container border radius: `12px` (lg)
- Container padding: `24px`
- Container background: surface
- Generated password display: `48px` height, centered, monospace `lg`, letter-spacing `0.08em`
- Refresh button: circular `36px`, ghost, rotate animation `300ms`
- Length slider: track `4px`, thumb `18px` accent color, label shows current value
- Character toggles: pill-shaped `32px` height, `8px` border-radius, selected: primary background
- Options: uppercase, lowercase, numbers, symbols — toggle buttons in a row

### Category Badge

- Border radius: `full` (pill)
- Padding: `2px 10px`
- Font size: `xs`
- Font weight: `500`
- Categories with colors:
  - Login: `#4338ca` bg `#e0e7ff`
  - Credit Card: `#0891b2` bg `#cffafe`
  - Identity: `#7c3aed` bg `#ede9fe`
  - Secure Note: `#059669` bg `#d1fae5`
  - API Key: `#d97706` bg `#fef3c7`
  - Wi-Fi: `#6b7280` bg `#f3f4f6`

### Sharing Badge

- Border radius: `full`
- Padding: `2px 8px`
- Font size: `xs`
- Icon: `12px` share/people icon, left of text
- Shared: shared color, shared-light background
- Private: text-secondary, no background

### Vault Detail Panel

- Slides in from right, width `480px`
- Background: surface
- Shadow: `xl`
- Header: `64px`, favicon `48px` + name + category badge
- Sections: separated by `1px` border-primary divider
- Field rows: label (font-size `xs`, text-secondary, uppercase tracking `0.05em`) + value + copy button
- Password field: masked by default, reveal on hover/click
- Notes section: max-height `200px`, scrollable, font-size `sm`
- Edit button: primary, top-right, `md` size
- Created/Modified dates: font-size `xs`, text-secondary, bottom of panel

### Search Bar

- Border radius: `full` (pill)
- Height: `40px`
- Background: background-secondary
- Border: none (unfocused), `2px solid` primary (focused)
- Padding: `8px 16px 8px 40px` (icon offset)
- Search icon: `16px`, text-secondary, absolute left `12px`
- Placeholder: "Search vault..." text-secondary
- Keyboard shortcut hint: `Cmd+K` badge right-aligned, font-size `xs`, text-secondary

### Sidebar Category Nav

- Item height: `36px`
- Item padding: `8px 12px 8px 16px`
- Item border-radius: `8px`
- Active: primary background at `10%` opacity, primary text, font-weight `500`
- Hover: background-secondary
- Icon: `18px`, right margin `10px`
- Count badge: right-aligned, font-size `xs`, text-secondary, min-width `20px`, centered

### Security Score Widget

- Border radius: `12px` (lg)
- Padding: `20px`
- Background: surface
- Circular progress ring: `80px` diameter, `6px` stroke
- Ring colors: `strength-strong` (80-100), `strength-medium` (50-79), `strength-weak` (0-49)
- Score number: centered in ring, font-size `2xl`, font-weight `700`
- Label: font-size `sm`, text-secondary, below ring
- Breakdown list: reused passwords, weak passwords, old passwords — font-size `sm`, icon + count

### Encrypted Field Indicator

- Inline icon: `14px` lock icon, encrypted color
- Tooltip: "AES-256 encrypted" on hover
- Position: right of field label
