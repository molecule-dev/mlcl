# DESIGN.md — AI Customer Service Bot

## Brand Identity

- **App Name:** Rapport
- **Tagline:** Every conversation matters
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Warm, attentive, calm, helpful

## Target Persona

Customer support managers and agents handling customer inquiries with AI-assisted responses and human escalation.

## Screens

| Name                   | Route              | Auth | Purpose                                                                                                                  | deriveFrom |
| ---------------------- | ------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Landing                | /                  | No   | Marketing home with chat demo, warm teal palette, features, pricing                                                      | —          |
| Login                  | /login             | No   | Centered card with teal primary, warm feel                                                                               | —          |
| Signup                 | /signup            | No   | Create account                                                                                                           | Login      |
| ForgotPassword         | /forgot-password   | No   | Request reset                                                                                                            | Login      |
| ResetPassword          | /reset-password    | No   | Set new password                                                                                                         | Login      |
| Dashboard              | /dashboard         | Yes  | Soft teal sidebar, metric cards (resolution rate, CSAT, avg response, escalations today), charts, recent escalations ... | —          |
| Conversations          | /conversations     | Yes  | Three-column: thread list left with unread dots and status, active chat center with rounded bot/user bubbles, custome... | —          |
| ConversationDetail     | /conversations/:id | Yes  | Full chat with escalation banner top, bot/user/agent bubbles, quick-reply chips, input with send button, knowledge su... | —          |
| KnowledgeBase          | /knowledge         | Yes  | Grid of article cards with category badges, confidence scores, helpful/not-helpful votes                                 | —          |
| Analytics              | /analytics         | Yes  | Metric cards with sparklines, CSAT over time line, resolution time trends, top topics bar chart                          | —          |
| Settings               | /settings          | Yes  | Bot configuration, canned responses, integrations (Zendesk, Intercom), API                                               | —          |
| Profile                | /profile           | Yes  | Agent profile with avatar, role, performance stats, working hours, signature, skills, notification prefs                 | —          |
| Notifications          | /notifications     | Yes  | Activity feed of escalations, mentions, assignments, replies, system events with filters and quiet-hours                 | —          |
| KnowledgeArticleDetail | /knowledge/:id     | Yes  | Single article detail with confidence meter, version history, performance, linked conversations, related                 | —          |

## App Constraints

- Chat bubbles use asymmetric radius (16px 4px 16px 16px for user, 4px 16px 16px 16px for bot)
- Escalation banners use orange (#f97316) left border to distinguish agent handoff
- Conversation sidebar lists customer threads with status dots

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0d9488`
- Primary Hover: `#14b8a6`
- Primary Dark: `#0f766e`
- Accent: `#f97316`
- Accent Hover: `#fb923c`
- Accent Dark: `#ea580c`

### Semantic

- Resolved: `#16a34a`
- Resolved Light: `#dcfce7`
- Pending: `#eab308`
- Pending Light: `#fef9c3`
- Escalated: `#f97316`
- Escalated Light: `#fff7ed`
- Confidence High: `#0d9488`
- Confidence Low: `#dc2626`
- Bot Bubble: `#f0fdfa`
- User Bubble: `#0d9488`
- Agent Bubble: `#eff6ff`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafa`
- Chat Area: `#f5f7f7`
- Knowledge Base: `#fafbfc`
- Sidebar: `#f0fdfa`

### Text

- Primary: `#1a2e2b`
- Secondary: `#64748b`
- Bot: `#1a2e2b`
- User: `#ffffff`
- Agent Label: `#1d4ed8`
- Timestamp: `#94a3b8`
- Link: `#0d9488`
- Link Hover: `#0f766e`

### Borders

- Primary: `#e2e8f0`
- Chat Divider: `#e5eded`
- Focus: `#0d9488`

### Dark Theme Overrides

- Primary: `#2dd4bf`
- Accent: `#fb923c`
- Background: `#0c1917`
- Surface: `#1a2f2b`
- Surface Secondary: `#1e3330`
- Chat Area: `#111f1d`
- Bot Bubble: `#1a2f2b`
- User Bubble: `#0d9488`
- Agent Bubble: `#1e293b`
- Text Primary: `#f0fdfa`
- Text Secondary: `#94a3b8`
- Border Primary: `#2d4a45`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Chat: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Mono (code/article IDs): `"JetBrains Mono", SFMono-Regular, Menlo, monospace`

## Layout

- Content Max Width: `960px`
- Chat Panel Width: `100%` (main area, max `720px` centered)
- Sidebar Width: `300px` (conversation list / knowledge base nav)
- Sidebar Collapsed: `64px`
- Message Max Width: `75%` of chat panel
- Input Area Height: `64px` (min), auto-grow to `160px` (max)
- Knowledge Base Grid: `3` columns (desktop), `2` (tablet), `1` (mobile)
- Analytics Dashboard Grid: `12` columns, `24px` gap

## Components

### Chat Bubble — Bot

- Border radius: `4px 16px 16px 16px`
- Background: bot-bubble
- Padding: `12px 16px`
- Font size: `base` (16px)
- Max width: `75%`
- Shadow: none
- Typing indicator: three pulsing dots, `6px` each, primary color, `200ms` stagger

### Chat Bubble — User

- Border radius: `16px 4px 16px 16px`
- Background: user-bubble (primary)
- Text color: `#ffffff`
- Padding: `12px 16px`
- Font size: `base` (16px)
- Max width: `75%`
- Alignment: right

### Chat Bubble — Agent (Escalated)

- Border radius: `4px 16px 16px 16px`
- Background: agent-bubble
- Border-left: `3px solid #3b82f6`
- Padding: `12px 16px`
- Agent label: `12px`, `600` weight, agent-label color, above message

### Chat Input

- Border radius: `24px`
- Border: `2px solid` border-primary, focus: primary
- Height: `48px` (single line), auto-grows
- Padding: `12px 56px 12px 20px`
- Send button: `36px` circle, primary background, right-inset `6px`
- Attachment icon: `20px`, secondary color, left of send
- Placeholder: `"Ask anything..."`, secondary text color

### Conversation List Item

- Border radius: `8px`
- Padding: `12px 16px`
- Active: sidebar background with `3px` left border primary
- Hover: surface-secondary
- Unread indicator: `8px` circle, primary color, right side
- Status dot: `8px`, bottom-right of avatar — resolved (green), pending (amber), escalated (orange)
- Timestamp: `12px`, timestamp color, right-aligned
- Preview text: single line, ellipsis, secondary color

### Knowledge Base Article Card

- Border radius: `12px`
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Border: `1px solid` border-primary
- Category badge: pill, `10px` font, primary tint background
- Confidence score: `12px`, mono font, right-aligned — high (primary), low (error)
- Helpful/not helpful: thumb icons, `20px`, ghost buttons

### Escalation Banner

- Border radius: `8px`
- Background: escalated-light
- Border-left: `4px solid` escalated
- Padding: `12px 16px`
- Icon: `20px` alert-circle, escalated color
- Font weight: `500`
- Action button: `sm` size, accent solid

### Status Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `12px`
- Font weight: `600`
- Variants:
  - Resolved: resolved color on resolved-light background
  - Pending: pending color on pending-light background
  - Escalated: escalated color on escalated-light background
  - Active: primary color on bot-bubble background

### Analytics Metric Card

- Border radius: `12px`
- Padding: `24px`
- Border: `1px solid` border-primary
- Metric value: `2xl` (24px), `700` weight, primary text
- Metric label: `sm` (14px), `400` weight, secondary text
- Trend indicator: `14px`, inline — up arrow + resolved color (positive), down arrow + error color (negative)
- Sparkline: `48px` height, primary color stroke, `1.5px` width

### Confidence Meter

- Border radius: `9999px`
- Height: `6px`
- Background: surface-secondary
- Fill: gradient from confidence-low → pending → confidence-high
- Label: `12px`, mono font, right-aligned percentage

### Quick Reply Chips

- Border radius: `9999px` (pill)
- Border: `1px solid` primary
- Background: transparent, hover: bot-bubble
- Padding: `6px 16px`
- Font size: `sm` (14px)
- Font weight: `500`
- Color: primary
- Gap between chips: `8px`
- Wrap: flex-wrap, max `3` rows visible

### Feedback Toast

- Border radius: `12px`
- Shadow: `lg`
- Padding: `16px 20px`
- Background: surface
- Border-left: `4px solid` resolved (success) or escalated (needs improvement)
- Auto-dismiss: `4000ms`
- Position: bottom-center, `24px` from edge
