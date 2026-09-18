# DESIGN.md — Banking Dashboard

## Brand Identity

- **App Name:** Meridian
- **Tagline:** Money in motion, always clear
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Trustworthy, composed, precise, institutional

## Target Persona

Professionals and households managing multiple accounts who need a clear, calm view of balances, transfers, and statements without the clutter of legacy banking apps.

## Screens

| Name           | Route            | Auth | Purpose                                                                         | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home page                                                             | —          |
| Login          | /login           | No   | Sign in                                                                         | —          |
| Signup         | /signup          | No   | Create account                                                                  | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                   | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                | Login      |
| Dashboard      | /dashboard       | Yes  | Balances, stats, recent activity overview                                       | —          |
| Accounts       | /accounts        | Yes  | All linked accounts with balances and status                                    | —          |
| AccountDetail  | /accounts/:id    | Yes  | Single account with chart and transactions                                      | —          |
| Transfers      | /transfers       | Yes  | Move money between accounts or recipients                                       | —          |
| Statements     | /statements      | Yes  | Downloadable PDF statements by period                                           | —          |
| AuditLog       | /audit           | Yes  | Security events and account activity log                                        | —          |
| Settings       | /settings        | Yes  | Profile, security, notifications, linked accounts                               | —          |
| Notifications  | /notifications   | Yes  | Inbox of transaction alerts, security events, statements ready, system messages | —          |

## App Constraints

- Sidebar uses dark navy (`#0d1b2a`) against a light main canvas — never invert
- All monetary amounts use tabular-nums, positive amounts green, negative red
- Primary CTAs use forest-green primary (`#0d4f3c`); accent blue (`#1a73e8`) is link-only

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0d4f3c`
- Primary Hover: `#10805e`
- Primary Dark: `#093a2c`
- Accent: `#1a73e8`
- Accent Hover: `#4a90e8`
- Accent Dark: `#1558b0`

### Semantic

- Positive: `#0a8754`
- Positive Light: `#d1fae5`
- Negative: `#c4280e`
- Negative Light: `#fde8e4`
- Pending: `#c08b1a`
- Pending Light: `#fef3c7`
- Frozen: `#6b7280`
- Frozen Light: `#f3f4f6`

### Backgrounds

- Primary: `#f4f6f8`
- Secondary: `#edf0f4`
- Surface: `#ffffff`
- Surface Secondary: `#f8f9fb`
- Sidebar: `#0d1b2a`
- Sidebar Hover: `#1b2d44`

### Text

- Primary: `#111827`
- Secondary: `#6b7280`
- Amount Positive: `#0a8754`
- Amount Negative: `#c4280e`
- Amount Neutral: `#111827`
- Link: `#1a73e8`
- Link Hover: `#1558b0`
- Sidebar: `#cbd5e1`
- Sidebar Active: `#ffffff`

### Borders

- Primary: `#e2e6ec`
- Secondary: `#d1d5db`
- Focus: `#1a73e8`
- Card Divider: `#f0f0f0`

### Dark Theme Overrides

- Primary: `#34d399`
- Accent: `#60a5fa`
- Background: `#0b1120`
- Surface: `#141e33`
- Surface Secondary: `#1a2740`
- Sidebar: `#070d18`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Amount Positive: `#34d399`
- Amount Negative: `#f87171`
- Border Primary: `#1e3048`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", "SF Mono", Menlo, Monaco, Consolas, monospace`
- Amount: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

### Font Weights

- Balance Display: `700`
- Amount: `600`
- Table Header: `600`
- Label: `500`

## Layout

- Content Max Width: `1440px`
- Sidebar Width: `260px` (collapsed: `72px`)
- Top Bar Height: `64px`
- Dashboard Grid Columns: `12`
- Dashboard Grid Gap: `24px`
- Stat Card Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Transaction List Max Width: `960px`
- Right Panel Width: `360px` (account details, notifications)

## Components

### Account Card

- Border radius: `16px` (xl)
- Shadow: `0 2px 8px rgba(0, 0, 0, 0.06)`
- Hover shadow: `0 4px 16px rgba(0, 0, 0, 0.1)`
- Padding: `24px`
- Balance font size: `2xl` (24px)
- Balance font weight: `700`
- Account number font: mono, `sm` (14px), secondary text color
- Account type badge: uppercase, `xs` (12px), `600` weight, `4px` radius
- Accent stripe: `4px` left border, primary color (checking), accent color (savings), pending color (credit)

### Stat Widget

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Label: `sm` (14px), `500` weight, secondary text
- Value: `xl` (20px), `700` weight, primary text
- Trend indicator: `xs` (12px), `600` weight, positive/negative color with `▲`/`▼` prefix
- Icon: `20px`, muted, top-right corner

### Transaction Row

- Padding: `14px 20px`
- Border bottom: `1px solid` card-divider
- Hover: surface-secondary background
- Merchant icon: `40px` circle, surface-secondary background, `12px` icon
- Merchant name: `sm` (14px), `500` weight
- Category: `xs` (12px), secondary text
- Amount: `sm` (14px), `600` weight, tabular-nums, right-aligned
- Amount color: positive for credits, negative for debits
- Date: `xs` (12px), secondary text, right-aligned below amount
- Status dot: `8px` circle — positive (completed), pending (processing), negative (failed)

### Transfer Form

- Border radius: `12px` (lg)
- Padding: `24px`
- Input height: `48px` (lg)
- Input border radius: `8px`
- Amount input: `3xl` (30px), `700` weight, center-aligned, no border, underline style
- Currency symbol: `lg` (18px), `500` weight, secondary text, inline prefix
- Account selector: card-style dropdown with account name + masked number + balance
- Submit button: full width, `48px` height, primary background, `600` weight

### Balance Chart

- Border radius: `12px` (lg)
- Padding: `24px`
- Chart height: `240px`
- Line color: primary
- Fill: primary at `0.08` opacity gradient to transparent
- Grid lines: `1px solid` card-divider
- Axis labels: `xs` (12px), secondary text, tabular-nums
- Tooltip: `8px` radius, surface background, `md` shadow, `12px 16px` padding
- Period selector: pill buttons, `sm` (14px), `8px 16px` padding, active = primary bg + inverse text

### Statement Row

- Padding: `16px 20px`
- Border bottom: `1px solid` card-divider
- Hover: surface-secondary background
- Document icon: `16px`, secondary text
- Period label: `sm` (14px), `500` weight
- File size: `xs` (12px), secondary text
- Download button: ghost variant, accent color, `sm` size

### Sidebar Navigation

- Background: sidebar color
- Active item: `4px` left border primary, sidebar-hover background, sidebar-active text
- Hover item: sidebar-hover background
- Icon size: `20px`
- Item padding: `12px 20px`
- Section label: `xs` (12px), `600` weight, uppercase, `0.05em` letter-spacing, secondary sidebar text
- Section spacing: `32px`
- User avatar: `36px` circle, bottom of sidebar
- Collapsed: icons only, `48px` item height, centered

### Notification Bell

- Icon size: `20px`
- Badge: `18px` circle, negative background, inverse text, `xs` (11px), `700` weight
- Badge position: top-right, `-4px` offset
- Dropdown width: `380px`
- Dropdown max height: `480px`, scrollable
- Notification item padding: `14px 16px`
- Unread indicator: `8px` circle, accent color, left side

### Audit Log Table

- Header: `sm` (14px), `600` weight, uppercase, `0.04em` letter-spacing, secondary text
- Cell padding: `12px 16px`
- Row height: `48px`
- Alternating rows: surface / surface-secondary
- Action badge: `4px` radius, `xs` (12px), `500` weight
- Action colors: accent (login), positive (transfer), pending (settings), negative (failed)
- Timestamp: mono font, `xs` (12px), secondary text
- IP address: mono font, `xs` (12px), secondary text

### Report Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Thumbnail: `100%` width, `160px` height, surface-secondary background, chart preview
- Title: `sm` (14px), `600` weight
- Description: `xs` (12px), secondary text, 2-line clamp
- Date range: `xs` (12px), secondary text, mono
- Generate button: outline variant, accent color, `sm` size, full width
