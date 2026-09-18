# DESIGN.md — Customer Support Chat

## Brand Identity

- **App Name:** Liaison
- **Tagline:** Every message matters
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Empathetic, responsive, human, professional

## Target Persona

Support agents and team leads who triage and resolve customer conversations across channels, plus team managers monitoring CSAT and SLAs.

## Screens

| Name               | Route             | Auth | Purpose                                                                                               | deriveFrom |
| ------------------ | ----------------- | ---- | ----------------------------------------------------------------------------------------------------- | ---------- |
| Landing            | /                 | No   | Marketing home highlighting the agent workspace and widget                                            | —          |
| Login              | /login            | No   | Sign in                                                                                               | —          |
| Signup             | /signup           | No   | Create account                                                                                        | Login      |
| ForgotPassword     | /forgot-password  | No   | Request reset                                                                                         | Login      |
| ResetPassword      | /reset-password   | No   | Set new password                                                                                      | Login      |
| Inbox              | /inbox            | Yes  | Three-pane agent workspace with conversation list, chat, and customer panel                           | —          |
| ConversationDetail | /conversation/:id | Yes  | Focused single conversation view                                                                      | —          |
| Contacts           | /contacts         | Yes  | Customer list with filters and CSAT history                                                           | —          |
| Reports            | /reports          | Yes  | Team performance, CSAT, volume analytics                                                              | —          |
| Automations        | /automations      | Yes  | Rules, canned responses, chatbots                                                                     | —          |
| Settings           | /settings         | Yes  | Account, team, widget appearance, integrations                                                        | —          |
| ContactDetail      | /contacts/:id     | Yes  | Full-page customer profile with conversation history, CSAT trend, custom attributes, related contacts | —          |
| Notifications      | /notifications    | Yes  | Notification center for assignments, @mentions, SLA breaches, CSAT, team activity                     | —          |

## App Constraints

- Agent workspace is a three-pane layout (64px icon rail, 340px conversation list, flexible chat panel, 320px customer panel). Chat is dense with compact message grouping.
- Chat bubbles: agent #f0f0ff left-aligned, customer #f3f4f6 right-aligned, bot #faf5ff with bot label, internal note #fefce8 dashed border italic
- Status dots (10px with 2px white ring): online #10b981, away #f59e0b, offline #9ca3af

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#635bff`
- Primary Hover: `#7d77ff`
- Primary Dark: `#4b3fd6`
- Accent: `#06b6d4`
- Accent Hover: `#22d3ee`
- Accent Dark: `#0891b2`

### Semantic

- Online: `#10b981`
- Away: `#f59e0b`
- Offline: `#9ca3af`
- Urgent: `#ef4444`
- Urgent Light: `#fee2e2`
- Bot: `#8b5cf6`
- Bot Light: `#ede9fe`
- Resolved: `#10b981`
- Resolved Light: `#d1fae5`
- Pending: `#f59e0b`
- Pending Light: `#fef3c7`
- Unread: `#635bff`
- CSAT Positive: `#10b981`
- CSAT Neutral: `#f59e0b`
- CSAT Negative: `#ef4444`

### Backgrounds

- Primary: `#f5f3ff`
- Secondary: `#eef2ff`
- Surface: `#ffffff`
- Surface Secondary: `#faf9ff`
- Agent Message: `#f0f0ff`
- Customer Message: `#f3f4f6`
- Bot Message: `#faf5ff`
- Internal Note: `#fefce8`
- Canned Response: `#f0fdfa`
- Widget: `#ffffff`

### Text

- Primary: `#18181b`
- Secondary: `#71717a`
- Tertiary: `#a1a1aa`
- Timestamp: `#a1a1aa`
- Link: `#635bff`
- Link Hover: `#4b3fd6`

### Borders

- Primary: `#e4e4e7`
- Focus: `#635bff`
- Conversation Divider: `#f4f4f5`

### Dark Theme Overrides

- Primary: `#a5b4fc`
- Accent: `#22d3ee`
- Background: `#0c0a1d`
- Surface: `#1a1838`
- Surface Secondary: `#211f45`
- Agent Message: `#1e1b4b`
- Customer Message: `#27272a`
- Bot Message: `#2e1065`
- Internal Note: `#422006`
- Text Primary: `#f4f4f5`
- Text Secondary: `#a1a1aa`
- Border Primary: `#2e2c5a`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Font Sizes

- Message Body: `sm` (14px)
- Timestamp: `xs` (12px)
- Conversation Subject: `base` (16px), weight `600`
- Agent Name: `sm` (14px), weight `600`
- Customer Name: `sm` (14px), weight `600`
- Widget Greeting: `lg` (18px), weight `600`
- Canned Response Label: `sm` (14px), weight `500`
- Bot Label: `xs` (12px), weight `500`, uppercase, `0.05em` tracking

## Spacing

Compact conversation spacing:

- Message Group Gap: `4px` (same sender, within 2 min)
- Message Block Gap: `16px` (different sender or time break)
- Message Padding: `10px 14px`
- Conversation List Item Padding: `12px 16px`

## Layout

- Content Max Width: `1440px`
- Agent Sidebar (navigation): `64px` (icon-only)
- Conversation List Width: `340px`
- Chat Panel: fluid (fills remaining space)
- Customer Detail Panel: `320px`
- Conversation Max Width: `none` (fills chat panel)
- Widget Width: `380px`
- Widget Height: `620px`
- Widget Launcher Size: `56px`
- Widget Border Radius: `16px`
- Widget Launcher Offset: `24px` from bottom-right

## Components

### Conversation List Item

- Height: `72px`
- Padding: `12px 16px`
- Border radius: `0` (flush, divider separated)
- Border bottom: `1px solid` conversation-divider
- Active: primary at `0.08` opacity background, `3px` left border primary
- Unread: `700` weight name, unread dot `8px` primary color
- Hover: surface-secondary background
- Avatar: `36px`, `full` radius
- Status dot: `10px`, bottom-right, `2px` white ring
- Preview text: `xs` (12px), secondary, single line truncated
- Timestamp: `xs` (12px), tertiary, top-right

### Chat Bubble — Agent

- Background: agent-message
- Border radius: `16px`, `4px` top-left
- Padding: `10px 14px`
- Max width: `70%`
- Alignment: left
- Name + avatar above first message in group

### Chat Bubble — Customer

- Background: customer-message
- Border radius: `16px`, `4px` top-right
- Padding: `10px 14px`
- Max width: `70%`
- Alignment: right

### Chat Bubble — Bot

- Background: bot-message
- Border radius: `16px`
- Padding: `10px 14px`
- Max width: `70%`
- Alignment: left
- Bot label: `xs` uppercase, bot color, above bubble
- Bot icon: `16px` inline, bot color

### Internal Note

- Background: internal-note
- Border: `1px dashed` `#e5e7eb`
- Border radius: `8px` (md)
- Padding: `10px 14px`
- Font style: italic
- Label: `xs` (12px), `500` weight, `#92400e` text, "Internal note"

### Canned Response Card

- Background: canned-response
- Border: `1px solid` `#ccfbf1`
- Border radius: `8px` (md)
- Padding: `10px 14px`
- Title: `sm` (14px), `600` weight
- Body preview: `xs` (12px), secondary, 2 lines max
- Hover: `md` shadow, accent border
- Shortcut tag: `xs` mono, `#0d9488` text, pill background `#f0fdfa`

### Agent Avatar

- Sizes: `24px` (inline/list), `36px` (conversation list), `48px` (detail panel)
- Radius: `full` (9999px)
- Status dot: `10px`, `2px` white ring, bottom-right
- Fallback: initials, primary background, inverse text

### Customer Detail Panel

- Width: `320px`
- Header: `48px` avatar, name `base` `600`, email `xs` secondary
- Sections: collapsible, `24px` between sections
- Section title: `xs` (12px), uppercase, `0.05em` tracking, tertiary
- Property label: `xs` (12px), secondary
- Property value: `sm` (14px), primary
- Divider: `1px solid` border-primary, `16px` vertical margin

### Widget Launcher

- Size: `56px` circle
- Background: primary
- Shadow: `lg`
- Icon: `24px`, inverse (white)
- Hover: primary-hover, `xl` shadow
- Transition: `300ms ease` (scale `1.05` on hover)
- Unread badge: `18px` circle, urgent, inverse text, `600` weight, top-right `-4px` offset

### Widget Header

- Height: `64px`
- Background: primary
- Text: inverse (white), `lg` weight `600`
- Close button: inverse, `32px` touch target
- Border radius: `16px 16px 0 0` (matches widget container)

### Quick Reply Chip

- Border radius: `full` (pill)
- Padding: `6px 14px`
- Border: `1px solid` primary
- Font size: `sm` (14px), weight `500`
- Color: primary text
- Hover: primary background, inverse text
- Spacing: `8px` gap, horizontal wrap

### Typing Indicator

- Three dots animation: `400ms` stagger
- Dot size: `6px`
- Color: secondary text
- Container: same as chat bubble (matches sender type)
- Label: `xs` (12px), secondary, "{name} is typing…"

### Satisfaction Rating

- Star/emoji size: `28px`
- Spacing: `8px` gap
- Selected: `1.15` scale, `150ms` ease
- Prompt text: `sm` (14px), secondary, centered
- Container: `md` radius, surface-secondary, `16px` padding

### Search Bar

- Height: `40px`
- Border radius: `full` (pill)
- Background: surface-secondary
- Border: `1px solid` transparent, focus: border-focus
- Icon: `16px`, secondary, left `12px`
- Padding: `8px 12px 8px 36px`
- Placeholder: tertiary text

### Notification Badge

- Size: `18px` min, auto-width with `4px` horizontal padding
- Border radius: `full` (pill)
- Background: urgent
- Font: `xs` (12px), `600`, inverse
- Position: top-right, `-6px` offset from parent
