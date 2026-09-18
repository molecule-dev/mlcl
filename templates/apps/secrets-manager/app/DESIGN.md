# DESIGN.md — Secrets Manager

## Brand Identity

- **App Name:** Arcanum
- **Tagline:** Secrets die in the open
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight), rendered in monospace with a subtle lock glyph kerned before the "A"
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Disciplined, terminal-sharp, fortified, clinical

## Target Persona

Developers and security engineers managing environment secrets, API keys, and credentials across environments with rotation policies.

## Screens

| Name           | Route            | Auth | Purpose                                                                              | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------------------ | ---------- |
| Landing        | /                | No   | Marketing home with security story                                                   | —          |
| Login          | /login           | No   | Sign in                                                                              | —          |
| Signup         | /signup          | No   | Create account                                                                       | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                        | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                     | Login      |
| Vaults         | /vaults          | Yes  | List of secret vaults                                                                | —          |
| VaultDetail    | /vaults/:id      | Yes  | Vault contents with masked values                                                    | —          |
| SecretDetail   | /secrets/:id     | Yes  | Single secret with rotation timeline                                                 | —          |
| AuditLog       | /audit           | Yes  | Access log with actor, action, timestamp                                             | —          |
| Settings       | /settings        | Yes  | Auth, SSO, rotation policy, team                                                     | —          |
| Rotations      | /rotations       | Yes  | Cross-vault rotation dashboard for triaging expiring/expired/pending secrets         | —          |
| Integrations   | /integrations    | Yes  | Connect external systems (CI/CD, cloud, K8s, secret backends) for sync and rotation  | —          |
| Team           | /team            | Yes  | Workspace members, roles, vault scopes, SSO group mappings, pending invites          | —          |
| ApiTokens      | /api-tokens      | Yes  | Manage personal and service tokens for programmatic API/CLI access                   | —          |
| Notifications  | /notifications   | Yes  | Actionable inbox: rotation due, approvals, anomalous access, compromised secrets     | —          |
| Profile        | /profile         | Yes  | Personal account: identity, 2FA, passkeys, recovery, SSH keys, sessions, preferences | —          |

## App Constraints

- Secret values always masked with reveal-on-hold pattern; copy button uses clipboard mono
- Terminal-inspired typography: mono font throughout for values, IDs, and audit entries
- Dark-first aesthetic for security-gravity feel, emerald primary for "secret is safe" signal

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#00d992`
- Primary Hover: `#33e6ad`
- Primary Dark: `#00b377`
- Accent: `#a78bfa`
- Accent Hover: `#c4b5fd`
- Accent Dark: `#7c3aed`

### Semantic

- Active: `#00d992` (live, valid secret)
- Expiring: `#facc15` (rotation due within threshold)
- Expired: `#f97316` (past rotation deadline)
- Revoked: `#ef4444` (manually revoked or compromised)
- Inherited: `#60a5fa` (pulled from parent environment/scope)
- Masked: `#64748b` (value hidden, read-only display)

### Backgrounds

- Primary: `#0c1222`
- Secondary: `#111a2e`
- Tertiary: `#182338`
- Surface: `#1a2540`
- Surface Secondary: `#1f2d4a`
- Input: `#0f1829`
- Overlay: `rgba(0, 0, 0, 0.7)`
- Code Block: `#0a0f1a`

### Text

- Primary: `#e2e8f0`
- Secondary: `#94a3b8`
- Tertiary: `#64748b`
- Inverse: `#0c1222`
- Link: `#00d992`
- Link Hover: `#33e6ad`
- Key Name: `#e2e8f0` (monospace, medium weight)
- Key Value Masked: `#475569` (rendered as dots)
- Key Value Revealed: `#00d992` (monospace, temporary reveal)

### Borders

- Primary: `#1e3048`
- Secondary: `#293d5a`
- Focus: `#00d992`
- Danger: `#ef4444`

### Dark Theme Overrides

This app defaults to dark. Light theme overrides:

- Primary: `#059669`
- Background: `#f1f5f9`
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Text Primary: `#0f172a`
- Text Secondary: `#475569`
- Border Primary: `#e2e8f0`
- Input: `#ffffff`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono (primary for keys/values/paths): `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Font Size Overrides

- Secret key name: `sm` (14px), monospace, weight `500`
- Secret value (masked): `sm` (14px), monospace, letter-spacing `0.15em`
- Secret path/namespace: `xs` (12px), monospace, secondary text color
- Environment badge: `xs` (12px), weight `600`, uppercase, letter-spacing `0.05em`

## Layout

- Content Max Width: `1400px`
- Default Theme: dark (users may toggle to light)
- Sidebar Width: `260px` (collapsed: `56px`)
- Top Bar Height: `52px`
- Secrets Table Row Height: `52px`
- Detail Panel Width: `480px` (slide-in from right)
- Grid Columns: `1` (secrets are list/table-based, not grid)
- Namespace Tree Indent: `20px` per level

## Components

### Secret Row

- Height: `52px`
- Padding: `0 16px`
- Border bottom: `1px solid` border-primary
- Hover background: surface-secondary
- Key name: monospace, `sm`, weight `500`, text-primary
- Value: masked by default — `"xxxxxxxxxx"` in monospace, masked color
- Reveal on click: value fades in (`150ms`) in key-value-revealed color, auto-hides after `5s`
- Status dot: `8px` circle, left of key name, color matches semantic status
- Copy button: ghost icon button, appears on row hover, right-aligned
- Last rotated: `xs`, secondary text, right-aligned

### Namespace Tree (Sidebar)

- Indent per level: `20px`
- Folder icon: `16px`, secondary color
- Active node: primary background at `10%` opacity, primary text, left border `3px solid` primary
- Expand/collapse: chevron icon, `150ms` rotation transition
- Font: monospace, `sm`
- Path separator: `/` rendered in tertiary text color

### Environment Switcher

- Pill-style segmented control in the top bar
- Options: `DEV`, `STAGING`, `PROD` (or custom)
- Active pill: primary background, inverse text, weight `600`
- Inactive pill: transparent, secondary text
- PROD pill has `2px` left border in revoked (red) color as a caution indicator
- Border radius: `6px` per pill, `8px` outer container
- Height: `32px`
- Font: `xs`, uppercase, letter-spacing `0.05em`

### Secret Detail Panel

- Slide-in from right, `480px` wide
- Background: surface
- Border-left: `1px solid` border-primary
- Shadow: `lg`
- Header: key name in monospace `lg`, status badge
- Sections: Value, Metadata, Access Log, Rotation Policy — separated by `1px` border-primary dividers
- Section labels: `xs`, uppercase, letter-spacing `0.05em`, secondary text
- Transition: `300ms ease` slide + fade

### Access Control Badge

- Border radius: `4px`
- Padding: `2px 8px`
- Font: `xs`, weight `600`
- Variants:
  - Owner: primary background at `15%` opacity, primary text
  - Admin: accent background at `15%` opacity, accent text
  - Read: secondary background at `15%` opacity, secondary text
  - Write: `#0ea5e9` background at `15%` opacity, `#0ea5e9` text
  - Rotate: expiring background at `15%` opacity, expiring text

### Rotation Policy Card

- Border radius: `8px`
- Border: `1px solid` border-primary
- Padding: `16px`
- Background: code-block background
- Countdown display: monospace `2xl`, primary color, centered
- Progress ring: `64px` diameter, `4px` stroke, primary color, animated
- Labels: `xs`, uppercase, secondary text
- Next rotation: monospace `sm`, primary text

### Audit Log Table

- Header: surface-secondary background, `xs` uppercase text, weight `600`
- Row height: `44px`
- Columns: Timestamp, Actor, Action, Secret Path, IP
- Timestamp: monospace `xs`, tertiary text
- Actor: `sm`, with avatar circle `24px`
- Action verbs: color-coded — `read` (inherited blue), `write` (primary green), `rotate` (expiring yellow), `revoke` (revoked red), `delete` (revoked red)
- Striped: alternating surface/surface-secondary

### Search Bar

- Height: `40px`
- Background: input
- Border: `1px solid` border-primary
- Border radius: `8px`
- Placeholder: `"Search secrets by key, path, or tag..."` in tertiary text
- Icon: magnifying glass, `16px`, secondary color
- Keyboard shortcut hint: `/` badge on right side, `xs` monospace, border-secondary background
- Focus: `2px solid` primary with `2px` offset
- Results: dropdown with monospace key paths, matching text highlighted in primary color

### Confirm Destructive Action Modal

- Border radius: `12px`
- Shadow: `xl`
- Border-top: `4px solid` revoked (red)
- Requires typing the secret name to confirm (input with monospace font, validated character-by-character)
- Confirm button: revoked background, inverse text, disabled until input matches
- Cancel button: ghost variant

### Toast Notifications

- Border radius: `8px`
- Padding: `12px 16px`
- Background: surface
- Border-left: `4px solid` (color matches type: primary for success, expiring for warning, revoked for error)
- Shadow: `lg`
- Font: `sm`
- Auto-dismiss: `4s` for success, `8s` for warnings, persistent for errors
- Position: bottom-right, stacked with `8px` gap

## Design Principles (App-Specific)

1. **Dark by default** — security tools live in dark environments; light mode is the alternate, not the primary
2. **Monospace is meaning** — any value that is machine-readable (keys, paths, values, timestamps) renders in monospace; human-readable labels use sans-serif
3. **Hide first, reveal on intent** — secret values are always masked; revealing requires deliberate action and auto-hides after timeout
4. **Red means danger, not error** — reserve red exclusively for destructive/irreversible states (revoke, delete, compromised); use orange for expired, yellow for expiring
5. **Terminal trust** — the UI should feel like a graphical layer over a CLI, not a consumer app; precision over polish, density over whitespace
