# DESIGN.md — Contract Management

## Brand Identity

- **App Name:** Vellum
- **Tagline:** Seal every deal
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Authoritative, precise, formal, trustworthy

## Target Persona

Legal ops, procurement, and business leaders who draft, send, sign, and audit contracts and need a clean, defensible record of every change and signature.

## Screens

| Name           | Route            | Auth | Purpose                                                                                       | deriveFrom |
| -------------- | ---------------- | ---- | --------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with value props and signup CTA                                                | —          |
| Login          | /login           | No   | Sign in                                                                                       | —          |
| Signup         | /signup          | No   | Create account                                                                                | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                                 | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                              | Login      |
| Dashboard      | /dashboard       | Yes  | Status tiles, expiring soon, pending signature, recent activity                               | —          |
| Contracts      | /contracts       | Yes  | Sortable/filterable data table of all contracts                                               | —          |
| ContractDetail | /contracts/:id   | Yes  | Document viewer, signature blocks, audit log, signing panel                                   | —          |
| Templates      | /templates       | Yes  | Browse and launch contract templates                                                          | —          |
| Settings       | /settings        | Yes  | Account, signatures, team, notifications                                                      | —          |
| NewContract    | /contracts/new   | Yes  | Multi-step wizard to launch a contract from a template (template, parties, variables, review) | —          |
| TemplateEditor | /templates/:id   | Yes  | Clause-by-clause template editor with variable placeholders, version history, preview         | —          |
| Counterparties | /counterparties  | Yes  | Directory of organizations and individual signatories across the portfolio                    | —          |
| Reports        | /reports         | Yes  | Portfolio analytics — throughput, value, cycle time, renewal pipeline                         | —          |
| Notifications  | /notifications   | Yes  | Cross-portfolio activity feed of contract events (sent, viewed, signed, expiring, mentions)   | —          |

## App Constraints

- Dark navy sidebar `#0f1d2f` with gold accent for the active item on all authed screens
- Document viewer centers US-Letter-proportioned content (max 816px) on a muted background with serif body type
- Status badges use the defined semantic palette (Draft/Pending/Active/Expiring/Expired/Voided) and never free-form colors

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#1e3a5f`
- Primary Hover: `#2a5080`
- Primary Dark: `#142a45`
- Accent (Seal Gold): `#c49a2a`
- Accent Hover: `#d4aa3a`
- Accent Dark: `#a47f1a`

### Semantic

- Draft: `#6b7280`
- Draft Light: `#f3f4f6`
- Pending Signature: `#d97706`
- Pending Signature Light: `#fef3c7`
- Active / Executed: `#059669`
- Active Light: `#d1fae5`
- Expiring Soon: `#ea580c`
- Expiring Soon Light: `#fff7ed`
- Expired: `#dc2626`
- Expired Light: `#fee2e2`
- Voided: `#991b1b`
- Voided Light: `#fef2f2`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Document Viewer: `#f1f5f9`
- Sidebar: `#0f1d2f`

### Text

- Primary: `#1e293b`
- Secondary: `#64748b`
- Clause Number: `#94a3b8`
- Signer Name: `#1e3a5f`
- Link: `#1e3a5f`
- Link Hover: `#142a45`

### Borders

- Primary: `#e2e8f0`
- Signature Line: `#94a3b8`
- Focus: `#1e3a5f`

### Dark Theme Overrides

- Primary: `#60a5fa`
- Accent: `#fbbf24`
- Background: `#0b1120`
- Surface: `#1a2332`
- Surface Secondary: `#1e293b`
- Sidebar: `#0b1120`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#334155`
- Document Viewer: `#151d2b`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (weight 600–700)
- Document: `"Source Serif 4", Georgia, "Times New Roman", serif`
- Clause: `"JetBrains Mono", SFMono-Regular, Menlo, monospace` (for clause numbering only)

### Font Weights

- Contract title: `700`
- Section heading: `600`
- Body / clause text: `400`
- Metadata label: `500`
- Signer name: `600`

## Layout

- Content Max Width: `1400px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `24px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Sidebar Background: sidebar color (dark navy)
- Sidebar Text: `#cbd5e1`
- Sidebar Active Item: `rgba(196, 154, 42, 0.15)` background, accent text
- Document Viewer Max Width: `816px` (US Letter proportion)
- Document Viewer Padding: `48px 64px` (desktop), `24px 16px` (mobile)
- Signing Panel Width: `360px` (right drawer)
- Top Bar Height: `56px`

## Components

### Contract Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px 24px`
- Top accent border: `3px solid` status color (draft=gray, active=green, pending=amber, expired=red)
- Title font size: `lg` (18px), weight `600`
- Party names font size: `sm` (14px), color secondary
- Status badge: inline, top-right
- Expiry date: `sm`, color secondary; turns `expiring-soon` when ≤ 30 days

### Status Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `600`
- Text transform: `uppercase`
- Letter spacing: `0.05em`
- Variants:
  - Draft: draft color, draft-light background
  - Pending: pending-signature color, pending-signature-light background
  - Active: active color, active-light background
  - Expiring: expiring-soon color, expiring-soon-light background
  - Expired: expired color, expired-light background
  - Voided: voided color, voided-light background

### Template Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `24px`
- Left accent border: `4px solid` primary
- Icon: `40px` circle, primary-light background, primary icon
- Title font size: `base` (16px), weight `600`
- Description font size: `sm` (14px), color secondary, max 2 lines
- Use count: `xs` (12px), color tertiary

### Document Viewer

- Background: document-viewer color
- Inner surface: `#ffffff`, shadow `md`, border-radius `4px`
- Page padding: `48px 64px`
- Font family: document (serif)
- Body font size: `base` (16px)
- Line height: `1.75` (relaxed)
- Clause numbering: clause font (monospace), `sm` (14px), color clause-number
- Section headings: weight `700`, font size `lg`, margin-top `32px`
- Signature placeholder: dashed bottom border (`2px dashed` signature-line color), `200px` width

### Signature Block

- Border: `1px solid` border-primary
- Border radius: `8px` (md)
- Padding: `24px`
- Background: surface
- Signer name: weight `600`, color signer-name
- Signer role: `sm`, color secondary
- Signature area: `120px` height, dashed border, centered "Sign here" text in secondary color
- Signed state: signature image/text rendered, green checkmark, timestamp below
- Date line: `sm`, color secondary, right-aligned

### Signing Panel (Right Drawer)

- Width: `360px`
- Background: surface
- Shadow: `xl` (left edge)
- Header: `56px`, primary background, white text
- Action buttons stacked vertically, full width
- Sign button: accent (gold) background, primary-dark text, weight `700`, height `48px`
- Decline button: ghost variant, error color text

### Expiry Alert Banner

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border-left: `4px solid`
- Variants:
  - Warning (≤ 30 days): expiring-soon border, expiring-soon-light background
  - Critical (≤ 7 days): expired border, expired-light background
- Icon: `20px`, matching border color
- Dismiss button: ghost, `sm`

### Audit Log Timeline

- Vertical line: `2px solid` border-primary, left-aligned
- Event dot: `10px` circle, color varies by action type
- Event spacing: `24px` vertical
- Timestamp: `xs` (12px), color secondary, monospace
- Actor name: `sm`, weight `600`
- Action text: `sm`, color primary
- Dot colors:
  - Created: primary
  - Sent: pending-signature
  - Viewed: info (`#17a2b8`)
  - Signed: active
  - Expired: expired
  - Voided: voided

### Search & Filter Bar

- Height: `48px`
- Border radius: `8px` (md)
- Background: surface
- Border: `1px solid` border-primary
- Search icon: `20px`, color secondary
- Filter chips: pill shape, `sm` text, secondary background, `md` padding horizontal
- Active filter chip: primary background, inverse text

### Data Table (Contract List View)

- Header background: `#f1f5f9`
- Header font weight: `600`
- Header font size: `xs` (12px), uppercase, letter-spacing `0.05em`
- Row hover: surface-secondary
- Row border: `1px solid` border-primary (bottom only)
- Cell padding: `14px 16px`
- Status column: status badge (see above)
- Actions column: icon buttons, `ghost` variant, `32px` square

### Progress Indicator (Signing Flow)

- Step circles: `32px`, numbered
- Active step: primary background, white text
- Completed step: active (green) background, white checkmark
- Pending step: border-primary border, secondary text
- Connector line: `2px`, border-primary (completed: active color)
- Step label: `sm`, below circle, weight `500`
