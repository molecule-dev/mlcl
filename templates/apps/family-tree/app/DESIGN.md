# DESIGN.md — Family Tree

## Brand Identity

- **App Name:** Branches
- **Tagline:** Your family, connected
- **Logo:** Tree glyph (three-generation node graph) in brand green
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

Warm, grounded, archival. Reads like a careful family historian, not a database.

## Target Persona

Family historians who want to start with themselves and grow outward — parents, partners,
children — without wading through enterprise genealogy tooling.

## Screens

| Name           | Route                    | Auth | Purpose                                                                   |
| -------------- | ------------------------ | ---- | ------------------------------------------------------------------------- |
| Landing        | /                        | No   | Marketing home with a mini tree preview and privacy band                  |
| Login          | /login                   | No   | Sign in                                                                   |
| Signup         | /signup                  | No   | Create account                                                            |
| ForgotPassword | /forgot-password         | No   | Request reset                                                             |
| ResetPassword  | /reset-password          | No   | Set new password                                                          |
| Pricing        | /pricing                 | No   | Free / Pro / Family tiers                                                 |
| About          | /about                   | No   | Mission + feature list                                                    |
| Privacy        | /privacy                 | No   | Legal (shared legal-page component)                                       |
| Terms          | /terms                   | No   | Legal (shared legal-page component)                                       |
| Tree           | /tree                    | Yes  | Signature screen — navigable generational tree, pan/zoom, re-root         |
| People         | /people                  | Yes  | Searchable directory with birth/death years                               |
| PersonDetail   | /people/:id              | Yes  | Bio + relatives grouped by relation + life timeline                       |
| AddPerson      | /people/new              | Yes  | Create a standalone person                                                |
| EditPerson     | /people/:id/edit         | Yes  | Edit biographical fields                                                  |
| AddRelative    | /people/:id/add-relative | Yes  | Relation picker (parent/partner/child/sibling) + implicit-inverse linking |
| Settings       | /settings                | Yes  | Account, 2FA, devices, export, danger zone                                |
| PlanUpdated    | /plan-updated            | Yes  | Post-checkout confirmation (shared component)                             |

## App Constraints

- Person names on tree cards and profile headers use the archival serif (`--mol-font-tree`)
- Years always `tabular-nums`; deceased people carry a `†` marker next to the name
- Only `parent` and `partner` edges are stored; children/siblings are DERIVED — never draw a stored "child" edge
- Tree connectors: elbow path for parent links (solid, `--color-tree-connector`), straight horizontal line for partner links (dashed, `--color-tree-partner`)

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#15803d` (forest green)
- Primary Hover: `#16a34a`
- Primary Dark: `#166534`
- CTA Gradient: `linear-gradient(135deg, #15803d, #65a30d)`
- Accent: `#b45309` (archival amber)
- Accent Hover: `#d97706`
- Accent Dark: `#92400e`

### Semantic (tree roles)

- Root / Parent: `#15803d` / bg `#dcfce7`
- Partner: `#b45309` / bg `#fef3c7`
- Sibling: `#0f766e` / bg `#ccfbf1`
- Child: `#6d28d9` / bg `#ede9fe`
- Deceased: `#6b7280` / bg `#f3f4f6`
- Connector: `#94a3b8`

### Backgrounds

- Surface: `#ffffff`
- Background: `#f2fbf4` (soft green-tinted near-white)

### Dark Theme Overrides

- Primary accent: `#4ade80`
- Background: `#0c1310`
- Surface: `#121b16`
- Connector: `#475569`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Names / headings on tree: `Georgia, 'Iowan Old Style', 'Palatino Linotype', serif` (`--mol-font-tree`)
- Headline (shared pricing/plan pages): `var(--font-headline)` (same serif)

### Font Features

- Years and dates: `font-variant-numeric: tabular-nums` for aligned columns

## Layout

- Tree canvas: full content width, `70vh`, pan (pointer drag) + zoom (0.4–1.6, toolbar buttons)
- Card grid: `CARD_W 176px + GAP_X 40px` per column slot; `CARD_H 132px + GAP_Y 84px` per generation row
- Directory grid: 1 col mobile / 2 sm / 3 xl
- Detail page: 2/3 bio+timeline, 1/3 relatives rail
- Sidebar nav: Tree, People, Settings

## Components

### PersonCard

- Two variants: `tree` (compact node card, 176px, centered) and `list` (directory row, avatar left)
- Initials avatar circle (root card: solid `--color-tree-root` fill + white initials)
- Name in archival serif; `†` when a death date exists; years line `1938 – 2016`
- Whole card links to `/people/:id`; `data-mol-id="person-card-<id>"`

### LifeTimeline

- Vertical timeline, left gutter date (month + year), colored node per event kind
- Kind colors: birth green, partnership amber, child violet, death grey
- Undated events (partnerships) sort last

### Relation picker (AddRelative)

- 2×2 radio cards: Parent / Partner / Child / Sibling, each with icon + implicit-inverse help copy
- Selected card: primary border + ring
