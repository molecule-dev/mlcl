# DESIGN.md — RAG Knowledge Base

## Brand Identity

- **App Name:** Engram
- **Tagline:** Instant knowledge recall
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Scholarly, precise, retrieval-focused, calm

## Target Persona

Teams building internal knowledge bases with AI-powered semantic search over documents, wikis, and chat logs.

## Screens

| Name           | Route            | Auth | Purpose                                                           | deriveFrom |
| -------------- | ---------------- | ---- | ----------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with retrieval demo                                | —          |
| Login          | /login           | No   | Sign in                                                           | —          |
| Signup         | /signup          | No   | Create account                                                    | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                     | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                  | Login      |
| Ask            | /ask             | Yes  | Semantic query chat with cited sources                            | —          |
| Documents      | /documents       | Yes  | Indexed document library                                          | —          |
| DocumentDetail | /documents/:id   | Yes  | Document reader with chunks and embeddings                        | —          |
| Sources        | /sources         | Yes  | Configure data sources and connectors                             | —          |
| SourceDetail   | /sources/:id     | Yes  | Connector-specific sync status, indexed docs, schedule, error log | —          |
| Analytics      | /analytics       | Yes  | Query logs, top cited docs, relevance metrics                     | —          |
| History        | /history         | Yes  | Browsable archive of past Q&A queries with cited answers          | —          |
| KnowledgeGraph | /graph           | Yes  | Interactive visualization of document semantic relationships      | —          |
| Members        | /members         | Yes  | Team management — invite, roles, member activity                  | —          |
| Notifications  | /notifications   | Yes  | Activity feed — sync events, mentions, shared answers             | —          |
| Billing        | /billing         | Yes  | Subscription, usage, invoice history, plan comparison             | —          |
| Settings       | /settings        | Yes  | Profile, API keys, retrieval settings                             | —          |

## App Constraints

- Citation chips appear inline in answers with number badges and hover reveals the source
- Relevance scores use tabular-nums and color ramp (green → yellow → gray)
- Document chunks shown with mono font for precision

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#5b47e0`
- Primary Hover: `#7c6af0`
- Primary Dark: `#4636b8`
- Accent: `#e6a817`
- Accent Hover: `#f0c040`
- Accent Dark: `#c48e10`

### Semantic

- High Relevance: `#16a34a`
- High Relevance Light: `#dcfce7`
- Medium Relevance: `#e6a817`
- Medium Relevance Light: `#fef9e7`
- Low Relevance: `#9ca3af`
- Indexing: `#3b82f6`
- Indexing Light: `#dbeafe`
- Cited: `#8b5cf6`
- Cited Light: `#ede9fe`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8f7fc`
- Chat Pane: `#faf9fe`
- Code Block: `#1e1b2e`

### Text

- Primary: `#1e1b2e`
- Secondary: `#6b6880`
- Citation: `#5b47e0`
- Monospace: `#d4d0f0` (on code-block background)
- Link: `#5b47e0`
- Link Hover: `#4636b8`

### Borders

- Primary: `#e4e2f0`
- Secondary: `#d0cde0`
- Focus: `#5b47e0`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#f0c040`
- Background: `#0c0a1a`
- Surface: `#1a1730`
- Surface Secondary: `#242040`
- Chat Pane: `#1e1a35`
- Code Block: `#0c0a1a`
- Text Primary: `#ede9fe`
- Text Secondary: `#a09cb8`
- Border Primary: `#302c50`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (font-weight: 700, letter-spacing: -0.02em)
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Citation: `"Inter", sans-serif` (font-variant-numeric: tabular-nums, font-weight: 600)

## Layout

- Content Max Width: `1400px`
- Sidebar Width: `280px` (document library, collapsible to `64px`)
- Chat Pane Width: `480px` (right side, resizable, min `360px`, max `640px`)
- Main Content Area: fluid (fills space between sidebar and chat pane)
- Document Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Document Grid Gap: `20px`
- Search Results Max Width: `800px` (centered in main content)

## Components

### Document Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Border-left: `4px solid` file-type color (PDF: `#dc2626`, DOCX: `#2563eb`, TXT: `#6b7280`, MD: `#1e1b2e`, CSV: `#16a34a`)
- File type icon: `32px`, top-left
- Title: `base` size, weight `600`, single line with ellipsis
- Metadata row: `sm` size, secondary text — page count, upload date, chunk count
- Indexing progress bar: `4px` height, primary color, shown during processing

### Search Result Card

- Border radius: `8px` (md)
- Shadow: none, border: `1px solid` border-primary
- Padding: `16px 20px`
- Relevance score badge: pill, right-aligned — high (`#16a34a`), medium (`#e6a817`), low (`#9ca3af`)
- Source document link: `sm` size, citation color, underline on hover
- Matched excerpt: `base` size, primary text, highlighted spans use `#ede9fe` background + `#5b47e0` text
- Chunk reference: `xs` size, monospace, secondary text — e.g. "Section 3, ¶2"

### Chat Message

- Max width: `85%` of chat pane
- User message: primary background at `10%` opacity, border-radius `12px 12px 4px 12px`, padding `12px 16px`
- AI message: surface background, border-radius `12px 12px 12px 4px`, padding `12px 16px`
- Citation pill (inline): `xs` size, weight `600`, cited-light background, cited color text, border-radius `full`, padding `1px 8px`, clickable — scrolls to source
- Thinking indicator: 3-dot pulse animation, secondary text color, `300ms` stagger

### Citation Panel

- Appears below AI message when citations exist
- Border-top: `1px solid` border-primary
- Padding: `12px 16px`
- Each citation: numbered pill + document name + chunk preview (truncated to 2 lines)
- Hover: expands preview to full chunk text, surface-secondary background

### Upload Zone

- Border radius: `12px` (lg)
- Border: `2px dashed` border-secondary, hover: `2px dashed` primary
- Padding: `48px`
- Background: surface-secondary, hover: primary at `5%` opacity
- Icon: `48px`, secondary color, hover: primary
- Accepts: `.pdf`, `.docx`, `.txt`, `.md`, `.csv`, `.html`
- Active drag state: primary border, primary at `10%` background, scale `1.02`

### Relevance Score Badge

- Border radius: `full` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `600`
- Variants:
  - High (0.8–1.0): high-relevance background at `15%`, high-relevance text
  - Medium (0.5–0.79): medium-relevance background at `15%`, medium-relevance-dark text
  - Low (0–0.49): `#f3f4f6` background, low-relevance text

### Document Status Badge

- Border radius: `full` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Font weight: `500`
- Variants:
  - Indexed: success-light background, success text
  - Indexing: indexing-light background, indexing text, subtle pulse animation
  - Failed: error-light background, error text
  - Queued: `#f3f4f6` background, secondary text

### Knowledge Graph Mini-Map (optional sidebar widget)

- Border radius: `12px` (lg)
- Background: code-block color
- Height: `200px`
- Node color: primary at `80%` opacity, `6px` circles
- Edge color: primary at `20%` opacity, `1px` lines
- Active node: accent color, `10px` circle with `md` shadow
- Interactive: pan and zoom, click node to filter search

### Inline Code / Source Block

- Border radius: `8px` (md)
- Background: code-block color
- Text color: monospace text color
- Padding: `16px`
- Font family: mono
- Font size: `sm` (14px)
- Line numbers: secondary text, right-aligned, `48px` gutter
- Copy button: top-right, ghost style, `sm` size

### Search Input

- Border radius: `full` (pill)
- Height: `52px`
- Padding: `12px 24px`
- Font size: `lg` (18px)
- Border: `2px solid` border-primary, focus: `2px solid` primary
- Shadow: `md` on focus
- Search icon: `20px`, left, secondary color
- Clear button: `20px`, right, secondary, appears when input has value
- Keyboard shortcut hint: `⌘K`, right side, `xs` size badge, secondary
