# DESIGN.md — AI Writing Studio

## Brand Identity

- **App Name:** Plume
- **Tagline:** Intelligence meets eloquence
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Literary, intelligent, refined, encouraging

## Target Persona

Writers, bloggers, and content creators drafting long-form content with AI writing assistance and SEO optimization.

## Screens

| Name           | Route              | Auth | Purpose                                                                                                                                                             | deriveFrom |
| -------------- | ------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                  | No   | Marketing home with writing demo, purple-gold palette, features, pricing                                                                                            | —          |
| Login          | /login             | No   | Centered card with purple primary, literary feel                                                                                                                    | —          |
| Signup         | /signup            | No   | Create account                                                                                                                                                      | Login      |
| ForgotPassword | /forgot-password   | No   | Request reset                                                                                                                                                       | Login      |
| ResetPassword  | /reset-password    | No   | Set new password                                                                                                                                                    | Login      |
| Dashboard      | /dashboard         | Yes  | Sidebar, document list with word counts, SEO score badges, status (draft/published), last-edited timestamps, filter b...                                            | —          |
| Editor         | /documents/:id     | Yes  | Document outline sidebar left, Lora-serif editor center (18px body), AI suggestion panel right with purple accent bac...                                            | —          |
| Documents      | /documents         | Yes  | Sidebar, document grid with hero/preview, folder filter, status tabs, search                                                                                        | —          |
| Templates      | /templates         | Yes  | Sidebar, writing template grid (blog, email, article, landing) with category badges and preview snippets                                                            | —          |
| SEOAnalysis    | /documents/:id/seo | Yes  | Sidebar, overall SEO score circle top, keyword density table, readability metrics, suggestions list with severity                                                   | —          |
| Settings       | /settings          | Yes  | Sidebar, writing preferences, tone defaults, integrations (WordPress, Medium), account                                                                              | —          |
| Profile        | /profile           | Yes  | Sidebar, public writer profile with avatar, bio in Lora italic, follower stats, published works grid with SEO badges, topics chips, social links                    | —          |
| Billing        | /billing           | Yes  | Sidebar, current plan card with gradient, AI word usage progress bar, payment method, billing address, invoice history table                                        | —          |
| Analytics      | /analytics         | Yes  | Sidebar, KPI strip (views, readers, read time, engagement), views-over-time area chart, top performing articles table, traffic sources donut, reader geography bars | —          |

## App Constraints

- Editor body uses Lora serif at 18px for long-form reading
- SEO score and readability indicators use semantic colors
- AI suggestion panel uses purple-tinted background

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#6c47d9`
- Primary Hover: `#8566e8`
- Primary Dark: `#5535b8`
- Accent: `#e8a830`
- Accent Hover: `#f0bc50`
- Accent Dark: `#c88d18`

### Semantic

- AI Generated: `#6c47d9`
- AI Generated Light: `#ede8fb`
- Draft: `#6b7280`
- Draft Light: `#f3f4f6`
- Published: `#059669`
- Published Light: `#d1fae5`
- SEO Excellent: `#059669`
- SEO Good: `#16a34a`
- SEO Fair: `#e8a830`
- SEO Poor: `#dc2626`
- Readability: `#0891b2`
- Readability Light: `#cffafe`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf9fc`
- Editor: `#ffffff`
- Editor Gutter: `#f7f5fa`
- Sidebar: `#f4f2f8`
- AI Panel: `#f0ecf9`

### Text

- Primary: `#1e1b2e`
- Secondary: `#6b6580`
- Tertiary: `#8f8a9e`
- Editor Body: `#2d2a3a`
- Editor Heading: `#1e1b2e`
- Placeholder: `#b0abbe`
- Link: `#6c47d9`
- Link Hover: `#5535b8`
- Word Count: `#8f8a9e`

### Borders

- Primary: `#e4e0ed`
- Secondary: `#d4d0de`
- Focus: `#6c47d9`
- Editor Block: `#ede8fb`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#f0bc50`
- Background: `#0d0b14`
- Surface: `#1a1726`
- Surface Secondary: `#221e30`
- Editor: `#1a1726`
- Editor Gutter: `#151222`
- Sidebar: `#151222`
- AI Panel: `#1e1a2e`
- Text Primary: `#f0edf8`
- Text Secondary: `#a09bb5`
- Editor Body: `#e8e4f2`
- Border Primary: `#2e2a3e`

## Typography

### Font Families

- UI: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Editor Body: `"Lora", "Georgia", "Times New Roman", serif`
- Editor Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Mono: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace`

### Font Sizes (Editor)

- Body: `1.125rem` (18px) — optimized for long-form reading
- H1: `2.5rem` (40px)
- H2: `1.875rem` (30px)
- H3: `1.5rem` (24px)
- H4: `1.25rem` (20px)
- Blockquote: `1.125rem` (18px), italic
- Caption: `0.875rem` (14px)
- Footnote: `0.8125rem` (13px)

### Line Heights (Editor)

- Body: `1.8` — generous for readability
- Heading: `1.3`
- Blockquote: `1.7`

### Paragraph Spacing (Editor)

- Between paragraphs: `24px`
- After headings: `16px`
- Before headings: `40px`

## Layout

- Content Max Width: `1400px`
- Editor Content Width: `720px` — centered, optimized for ~65 characters per line
- Editor Padding: `48px 64px` (desktop), `24px 16px` (mobile)
- Document Sidebar Width: `280px` (collapsed: `56px`)
- AI Assistant Panel Width: `380px`
- SEO/Stats Panel Width: `320px`
- Top Bar Height: `52px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `20px`

## Components

### Document Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Title font: Editor Heading family, `600` weight, `1.125rem`
- Excerpt: 2 lines max, `0.875rem`, text-secondary, `1.5` line height
- Status badge: top-right, pill style
- Metadata row: word count + last edited, `0.75rem`, text-tertiary
- Thumbnail: optional, `160px` height, top flush, `12px` top radius

### Editor Toolbar

- Height: `44px`
- Background: surface
- Border bottom: `1px solid` border-primary
- Button size: `32px` square
- Button border radius: `6px`
- Button hover: surface-secondary background
- Active button: AI Generated Light background, primary text
- Divider: `1px solid` border-primary, `16px` vertical margin
- Sticky: fixed at top of editor viewport

### AI Generation Panel

- Background: AI Panel background
- Border left: `1px solid` border-primary
- Padding: `20px`
- Prompt input: `120px` min height, editor-body font, `1rem`
- Generate button: primary, full width, `44px` height, `600` weight
- Suggestion card: `8px` radius, surface background, `12px` padding
- Streaming text: editor-body font, `0.95rem`, `1.7` line height
- Loading indicator: animated gradient pulse in primary/primary-hover

### Style Control Selector

- Dropdown border radius: `8px`
- Option height: `40px`
- Active style: primary background, inverse text
- Style preview: `0.8125rem`, italic, text-secondary, `2` lines max
- Presets: Professional, Casual, Academic, Creative, Technical, Persuasive

### SEO Score Panel

- Border radius: `12px` (lg)
- Padding: `16px`
- Score circle: `64px` diameter, `4px` stroke, color by score tier
- Score number: `1.5rem`, `700` weight, centered in circle
- Metric rows: `36px` height, label left + indicator right
- Indicator dots: `10px` diameter, colored by tier (excellent/good/fair/poor)
- Section divider: `1px solid` border-primary, `12px` vertical margin

### Word Count Bar

- Height: `32px`
- Background: surface-secondary
- Font: `0.75rem`, mono family, text-tertiary
- Position: fixed bottom of editor
- Metrics: words | characters | sentences | reading time
- Separator: `·` character, `12px` horizontal margin

### Document Status Badge

- Border radius: `9999px` (pill)
- Padding: `3px 10px`
- Font size: `0.6875rem` (11px)
- Font weight: `600`
- Text transform: uppercase, `0.05em` letter spacing
- Draft: draft-light background, draft text
- Published: published-light background, published text
- AI Generated: AI-generated-light background, AI-generated text

### AI Inline Suggestion

- Background: `#f0ecf9` (AI Generated Light)
- Border left: `3px solid` primary
- Border radius: `0 6px 6px 0`
- Padding: `8px 12px`
- Font: editor-body family, `1rem`
- Accept button: `24px` height, primary ghost variant, `0.75rem`
- Dismiss button: `24px` height, secondary ghost variant, `0.75rem`
- Animation: fade-in `200ms ease`

### Image Generation Card

- Border radius: `8px`
- Aspect ratio: `16:9` default, configurable
- Placeholder: AI Panel background, dashed `2px` border, centered icon
- Loading: skeleton shimmer animation, `1.5s` loop
- Toolbar overlay: bottom, gradient `transparent → rgba(0,0,0,0.6)`
- Action buttons: ghost white, `28px` square, `6px` radius

### Rich Text Formatting Bar (Floating)

- Border radius: `8px`
- Shadow: `lg`
- Background: `#1e1b2e` (dark)
- Padding: `4px`
- Button size: `28px` square
- Button color: `#f0edf8` (light text)
- Button hover: `rgba(255,255,255,0.12)` background
- Button active: primary background
- Arrow: `8px` centered triangle pointing down
- Appears on text selection, positioned above selection

### Template Gallery Card

- Border radius: `12px`
- Border: `1px solid` border-primary
- Padding: `0`
- Preview area: `180px` height, surface-secondary background, `12px` top radius
- Content padding: `16px`
- Title: `0.9375rem`, `600` weight
- Description: `0.8125rem`, text-secondary, 2 lines max
- Category tag: `0.6875rem`, accent-dark text, accent/10% background, `4px` radius, `2px 8px` padding
- Hover: border-focus border, `md` shadow

## Design Principles (App-Specific)

1. **Content is king** — the editor is a distraction-free canvas; UI chrome stays out of the way
2. **AI is an assistant, not the author** — AI-generated content is always visually distinguished (subtle purple tint, left border) so the user knows what they wrote vs. what was suggested
3. **Progressive disclosure** — SEO panel, style controls, and AI panel are collapsible; the default view is a clean editor
4. **Typographic excellence** — serif body text, generous line height, and proper paragraph spacing make long-form content a pleasure to read and write
5. **Dark mode for late-night writers** — dark theme uses deep indigo-black tones, not pure black, to reduce eye strain during extended sessions
