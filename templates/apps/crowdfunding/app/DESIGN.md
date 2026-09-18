# DESIGN.md — Crowdfunding

## Brand Identity

- **App Name:** Catapult
- **Tagline:** Launch what matters
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Ambitious, energetic, community-minded, credible

## Target Persona

Creators and backers who want a trusted platform to launch campaigns, track momentum, and reward supporters.

## Screens

| Name           | Route                | Auth | Purpose                                                                            | deriveFrom |
| -------------- | -------------------- | ---- | ---------------------------------------------------------------------------------- | ---------- |
| Landing        | /                    | No   | Marketing home with featured campaigns and CTA                                     | —          |
| Login          | /login               | No   | Sign in                                                                            | —          |
| Signup         | /signup              | No   | Create account                                                                     | Login      |
| ForgotPassword | /forgot-password     | No   | Request reset                                                                      | Login      |
| ResetPassword  | /reset-password      | No   | Set new password                                                                   | Login      |
| Discover       | /discover            | Yes  | Browse campaigns with category filters                                             | —          |
| CampaignDetail | /campaign/:id        | Yes  | Campaign page with pledge sidebar and reward tiers                                 | —          |
| Dashboard      | /dashboard           | Yes  | Creator dashboard: stats, active campaigns, updates                                | —          |
| CampaignEditor | /campaign/new        | Yes  | Wizard to create/edit a campaign                                                   | —          |
| Backers        | /backers             | Yes  | List of backers with pledges and rewards                                           | —          |
| Settings       | /settings            | Yes  | Account, payouts, notifications                                                    | —          |
| MyPledges      | /my-pledges          | Yes  | Backer's history of campaigns they've supported, with reward fulfillment status    | —          |
| Profile        | /profile/:userId     | Yes  | Public user profile: creator's campaigns + backer's pledges, bio, follow button    | —          |
| Notifications  | /notifications       | Yes  | Activity feed: new pledges, campaign updates, comments, milestone alerts           | —          |
| PledgeCheckout | /campaign/:id/pledge | Yes  | Pledge confirmation/payment with selected reward summary, shipping, payment method | —          |
| CampaignManage | /campaign/:id/manage | Yes  | Creator-side single-campaign management: analytics, updates composer, backers list | —          |

## App Constraints

- Campaign cards lift on hover (translateY(-2px)) and progress bar color shifts by funded threshold (primary < 80%, accent >= 80%, funded color at 100%)
- Creator dashboard sidebar uses navy (#0f172a) with inverse text — never surface
- Pledge sidebar on campaign detail is sticky at top on scroll, 35% width

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0891b2`
- Primary Hover: `#22d3ee`
- Primary Dark: `#0e7490`
- Accent: `#10b981`
- Accent Hover: `#34d399`
- Accent Dark: `#059669`
- Navy: `#0f172a`
- Navy Light: `#1e293b`

### Semantic

- Funded: `#10b981`
- Funded Light: `#d1fae5`
- Almost There: `#f59e0b`
- Almost There Light: `#fef3c7`
- Campaign Active: `#0891b2`
- Campaign Active Light: `#cffafe`
- Campaign Ended: `#6b7280`
- Campaign Ended Light: `#f3f4f6`
- Stretch Goal: `#8b5cf6`
- Stretch Goal Light: `#ede9fe`

### Backgrounds

- Primary: `#f0f9ff`
- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Campaign Hero: `linear-gradient(135deg, #0f172a 0%, #164e63 100%)`
- Stats Panel: `#f0fdfa`

### Text

- Primary: `#0f172a`
- Secondary: `#64748b`
- Tertiary: `#475569`
- Goal Amount: `#0f172a`
- Pledged Amount: `#0891b2`
- Reward Price: `#0e7490`
- Link: `#0891b2`
- Link Hover: `#0e7490`
- Inverse: `#f0f9ff`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#0891b2`
- Progress Track: `#e2e8f0`

### Dark Theme Overrides

- Primary: `#22d3ee`
- Accent: `#34d399`
- Background: `#0c1222`
- Surface: `#162032`
- Surface Secondary: `#1e293b`
- Text Primary: `#f0f9ff`
- Text Secondary: `#94a3b8`
- Border Primary: `#334155`
- Stats Panel: `#0d2a2a`
- Campaign Hero: `linear-gradient(135deg, #0c1222 0%, #0c4a6e 100%)`

## Typography

### Font Families

- Headings: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Stats: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1200px`
- Campaign Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Campaign Grid Gap: `24px`
- Dashboard Sidebar Width: `260px`
- Dashboard Sidebar Collapsed: `64px`
- Campaign Detail Main: `65%` / Pledge Sidebar: `35%`
- Campaign Detail Gap: `32px`
- Top Bar Height: `56px`
- Hero Section Height: `320px` (campaign detail), `480px` (homepage)

## Components

### Campaign Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md` with `translateY(-2px)` lift
- Transition: `300ms ease`
- Image aspect ratio: `16:9`
- Image border radius: `12px 12px 0 0` (top flush)
- Content padding: `16px`
- Category badge: `6px 12px` padding, `9999px` radius, primary-light background, primary text, `12px` font, `500` weight
- Progress bar height: `6px`, border radius: `9999px`, track: progress-track border color, fill: primary (< 80%), accent (>= 80%), funded color (100%)
- Stats row: flex, space-between, `12px` font, secondary text
- Title: `16px`, `600` weight, max 2 lines with line-clamp
- Creator: `13px`, secondary text, with `20px` avatar circle

### Progress Bar

- Height: `6px` (compact), `10px` (standard), `14px` (hero)
- Border radius: `9999px`
- Track background: progress-track border color
- Fill: primary (0–79%), accent (80–99%), funded (100%+)
- Overflow fill for stretch goals: striped gradient overlay with stretch-goal color
- Transition: `width 500ms ease`
- Percentage label: `600` weight, placed right-aligned above bar

### Reward Tier Card

- Border radius: `12px` (lg)
- Border: `1px solid` border-primary
- Hover border: primary color
- Selected border: `2px solid` primary
- Padding: `20px`
- Price: `24px`, `700` weight, primary-dark color
- Title: `18px`, `600` weight
- Description: `14px`, secondary text, `1.6` line height
- Delivery estimate: `13px`, tertiary text, italic
- Backers count: `13px`, secondary text
- Limited badge: accent background, white text, `12px` font, `9999px` radius
- Sold-out state: `0.5` opacity, strikethrough price, "Sold Out" badge in campaign-ended color

### Pledge Button

- Border radius: `8px` (md)
- Height: `48px` (lg)
- Font weight: `600`
- Font size: `16px`
- Background: primary
- Full width in pledge sidebar
- Hover: primary-hover with `md` shadow
- Disabled (ended campaign): campaign-ended background, no hover

### Campaign Stats Display

- Background: stats-panel
- Border radius: `12px` (lg)
- Padding: `20px`
- Grid: 3 columns, `1px` dividers between
- Stat value: `28px`, `700` weight, navy color
- Stat label: `12px`, `500` weight, secondary text, uppercase, `0.05em` letter-spacing
- Funded percentage uses pledged-amount color

### Backer Avatar Stack

- Avatar size: `32px` circle
- Overlap: `-8px` margin-left (except first)
- Border: `2px solid` surface color
- Max visible: `5`, with `+N` overflow circle in secondary background
- Hover: expand stack with `150ms ease` transition

### Update Card

- Border radius: `12px` (lg)
- Border: `1px solid` border-primary
- Padding: `20px`
- Author row: `32px` avatar, name in `14px` `600` weight, date in `13px` secondary text
- Title: `18px`, `600` weight
- Body: `15px`, `1.65` line height, secondary text
- Image attachments: `8px` radius, `16:9` aspect, `8px` gap grid
- Exclusive badge (backers-only): stretch-goal color background, white text, `12px`, `9999px` radius

### Search Bar

- Border radius: `9999px` (pill)
- Height: `44px`
- Padding: `8px 20px`
- Border: `1px solid` border-primary
- Focus: `2px solid` primary with `2px` offset
- Icon: `18px`, secondary color, `12px` left inset
- Placeholder: `14px`, secondary text

### Category Filter Bar

- Horizontal scroll on mobile
- Chip style: `9999px` radius, `8px 16px` padding, `14px` font, `500` weight
- Default: border-primary border, transparent background
- Active: primary background, inverse text
- Hover: surface-secondary background
- Gap: `8px`

### Dashboard Sidebar Navigation

- Width: `260px`, collapsed: `64px`
- Background: navy
- Text: inverse text, `14px`, `500` weight
- Active item: `4px` left border primary, `rgba(8, 145, 178, 0.12)` background
- Icon size: `20px`
- Item padding: `12px 16px`
- Section label: `11px`, uppercase, `0.06em` spacing, `rgba(255,255,255,0.4)` color
- Hover: `rgba(255,255,255,0.06)` background

### Creator Dashboard Stats

- Grid: `4` columns (desktop), `2` (tablet), `1` (mobile)
- Card: surface background, `12px` radius, `20px` padding, `sm` shadow
- Value: `32px`, `700` weight, navy
- Label: `13px`, secondary text
- Trend indicator: `13px`, `600` weight, funded color (up arrow) or error color (down arrow)
- Sparkline: `48px` height, `2px` stroke, primary color
