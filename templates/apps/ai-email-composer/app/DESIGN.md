# DESIGN.md — AI Email Composer

## Brand Identity

- **App Name:** Signet
- **Tagline:** Every word, perfected
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Refined, composed, thoughtful, elegant

## Target Persona

Professionals composing high-stakes emails (sales, recruiting, executive communication) with AI writing assistance.

## Screens

| Name           | Route            | Auth | Purpose                                                                                                                                | deriveFrom |
| -------------- | ---------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with email template previews, purple-gold palette, features, pricing                                                    | —          |
| Login          | /login           | No   | Centered card with purple primary                                                                                                      | —          |
| Signup         | /signup          | No   | Create account                                                                                                                         | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                                                                          | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                                                                       | Login      |
| Dashboard      | /dashboard       | Yes  | Sidebar with folders and templates, top bar, stats cards (sent, drafts, scheduled, open rate), recent sent list with ...               | —          |
| Inbox          | /inbox           | Yes  | Folder sidebar left, email list center with sender/subject/snippet/timestamp/badges, preview pane right                                | —          |
| Compose        | /compose         | Yes  | Folder sidebar, compose panel center with To/Subject/Body (serif Georgia), AI suggestion panel right with tone select...               | —          |
| Templates      | /templates       | Yes  | Sidebar, grid of template cards with categories (sales, recruiting, exec) and preview snippets                                         | —          |
| Analytics      | /analytics       | Yes  | Sidebar, open/reply/click rates, tone effectiveness bar chart, template performance table                                              | —          |
| Settings       | /settings        | Yes  | Sidebar, signature editor, tone preferences, integrations                                                                              | —          |
| Profile        | /profile         | Yes  | User profile/public identity: avatar, bio in Georgia serif, signature preview, tone profile chips, recent activity, connected accounts | —          |
| Billing        | /billing         | Yes  | Current plan card with gold accent, plan comparison row, payment method, billing history table, enterprise contact CTA                 | —          |

## App Constraints

- Email body compose area uses Georgia serif font for readability
- Tone indicators (Formal/Casual/Urgent) use distinct semantic colors
- AI suggestion panel uses purple accent background (#f3f1fb)

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#5B4FCF`
- Primary Hover: `#7068DB`
- Primary Dark: `#4A3FB8`
- Accent: `#D4A843`
- Accent Hover: `#E0BC5E`
- Accent Dark: `#B8923A`

### Semantic

- Sent: `#16a34a`
- Sent Light: `#dcfce7`
- Draft: `#d97706`
- Draft Light: `#fef3c7`
- Scheduled: `#2563eb`
- Scheduled Light: `#dbeafe`
- Bounced: `#dc2626`
- Bounced Light: `#fee2e2`
- AI Generated: `#8b5cf6`
- AI Generated Light: `#ede9fe`
- Tone Formal: `#1e40af`
- Tone Casual: `#0d9488`
- Tone Urgent: `#dc2626`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8f7fc`
- Compose Area: `#ffffff`
- Template Card: `#faf9fe`
- AI Panel: `#f3f1fb`

### Text

- Primary: `#1e1b3a`
- Secondary: `#6b6894`
- Subject Line: `#1e1b3a`
- Snippet: `#6b6894`
- Timestamp: `#9794b0`
- Link: `#5B4FCF`
- Link Hover: `#4A3FB8`

### Borders

- Primary: `#e4e2f0`
- Secondary: `#d4d1e8`
- Focus: `#5B4FCF`
- Compose: `#e4e2f0`

### Dark Theme Overrides

- Primary: `#8b7ff0`
- Accent: `#E0BC5E`
- Background: `#0d0b1a`
- Surface: `#1a1730`
- Surface Secondary: `#242040`
- Text Primary: `#f0eef8`
- Text Secondary: `#9794b0`
- Border Primary: `#2e2a4a`
- AI Panel: `#1e1a38`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Compose: `"Georgia", "Times New Roman", serif` (email body editing — serif for readability and a composed feel)
- UI: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, monospace` (HTML source view)

## Layout

- Content Max Width: `1200px`
- Sidebar Width: `280px` (folders, labels, templates)
- Sidebar Collapsed Width: `64px`
- Compose Panel Min Width: `600px`
- AI Suggestion Panel Width: `320px`
- Template Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Template Grid Gap: `20px`
- Email List Item Height: `72px`
- Compose Editor Min Height: `400px`
- Top Bar Height: `56px`

## Components

### Compose Editor

- Border radius: `12px` (lg)
- Border: `1px solid` compose border
- Background: compose-area
- Padding: `24px`
- Subject input font size: `xl` (20px)
- Subject input font weight: `600`
- Body font family: compose (serif)
- Body font size: `base` (16px)
- Body line height: `1.75` (relaxed)
- Toolbar border-bottom: `1px solid` border-primary
- Toolbar padding: `8px 16px`
- Toolbar icon size: `20px`
- Toolbar icon gap: `4px`

### AI Suggestion Panel

- Border radius: `12px` (lg)
- Background: ai-panel
- Border-left: `3px solid` ai-generated color
- Padding: `20px`
- Shadow: `sm`
- Suggestion chip border radius: `9999px` (pill)
- Suggestion chip padding: `6px 14px`
- Suggestion chip font size: `sm` (14px)
- Suggestion chip font weight: `500`
- Suggestion chip background: `#ede9fe`
- Suggestion chip active background: primary

### Tone Selector

- Border radius: `9999px` (pill, segmented control)
- Height: `36px`
- Segment padding: `6px 16px`
- Segment font size: `sm` (14px)
- Segment font weight: `500`
- Active segment background: primary
- Active segment text: inverse (white)
- Inactive segment background: transparent
- Inactive segment text: secondary
- Outer border: `1px solid` border-primary
- Tone options: Formal (blue icon), Friendly (teal icon), Concise (gray icon), Persuasive (amber icon), Urgent (red icon)

### Email Template Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Border: `1px solid` border-primary
- Background: template-card
- Padding: `20px`
- Template name font size: `base` (16px)
- Template name font weight: `600`
- Template preview font size: `sm` (14px)
- Template preview color: secondary text
- Template preview max lines: `3` (line-clamp)
- Category badge: pill, `xs` font, `500` weight, ai-generated-light background
- Hover: translateY `-2px`, shadow `md`
- Transition: normal (300ms)

### Draft List Item

- Height: `72px`
- Padding: `12px 20px`
- Border-bottom: `1px solid` border-primary
- Sender/recipient font size: `sm` (14px)
- Sender/recipient font weight: `600`
- Subject font size: `sm` (14px)
- Subject font weight: `500`
- Snippet font size: `sm` (14px)
- Snippet color: secondary text
- Timestamp font size: `xs` (12px)
- Timestamp color: timestamp text
- Unread indicator: `8px` circle, primary color
- Hover background: surface-secondary
- Status dot: `8px`, color matches semantic status
- AI badge: tiny pill, `10px` font, ai-generated background

### Send Button

- Border radius: `8px` (md)
- Height: `44px`
- Min width: `120px`
- Font weight: `600`
- Font size: `base` (16px)
- Background: primary
- Icon: paper-plane, `18px`, left of label
- Shadow: `0 2px 8px rgba(91, 79, 207, 0.3)`
- Hover shadow: `0 4px 12px rgba(91, 79, 207, 0.4)`
- Disabled: `0.5` opacity, no shadow
- Schedule variant: outline style, scheduled color border

### Recipient Input

- Border radius: `8px` (md)
- Height: `40px`
- Chip (added recipient) border radius: `9999px` (pill)
- Chip padding: `4px 10px`
- Chip font size: `sm` (14px)
- Chip background: surface-secondary
- Chip remove icon: `14px`, secondary text color
- Autocomplete dropdown shadow: `lg`
- Autocomplete item padding: `10px 16px`
- Autocomplete item hover: surface-secondary

### Folder Sidebar

- Width: `280px`
- Padding: `16px 12px`
- Section label font size: `xs` (12px)
- Section label font weight: `600`
- Section label text-transform: `uppercase`
- Section label letter-spacing: `0.05em`
- Section label color: secondary text
- Folder item padding: `10px 16px`
- Folder item border radius: `8px` (md)
- Folder item font size: `sm` (14px)
- Folder item active background: `rgba(91, 79, 207, 0.08)`
- Folder item active text: primary
- Folder item active font weight: `600`
- Folder item icon size: `18px`
- Unread count badge: pill, `xs` font, `600` weight, primary background, inverse text
