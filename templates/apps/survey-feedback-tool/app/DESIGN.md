# DESIGN.md — Survey / Feedback Tool

## Brand Identity

- **App Name:** Gauge
- **Tagline:** Every voice, amplified
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Conversational, curious, inclusive, precise

## Target Persona

Product managers, UX researchers, and HR teams who build surveys, NPS forms, and feedback programs and need clear analytics.

## Screens

| Name           | Route                              | Auth | Purpose                                                                                     | deriveFrom   |
| -------------- | ---------------------------------- | ---- | ------------------------------------------------------------------------------------------- | ------------ |
| Landing        | /                                  | No   | Marketing home                                                                              | —            |
| Login          | /login                             | No   | Sign in                                                                                     | —            |
| Signup         | /signup                            | No   | Create account                                                                              | Login        |
| ForgotPassword | /forgot-password                   | No   | Request reset                                                                               | Login        |
| ResetPassword  | /reset-password                    | No   | Set new password                                                                            | Login        |
| Surveys        | /surveys                           | Yes  | Surveys dashboard/list                                                                      | —            |
| SurveyDetail   | /surveys/:id                       | Yes  | Survey overview hub: status, share link, summary stats, tabs to Builder/Responses/Analytics | —            |
| Builder        | /surveys/:id/build                 | Yes  | Form builder with question palette                                                          | —            |
| Responses      | /surveys/:id/responses             | Yes  | Responses table                                                                             | —            |
| ResponseDetail | /surveys/:id/responses/:responseId | Yes  | Single response viewer: respondent metadata + every answer in order                         | —            |
| Analytics      | /surveys/:id/analytics             | Yes  | NPS score, response funnel, per-question charts, segment filters                            | —            |
| Templates      | /templates                         | Yes  | Survey template gallery (NPS, CSAT, employee feedback, product research, etc.)              | —            |
| PublicSurvey   | /s/:slug                           | No   | Respondent-facing survey-fill view (one question at a time, progress bar)                   | —            |
| ThankYou       | /s/:slug/thank-you                 | No   | Post-submission confirmation page                                                           | PublicSurvey |
| Settings       | /settings                          | Yes  | Workspace settings (general, branding, integrations, team, billing)                         | —            |
| Profile        | /profile                           | Yes  | Personal account profile (name, email, avatar, password, sessions)                          | Settings     |
| Notifications  | /notifications                     | Yes  | Activity feed: new responses, mentions, share events, milestones                            | —            |

## App Constraints

- Builder canvas max width 720px; properties panel 300px right rail
- NPS scale shows detractor-passive-promoter color gradient (red-amber-green)
- All chart series use the ordered palette starting #5b4ee4 then #f06050

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#5b4ee4`
- Primary Hover: `#7366f0`
- Primary Dark: `#4338ca`
- Accent: `#f06050`
- Accent Hover: `#f47868`
- Accent Dark: `#d94a3a`

### Semantic

- Complete: `#10b981`
- Complete Light: `#d1fae5`
- Partial: `#f59e0b`
- Partial Light: `#fef3c7`
- Abandoned: `#6b7280`
- Abandoned Light: `#f3f4f6`
- Required: `#ef4444`
- High Score: `#10b981`
- Mid Score: `#f59e0b`
- Low Score: `#ef4444`
- NPS Promoter: `#10b981`
- NPS Passive: `#f59e0b`
- NPS Detractor: `#ef4444`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8f7ff`
- Survey Canvas: `#fafafe`
- Builder Sidebar: `#f5f4fb`
- Analytics Card: `#ffffff`

### Text

- Primary: `#1e1b4b`
- Secondary: `#6b7280`
- Question: `#1e1b4b`
- Description: `#6b7280`
- Link: `#5b4ee4`
- Link Hover: `#4338ca`

### Borders

- Primary: `#e5e4f0`
- Secondary: `#d4d3e0`
- Focus: `#5b4ee4`
- Drop Target: `#5b4ee4`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#fb7185`
- Background: `#0c0a1d`
- Surface: `#1a1640`
- Surface Secondary: `#231e52`
- Survey Canvas: `#141030`
- Text Primary: `#f0f0ff`
- Text Secondary: `#a5b4fc`
- Border Primary: `#312e6a`

## Typography

### Font Families

- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Question: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (weight: 600)
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Font Sizes (overrides)

- Question Title: `1.25rem` (20px), weight `600`
- Question Description: `0.875rem` (14px), weight `400`
- Option Label: `1rem` (16px), weight `400`
- Analytics Metric: `2.25rem` (36px), weight `700`
- Analytics Label: `0.75rem` (12px), weight `500`, text-transform `uppercase`, letter-spacing `0.05em`

## Layout

- Content Max Width: `1200px`
- Survey Canvas Max Width: `720px` (centered, narrow for focus)
- Builder Sidebar Width: `320px`
- Properties Panel Width: `300px`
- Analytics Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Analytics Grid Gap: `24px`
- Response Table Min Width: `900px`
- Question Spacing: `32px` (vertical gap between questions in survey view)
- Thank You Page Max Width: `560px`

## Components

### Question Block

- Border radius: `12px` (lg)
- Shadow: `none` (flat), selected: `0 0 0 2px #5b4ee4`
- Background: surface
- Padding: `24px`
- Border: `1px solid` border-primary
- Hover in builder: `border-color: #5b4ee4` with `transition: 150ms ease`
- Required indicator: `*` in required color, right of question title
- Drag handle: `6px` left gutter, `#d4d3e0`, visible on hover
- Question number: `0.875rem`, weight `600`, primary color, `8px` bottom margin

### Question Type Icons

- Size: `20px`
- Color: secondary text, active: primary
- Padding: `8px`
- Border radius: `6px`
- Hover background: surface-secondary

### Option Row (Multiple Choice / Checkbox)

- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Padding: `12px 16px`
- Margin bottom: `8px`
- Hover: border-primary darkens, background surface-secondary
- Selected: primary border `2px`, primary-light background `#ededff`
- Radio dot: `12px` outer, `6px` inner, primary color
- Checkbox: `18px`, border-radius `4px`, primary fill when checked

### Rating Scale

- Star size: `28px` (survey view), `20px` (results)
- Star filled: `#f59e0b`
- Star empty: `#e5e7eb`
- Numeric scale button: `44px × 44px`, border-radius `8px`, border `1px solid` border-primary
- Numeric selected: primary background, inverse text
- NPS scale: `0–10` horizontal strip, `40px` per cell, color gradient from detractor → passive → promoter

### Progress Bar

- Height: `4px`
- Background: `#e5e4f0`
- Fill: primary, animated with `transition: width 300ms ease`
- Border radius: `9999px`
- Position: top of survey view, full width

### Form Builder Toolbar

- Background: surface
- Border bottom: `1px solid` border-primary
- Height: `56px`
- Button group gap: `4px`
- Add Question button: accent background, white text, `500` weight, `8px` radius

### Response Table

- Header background: surface-secondary
- Header text: secondary, `12px`, weight `600`, uppercase, `0.05em` letter-spacing
- Row hover: surface-secondary
- Cell padding: `12px 16px`
- Status badge — Complete: complete background `#d1fae5`, complete text `#065f46`
- Status badge — Partial: partial background `#fef3c7`, partial text `#92400e`
- Status badge — Abandoned: abandoned background `#f3f4f6`, abandoned text `#374151`
- Badge radius: `9999px`, padding `2px 10px`, font `12px`, weight `500`

### Analytics Stat Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `24px`
- Metric value: analytics-metric size, weight `700`, primary text
- Metric label: analytics-label size, secondary text
- Trend indicator: `↑` complete color / `↓` low-score color, `14px`, weight `600`

### Chart Container

- Border radius: `12px` (lg)
- Border: `1px solid` border-primary
- Padding: `24px`
- Header: title `1rem` weight `600` + subtitle `0.875rem` secondary
- Chart colors (ordered palette): `#5b4ee4`, `#f06050`, `#10b981`, `#f59e0b`, `#6366f1`, `#ec4899`, `#14b8a6`, `#8b5cf6`
- Bar chart border-radius: `4px` top corners
- Donut chart stroke width: `32px`

### Logic Branch Connector

- Line color: `#5b4ee4` at `40%` opacity
- Line width: `2px`
- Connector dot: `8px`, primary background
- Border radius on condition badge: `9999px`, primary-light background, primary text, `12px` font

### Survey Preview Frame

- Border radius: `12px` (lg) outer
- Shadow: `lg`
- Toolbar: `40px` height, surface-secondary background, device toggle icons `20px`
- Mobile preview width: `375px` centered
- Tablet preview width: `768px` centered
- Desktop preview: full width

### Export Button

- Border radius: `8px` (md)
- Variant: outline (bordered)
- Icon: `16px` left of label
- Dropdown menu shadow: `lg`, border-radius `8px`, border `1px solid` border-primary
- Menu item padding: `8px 16px`, hover surface-secondary

### Empty State

- Icon size: `48px`, secondary text color at `40%` opacity
- Heading: `1.25rem`, weight `600`, primary text
- Description: `0.875rem`, secondary text, max-width `400px`
- CTA button: primary solid, `md` size
- Padding: `64px` vertical
