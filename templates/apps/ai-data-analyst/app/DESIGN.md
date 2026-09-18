# DESIGN.md — AI Data Analyst

## Brand Identity

- **App Name:** Clarion
- **Tagline:** Signal from the noise
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Analytical, clear, precise, data-driven

## Target Persona

Business analysts and data teams exploring datasets with natural-language queries and AI-generated visualizations.

## Screens

| Name           | Route            | Auth | Purpose                                                                                                                                            | deriveFrom |
| -------------- | ---------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with chart animations, AI query demo, features, pricing                                                                             | —          |
| Login          | /login           | No   | Centered card with indigo primary                                                                                                                  | —          |
| Signup         | /signup          | No   | Create account                                                                                                                                     | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                                                                                      | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                                                                                   | Login      |
| Dashboard      | /dashboard       | Yes  | Sidebar, KPI metric tiles with sparklines top, AI insights feed middle (trend/anomaly/correlation cards with left-bor...                           | —          |
| QueryEditor    | /query           | Yes  | Sidebar, large natural-language query bar top with sparkle icon, chart result card center, data table below with tabu...                           | —          |
| Datasets       | /datasets        | Yes  | Sidebar, grid of dataset cards with row counts, size, last analyzed, column previews                                                               | —          |
| Reports        | /reports         | Yes  | Sidebar, saved reports grid with chart thumbnails, schedule badges, share buttons                                                                  | —          |
| Upload         | /upload          | Yes  | Sidebar, large dashed drop zone with format pills (CSV, XLSX, JSON, Parquet), max size note, recent uploads list                                   | —          |
| Settings       | /settings        | Yes  | Sidebar, account, integrations, API keys, team                                                                                                     | —          |
| DatasetDetail  | /datasets/:id    | Yes  | Sidebar, single dataset header (rows/cols/size), tabs (Schema/Sample/Statistics/Queries/Lineage), schema table with type badges, AI insights panel | —          |
| ReportDetail   | /reports/:id     | Yes  | Sidebar, single report with hero chart, KPI band, sub-charts grid, AI Summary narrative card, full data table                                      | —          |

## App Constraints

- Charts use the 8-series palette (#4f46e5 indigo, #06b6d4 cyan, #f59e0b amber...)
- AI-generated charts and insights show a cyan AI badge
- Data tables use mono font with tabular-nums for numeric cells

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#4f46e5`
- Primary Hover: `#6366f1`
- Primary Dark: `#3730a3`
- Accent: `#06b6d4`
- Accent Hover: `#22d3ee`
- Accent Dark: `#0891b2`

### Semantic

- Positive Trend: `#10b981`
- Positive Trend Light: `#d1fae5`
- Negative Trend: `#ef4444`
- Negative Trend Light: `#fee2e2`
- Neutral Trend: `#6b7280`
- Anomaly: `#f59e0b`
- Anomaly Light: `#fef3c7`
- Correlation Strong: `#4f46e5`
- Correlation Weak: `#c7d2fe`
- AI Generated: `#06b6d4`
- AI Generated Light: `#cffafe`

### Chart Palette

Series colors for multi-data visualizations, ordered for maximum contrast:

- Series 1: `#4f46e5` (indigo)
- Series 2: `#06b6d4` (cyan)
- Series 3: `#f59e0b` (amber)
- Series 4: `#10b981` (emerald)
- Series 5: `#ef4444` (rose)
- Series 6: `#8b5cf6` (violet)
- Series 7: `#ec4899` (pink)
- Series 8: `#14b8a6` (teal)

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Code Block: `#1e1e2e`
- Query Input: `#f1f5f9`
- Drop Zone: `#eef2ff`
- Drop Zone Active: `#e0e7ff`

### Text

- Primary: `#1e293b`
- Secondary: `#64748b`
- Data Value: `#0f172a`
- Column Header: `#475569`
- Query Placeholder: `#94a3b8`
- Link: `#4f46e5`
- Link Hover: `#3730a3`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#4f46e5`
- Chart Grid: `#f1f5f9`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#22d3ee`
- Background: `#0c0f1a`
- Surface: `#161b2e`
- Surface Secondary: `#1e2540`
- Code Block: `#0c0f1a`
- Query Input: `#1e2540`
- Drop Zone: `#1e1b4b`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Data Value: `#f8fafc`
- Column Header: `#cbd5e1`
- Border Primary: `#2d3654`
- Chart Grid: `#1e2540`
- Chart Palette Series 1: `#818cf8`
- Chart Palette Series 2: `#22d3ee`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Data: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Heading: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Overrides

- Data table cells use the `Data` font family with `font-variant-numeric: tabular-nums`
- Chart axis labels use `Data` at `xs` (12px)
- Chart values/tooltips use `Data` at `sm` (14px), weight `600`
- AI-generated insight text uses `Body` at `base` (16px), line height `Relaxed` (1.75)
- Query input uses `Data` at `base` (16px)

## Layout

- Content Max Width: `1440px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Top Bar Height: `56px`
- Dashboard Grid Columns: `12` (desktop), `6` (tablet), `1` (mobile)
- Dashboard Grid Gap: `20px`
- Chart Card Min Height: `320px`
- Data Table Max Height: `calc(100vh - 240px)` (scroll within)
- Query Input Bar Height: `56px`
- Side Panel Width: `420px` (for AI insights detail)

## Components

### Chart Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Header: title left (`sm`, weight `600`), action icons right
- Chart area: full width, min height `240px`
- Footer: legend inline, muted text (`xs`)
- Border: `1px solid` border-primary
- AI badge: small accent-colored pill in top-right when chart is AI-generated

### Data Table

- Border radius: `12px` (lg) on wrapper
- Header background: `#f8fafc` (surface secondary)
- Header font: `Data` family, `xs` (12px), weight `600`, uppercase, letter-spacing `0.05em`, color column-header
- Cell font: `Data` family, `sm` (14px), tabular-nums
- Cell padding: `10px 16px`
- Row hover: surface secondary
- Row border: `1px solid` border-primary
- Sticky header on scroll
- Selected row: primary with `0.06` opacity background, left `3px solid` primary border
- Sortable columns: subtle arrow icon, active column header in primary color

### Query Input Bar

- Border radius: `12px` (lg)
- Background: query-input
- Height: `56px`
- Padding: `0 16px`
- Left icon: sparkle icon in accent color
- Font: `Data` family, `base` (16px)
- Placeholder: "Ask a question about your data..." in query-placeholder color
- Submit button: primary, `36px` round, right-aligned inside input
- Focus: `2px solid` primary with `2px` offset, background transitions to surface
- Shadow: `none` default, `md` on focus

### Upload Drop Zone

- Border radius: `16px` (xl)
- Border: `2px dashed` border-secondary
- Background: drop-zone
- Active (drag over): border primary, background drop-zone-active, `md` shadow
- Padding: `48px`
- Center: upload cloud icon (`48px`, secondary text), heading + supported formats
- Accepted formats badge row: pills showing CSV, XLSX, JSON, Parquet
- Max file size note: muted `xs` text below badges
- Transition: `Normal` (300ms) on all state changes

### Insight Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `16px 20px`
- Left border: `4px solid` — color varies by insight type:
  - Trend insight: positive-trend or negative-trend
  - Anomaly insight: anomaly
  - Correlation insight: primary
  - Summary insight: accent
- Icon: top-left, `20px`, matches border color
- Title: `sm` (14px), weight `600`
- Body: `sm` (14px), weight `400`, line height `Relaxed`
- Footer: referenced columns as small pills (`xs`, surface-secondary background)
- AI attribution: tiny accent "AI" badge next to title

### Metric Tile

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Value: `2xl` (24px), weight `700`, data-value color, `Data` font
- Label: `xs` (12px), weight `500`, secondary text, uppercase, letter-spacing `0.05em`
- Trend indicator: small arrow + percentage, positive-trend or negative-trend color
- Sparkline: `48px` tall, bottom-aligned, primary or accent stroke, no axis labels

### Export Menu

- Border radius: `8px` (md)
- Shadow: `lg`
- Padding: `8px 0`
- Item padding: `8px 16px`
- Item hover: surface secondary
- Icons: `16px`, secondary text, left of label
- Formats: CSV, XLSX, PNG (chart), PDF (report)
- Divider between format groups: `1px solid` border-primary with `4px` vertical margin

### Sidebar Navigation

- Width: `260px` (collapsed: `64px`)
- Background: surface
- Border-right: `1px solid` border-primary
- Nav item height: `40px`
- Nav item padding: `8px 16px`
- Nav item border-radius: `8px` (md)
- Active item: primary with `0.08` opacity background, primary text, weight `600`
- Hover item: surface-secondary background
- Icon size: `20px`
- Section dividers: `1px solid` border-primary with `12px` vertical margin
- Sections: Datasets (upload, recent), Analysis (queries, saved), Reports (exports, scheduled)

## Design Principles (Addendum)

1. **Data legibility first** — numeric values always use tabular-nums monospace; never truncate data values in tables
2. **AI provenance** — always mark AI-generated content (charts, insights, queries) with the accent-colored badge so users distinguish computed vs. generated
3. **Progressive disclosure** — show summary metrics and key insights at the top, full data table and chart details on scroll or drill-down
4. **Calm density** — dashboards are information-dense but never cluttered; use consistent spacing and subdued borders to separate, not compete
5. **Instant feedback** — query submission shows a subtle shimmer animation on the result area; chart transitions use `Normal` (300ms ease) for smooth data updates
