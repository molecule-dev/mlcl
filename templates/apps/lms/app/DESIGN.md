# DESIGN.md — LMS (Learning Management System)

## Brand Identity

- **App Name:** Academy
- **Tagline:** Learn without limits
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#4f46e5`
- Primary Hover: `#6366f1`
- Primary Dark: `#4338ca`

### Semantic

- Not Started: `#6b7280`
- In Progress: `#4f46e5`
- Completed: `#16a34a`
- Locked: `#9ca3af`
- Quiz Correct: `#16a34a`
- Quiz Incorrect: `#dc2626`
- Certificate: `#f59e0b`

### Backgrounds

- Primary: `#eef2ff`
- Surface: `#ffffff`
- Surface Secondary: `#f5f7ff`
- Lesson Content: `#ffffff`
- Code Block: `#1e293b`

### Text

- Primary: `#1e1b4b`
- Secondary: `#6b7280`
- Link: `#4f46e5`
- Link Hover: `#4338ca`

### Dark Theme Overrides

- Primary: `#818cf8`
- Background: `#0f0e1e`
- Surface: `#1e1b3a`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Lesson Content: `"Georgia", "Times New Roman", serif`
- Code: `"JetBrains Mono", "Fira Code", SFMono-Regular, monospace`

### Line Heights

- Lesson Content: `1.8`

## Layout

- Content Max Width: `960px` (lesson content)
- Sidebar Width: `280px` (course navigation)
- Video Player Max Width: `100%`, aspect ratio `16:9`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `24px`

## Components

### Course Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Image: `16:9` aspect ratio (thumbnail)
- Padding: `0` (image) + `16px` (content)
- Progress bar: bottom, `4px` height, primary fill
- Duration badge: top-right, dark overlay, `xs` font

### Progress Ring

- Size: `48px` (card), `80px` (detail)
- Stroke width: `4px`
- Track: border-primary
- Fill: primary (in progress) or completed color
- Center text: percentage, `600` weight

### Lesson Navigation

- Item padding: `10px 16px`
- Active: primary background at `0.1` opacity, left border `3px solid` primary
- Completed: check icon, completed color
- Locked: lock icon, muted, no hover
- Section header: `xs` font, `700` weight, uppercase, `24px` top margin

### Quiz Option

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border: `2px solid` border-primary
- Selected: `2px solid` primary, primary at `0.05` background
- Correct: `2px solid` quiz-correct, success-light background
- Incorrect: `2px solid` quiz-incorrect, error-light background

### Certificate Badge

- Border radius: `12px` (lg)
- Padding: `24px`
- Border: `2px solid` certificate color
- Background: `#fffbeb` (warm off-white)
- Icon: `48px` trophy/certificate, certificate color
- Title: `xl` font, `700` weight
