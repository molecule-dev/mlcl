# DESIGN.md — AI Agent Playground

## Brand Identity

- **App Name:** Neuron
- **Tagline:** Wire intelligence, watch it run
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Technical, experimental, developer-focused, precise

## Target Persona

ML engineers and developers building, debugging, and tuning AI agents with tools and execution traces.

## Screens

| Name           | Route              | Auth | Purpose                                                                                                                                                                                                 | deriveFrom |
| -------------- | ------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                  | No   | Dark-mode marketing home with terminal-inspired hero, agent demo, features, pricing                                                                                                                     | —          |
| Login          | /login             | No   | Dark centered card, violet Sign In button, developer-focused design                                                                                                                                     | —          |
| Signup         | /signup            | No   | Create account                                                                                                                                                                                          | Login      |
| ForgotPassword | /forgot-password   | No   | Request reset                                                                                                                                                                                           | Login      |
| ResetPassword  | /reset-password    | No   | Set new password                                                                                                                                                                                        | Login      |
| Dashboard      | /dashboard         | Yes  | Dark sidebar, metrics bar top (runs, tokens, cost, latency), agent cards grid with status dots and provider icons, re...                                                                                | —          |
| AgentBuilder   | /agents/:id        | Yes  | Three-panel dark layout: tool library left (tool cards with drag handles), agent canvas center with node connections,...                                                                                | —          |
| ExecutionTrace | /runs/:id          | Yes  | Dark sidebar, vertical execution timeline center with step nodes (queued/running/success/failed), log entries right p...                                                                                | —          |
| ToolLibrary    | /tools             | Yes  | Dark sidebar, grid of tool definition cards with code-font names, parameter schemas, left-border in tool-call purple                                                                                    | —          |
| PromptEditor   | /agents/:id/prompt | Yes  | Dark sidebar, code editor with line numbers and syntax highlighting center, provider+model selector panel right, toke...                                                                                | —          |
| Settings       | /settings          | Yes  | Dark sidebar, settings panels (API keys, providers, account), add provider button with violet primary                                                                                                   | —          |
| Agents         | /agents            | Yes  | Dark sidebar, filterable grid of agent cards with status dot, provider icon, mono micro-stats (runs/latency/cost) and tool chips — primary list paired with AgentBuilder detail                         | —          |
| RunHistory     | /runs              | Yes  | Dark sidebar, metrics strip + dense tabular run log with run-id, agent, status, started, duration, tokens, cost columns, all numbers in JetBrains Mono — primary list paired with ExecutionTrace detail | —          |
| Datasets       | /datasets          | Yes  | Dark sidebar, evaluation-dataset cards (rows/size/usage) with type filter chips and a recently-used + storage breakdown side panel                                                                      | —          |
| KnowledgeBases | /knowledge-bases   | Yes  | Dark sidebar, vector-store collection cards showing vectors/dim/chunks/embedding-model and indexing-status dot                                                                                          | —          |
| Models         | /models            | Yes  | Dark sidebar, provider-grouped model registry cards with context/pricing/latency stats, provider color stripes, set-as-default action                                                                   | —          |
| Profile        | /profile           | Yes  | Profile edit form with avatar, display name, default provider/model, timezone, API token                                                                                                                | Settings   |
| Notifications  | /notifications     | Yes  | Dense notification log, status dots per event type, mark-read actions                                                                                                                                   | RunHistory |

## App Constraints

- Dark mode is the primary theme — pages render on #0c0e14 background
- All token counts, latencies, and timestamps use mono font with tabular-nums
- Execution logs and code editors use JetBrains Mono; UI text uses Inter

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#7c3aed`
- Primary Hover: `#6d28d9`
- Primary Dark: `#5b21b6`
- Accent: `#c4b5fd`
- Accent Hover: `#a78bfa`
- Accent Dark: `#8b5cf6`

### Semantic

- Running: `#f59e0b`
- Running Light: `#fef3c7`
- Success: `#16a34a`
- Success Light: `#dcfce7`
- Failed: `#dc2626`
- Failed Light: `#fee2e2`
- Queued: `#6b7280`
- Tool Call: `#8b5cf6`
- Tool Call Light: `#ede9fe`
- Provider Anthropic: `#d4a27f`
- Provider OpenAI: `#10a37f`
- Provider Google: `#4285f4`

### Backgrounds (Dark Mode First)

- Primary: `#0c0e14`
- Secondary: `#14171f`
- Surface: `#1a1d28`
- Surface Secondary: `#22262f`
- Canvas: `#0a0c10`
- Editor: `#12141a`
- Input: `#22262f`
- Execution Log: `#0e1018`

### Text (Dark Mode First)

- Primary: `#eef0f4`
- Secondary: `#8b90a0`
- Tertiary: `#5c6070`
- Inverse: `#0c0e14`
- Link: `#a78bfa`
- Link Hover: `#c4b5fd`
- Token Count: `#f59e0b`

### Borders (Dark Mode First)

- Primary: `#2a2e3a`
- Secondary: `#383c48`
- Focus: `#8b5cf6`
- Execution Step: `#22262f`

### Light Theme Overrides

- Primary: `#7c3aed`
- Background: `#f5f6f8`
- Surface: `#ffffff`
- Surface Secondary: `#f0f1f4`
- Editor: `#fafbfc`
- Text Primary: `#1a1d28`
- Text Secondary: `#6b7280`
- Border Primary: `#e0e2e8`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Code: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace`
- Mono Data: `"JetBrains Mono", monospace` (font-variant-numeric: tabular-nums — for token counts, latencies, timestamps)

### Font Sizes

- Log Entry: `sm` (14px), code family
- Execution Timestamp: `xs` (12px), mono-data family
- Metric Value: `2xl` (24px), weight `700`, mono-data family
- Tool Name: `sm` (14px), weight `600`, code family

## Layout

- Content Max Width: `100%` (full bleed dashboard)
- Sidebar Width: `260px` (collapsed: `56px`)
- Top Bar Height: `48px`
- Agent Builder Panel: `420px` min width, resizable
- Execution Log Panel: `360px` min width, resizable
- Code Editor Min Height: `300px`
- Tool Schema Panel Width: `340px`
- Split Pane Gutter: `4px`, drag handle: `40px` tall, border-secondary

## Components

### Agent Card

- Border radius: `12px` (lg)
- Padding: `20px`
- Border: `1px solid` border-primary
- Hover: border shifts to primary with `md` shadow
- Status dot: `10px`, top-right, color matches execution state
- Provider icon: `18px`, bottom-left, color matches provider semantic
- Name: `lg` (18px), weight `600`
- Description: `sm` (14px), secondary text, 2-line clamp

### Tool Definition Card

- Border radius: `8px` (md)
- Padding: `14px 16px`
- Background: surface-secondary
- Border-left: `3px solid` tool-call color
- Icon: `16px`, tool-call color
- Name: `sm` (14px), code family, weight `600`
- Parameters: `xs` (12px), code family, secondary text
- Drag handle: `6px` dotted grip, tertiary text

### Execution Timeline

- Vertical orientation, left-aligned
- Step connector: `2px solid` execution-step border, `24px` gap
- Step node: `12px` circle, fill matches status (running/success/failed/queued)
- Active step node: `12px` circle with `4px` pulsing ring in running color
- Step card: `8px` radius, `12px 16px` padding, surface-secondary background
- Timestamp: mono-data family, `xs`, secondary text, right-aligned
- Duration badge: `xs`, mono-data, surface background, `full` radius pill

### Execution Log Entry

- Font: code family, `sm` (14px)
- Line height: `1.6`
- Background: execution-log
- Padding: `4px 16px`
- Alternating subtle stripe: every other entry `rgba(255,255,255,0.02)` lighter
- Tool call entries: tool-call-light left border `2px`
- Error entries: failed-light background, failed left border `2px`
- Timestamp: mono-data, `xs`, `80px` fixed width, tertiary text

### Code Editor Panel

- Font: code family, `sm` (14px)
- Line height: `1.6`
- Background: editor
- Gutter: `48px` wide, surface-secondary background, tertiary text
- Active line: `rgba(124, 58, 237, 0.06)` highlight
- Selection: `rgba(167, 139, 250, 0.2)` (accent tint)
- Minimap width: `60px`

### Provider Selector

- Border radius: `8px` (md)
- Padding: `10px 14px`
- Border: `1px solid` border-primary
- Selected: primary border, `rgba(124, 58, 237, 0.08)` background
- Provider icon: `20px`, provider semantic color
- Provider name: `sm` (14px), weight `500`
- Model name: `xs` (12px), secondary text

### Metrics Bar

- Background: surface
- Padding: `12px 20px`
- Border-bottom: `1px solid` border-primary
- Metric: mono-data family, `2xl` value + `xs` label
- Metric divider: `1px solid` border-primary, `20px` horizontal spacing
- Trend arrow: `14px`, success (up-good) or failed (up-bad) color

### Run Button

- Border radius: `8px` (md)
- Height: `40px` (md)
- Background: primary
- Font weight: `600`
- Icon: play triangle `14px`, left of label
- Running state: background shifts to running color, icon becomes animated spinner
- Disabled: `0.5` opacity, no pointer events

### Conversation Thread (Test Panel)

- Border radius: `12px` (lg) container
- Message bubble radius: `12px`, `4px` on sender's corner
- User message: primary background, inverse text
- Agent message: surface-secondary background, primary text
- Tool use block: code family, tool-call-light background, `8px` radius, `12px` padding
- Token count: mono-data, `xs`, secondary text, right-aligned below message
