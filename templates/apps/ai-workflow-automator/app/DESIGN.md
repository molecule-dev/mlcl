# DESIGN.md — AI Workflow Automator

## Brand Identity

- **App Name:** Dendrite
- **Tagline:** Intelligence in motion
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Precise, flowing, automated, empowering

## Target Persona

Operations teams and power users building automated workflows with triggers, conditions, and actions.

## Screens

| Name            | Route            | Auth | Purpose                                                                                                                  | deriveFrom |
| --------------- | ---------------- | ---- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Landing         | /                | No   | Marketing home with workflow animation, purple-cyan palette, features, pricing                                           | —          |
| Login           | /login           | No   | Centered card with purple primary                                                                                        | —          |
| Signup          | /signup          | No   | Create account                                                                                                           | Login      |
| ForgotPassword  | /forgot-password | No   | Request reset                                                                                                            | Login      |
| ResetPassword   | /reset-password  | No   | Set new password                                                                                                         | Login      |
| Dashboard       | /dashboard       | Yes  | Dark indigo sidebar, metric cards (runs today, success rate, active workflows), workflow list with status indicators,... | —          |
| WorkflowBuilder | /workflows/:id   | Yes  | Dark sidebar, canvas center with dotted grid and flowchart nodes (trigger purple, condition cyan, action green) conne... | —          |
| Executions      | /executions      | Yes  | Dark sidebar, table of executions with workflow name, status badge, duration, started time, filters                      | —          |
| ExecutionDetail | /executions/:id  | Yes  | Dark sidebar, step-by-step trace with node states, input/output JSON blocks, logs per step                               | —          |
| Templates       | /templates       | Yes  | Dark sidebar, gallery of workflow template cards by category with node count and trigger type                            | —          |
| TemplateDetail  | /templates/:id   | Yes  | Dark sidebar, full template preview with mini canvas of nodes, description, required connections, install button         | —          |
| Workflows       | /workflows       | Yes  | Dark sidebar, table/grid of all workflows with status, last run, owner, tags, search/filter                              | —          |
| Connections     | /connections     | Yes  | Dark sidebar, grid of available integrations with connection status, OAuth/API key configured indicator                  | —          |
| Notifications   | /notifications   | Yes  | Dark sidebar, activity feed grouped by date with workflow run alerts, mention badges, failure highlights                 | —          |
| Billing         | /billing         | Yes  | Dark sidebar, current plan card, usage meters (runs/month, active workflows), upgrade tiers, invoice history             | —          |

## App Constraints

- Workflow canvas shows dotted grid background with node connections
- Triggers are purple, conditions are cyan, actions are green (#16a34a)
- Dark indigo sidebar (#1e1b4b)

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#7c3aed`
- Primary Hover: `#8b5cf6`
- Primary Dark: `#6d28d9`
- Accent: `#06b6d4`
- Accent Hover: `#22d3ee`
- Accent Dark: `#0891b2`

### Semantic

- Running: `#06b6d4`
- Running Light: `#cffafe`
- Completed: `#16a34a`
- Completed Light: `#dcfce7`
- Failed: `#dc2626`
- Failed Light: `#fee2e2`
- Queued: `#f59e0b`
- Queued Light: `#fef3c7`
- Paused: `#6b7280`
- Paused Light: `#f3f4f6`
- Skipped: `#94a3b8`
- Skipped Light: `#f1f5f9`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8f7ff`
- Canvas: `#faf9fe`
- Canvas Dot: `#e2e0ef`
- Sidebar: `#1e1b4b`
- Sidebar Hover: `#312e81`

### Text

- Primary: `#1e1b4b`
- Secondary: `#6b7280`
- Sidebar: `#e0e7ff`
- Sidebar Active: `#ffffff`
- Trigger: `#7c3aed`
- Condition: `#06b6d4`
- Action: `#16a34a`
- Link: `#7c3aed`
- Link Hover: `#6d28d9`

### Borders

- Primary: `#e5e7eb`
- Canvas Node: `#d8d5f0`
- Focus: `#7c3aed`
- Connection: `#a78bfa`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#22d3ee`
- Background: `#0c0a1d`
- Surface: `#1a1735`
- Surface Secondary: `#231f4a`
- Canvas: `#13112b`
- Canvas Dot: `#2e2a5a`
- Sidebar: `#0c0a1d`
- Text Primary: `#f0eeff`
- Text Secondary: `#a5a2c8`
- Border Primary: `#2e2a5a`
- Connection: `#7c3aed`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Node Label: `"Inter", -apple-system, sans-serif` (font-weight: 600)

## Layout

- Content Max Width: `1440px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `24px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Sidebar Background: sidebar color (dark indigo)
- Canvas Min Height: `600px`
- Canvas Grid Size: `20px`
- Node Width: `280px`
- Node Min Height: `80px`
- Right Panel Width: `360px` (node inspector / run detail)
- Top Bar Height: `56px`

## Components

### Workflow Node (Trigger)

- Border radius: `12px` (lg)
- Border: `2px solid #7c3aed`
- Background: `#f5f3ff`
- Shadow: `sm`, selected: `0 0 0 3px rgba(124, 58, 237, 0.25)`
- Width: `280px`
- Icon container: `36px` circle, primary background, white icon
- Header font size: `sm` (14px), font weight: `600`
- Subtitle font size: `xs` (12px), secondary text color
- Padding: `16px`
- Left accent stripe: `4px` wide, primary color, full height, border-radius top-left/bottom-left

### Workflow Node (Condition)

- Border radius: `12px` (lg)
- Border: `2px solid #06b6d4`
- Background: `#ecfeff`
- Shadow: `sm`, selected: `0 0 0 3px rgba(6, 182, 212, 0.25)`
- Shape indicator: small diamond icon (`12px`) in header
- True/False output ports: green (`#16a34a`) / red (`#dc2626`) dots, `10px` diameter
- Header font weight: `600`
- Condition text: mono font, `xs` size, `#0891b2` color
- Padding: `16px`
- Left accent stripe: `4px` wide, accent color

### Workflow Node (Action)

- Border radius: `12px` (lg)
- Border: `2px solid #16a34a`
- Background: `#f0fdf4`
- Shadow: `sm`, selected: `0 0 0 3px rgba(22, 163, 74, 0.25)`
- Width: `280px`
- Icon container: `36px` circle, `#16a34a` background, white icon
- Header font weight: `600`
- Padding: `16px`
- Left accent stripe: `4px` wide, `#16a34a`
- Multi-step badge: `xs` text, `#dcfce7` background, `#16a34a` text, pill shape

### Node Connection Lines

- Stroke: `#a78bfa` (light), `#7c3aed` (dark)
- Stroke width: `2px`
- Style: cubic bezier curves
- Animated dash on active run: `stroke-dasharray: 8 4`, animation `1s linear infinite`
- Arrow head: `8px` filled triangle, same color as stroke

### Workflow Card (Dashboard)

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Border-left: `4px solid` status color (running: accent, completed: completed, failed: failed, paused: paused)
- Header: workflow name (`base` size, weight `600`) + status badge
- Subtext: trigger type + last run time, `sm` size, secondary color
- Footer: run count + success rate, separated by `1px` top border

### Status Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `500`
- Variants:
  - Running: `#cffafe` background, `#0891b2` text, pulsing dot animation
  - Completed: `#dcfce7` background, `#16a34a` text
  - Failed: `#fee2e2` background, `#dc2626` text
  - Queued: `#fef3c7` background, `#d97706` text
  - Paused: `#f3f4f6` background, `#6b7280` text
  - Skipped: `#f1f5f9` background, `#64748b` text

### Run History Table

- Header background: `#f8f7ff`
- Header font weight: `600`, font size: `xs`, text transform: `uppercase`, letter-spacing: `0.05em`, secondary text color
- Row hover: `#f8f7ff`
- Cell padding: `12px 16px`
- Status column: status badge component
- Duration column: mono font, `sm` size
- Trigger column: icon + label, `sm` size
- Timestamp: `sm` size, secondary color, relative time format ("2m ago")
- Expandable row detail: `#faf9fe` background, `16px` left indent, shows step-by-step execution log

### Cron Expression Input

- Border radius: `8px` (md)
- Background: `#f8f7ff`
- Font family: mono
- Font size: `sm` (14px)
- Padding: `8px 12px`
- Border: `1px solid` border-primary
- Focus: `2px solid` primary with `2px` offset
- Human-readable preview below input: `xs` size, secondary color (e.g., "Every weekday at 9:00 AM")
- Quick-select chips: pill shape, `#f5f3ff` background, `#7c3aed` text, `xs` font

### AI Condition Editor

- Border radius: `8px` (md)
- Background: `#ecfeff`
- Border: `1px solid #a5f3fc`
- Padding: `12px 16px`
- Natural language input: `base` font size, body font
- AI sparkle icon: `16px`, accent color, left of input
- Confidence indicator: horizontal bar, `4px` height, gradient from `#dc2626` to `#f59e0b` to `#16a34a`
- Evaluated result preview: mono font, `xs` size, `#0891b2` color

### Step Execution Log

- Font family: mono
- Font size: `xs` (12px)
- Line height: `1.75` (relaxed)
- Background: `#1e1b4b` (dark)
- Text color: `#e0e7ff`
- Padding: `16px`
- Border radius: `8px` (md)
- Timestamp prefix: `#818cf8` color
- Success lines: `#4ade80` color
- Error lines: `#f87171` color
- Step separator: `1px dashed #312e81`

### Sidebar Navigation

- Background: sidebar color (`#1e1b4b`)
- Item padding: `10px 16px`
- Item border radius: `8px`
- Active item: `#312e81` background, white text, `3px` left border primary color
- Hover item: `#312e81` background at 50% opacity
- Icon size: `20px`, `#a5b4fc` color, active: `#ffffff`
- Section label: `xs` font, `#818cf8` color, uppercase, `0.05em` letter-spacing
- Collapse toggle: bottom of sidebar, `#818cf8` icon

### Stat Card (Dashboard)

- Border radius: `12px` (lg)
- Padding: `20px`
- Shadow: `sm`
- Metric font size: `2xl` (24px), font weight: `700`, primary text color
- Label font size: `sm` (14px), secondary text color
- Trend indicator: `xs` font, inline arrow icon
  - Positive: `#16a34a` text, up arrow
  - Negative: `#dc2626` text, down arrow
  - Neutral: `#6b7280` text, dash
- Icon container: `48px` rounded square (`12px` radius), `#f5f3ff` background, `#7c3aed` icon
