# DESIGN.md — Calorie Counter

## Brand Identity

- **App Name:** Nosh
- **Tagline:** Every bite, balanced
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Friendly, encouraging, balanced, non-judgmental

## Target Persona

Health-conscious individuals tracking daily intake who want a supportive, quick-to-log food diary rather than an austere calorie police.

## Screens

| Name           | Route            | Auth | Purpose                                                 | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with value props                         | —          |
| Login          | /login           | No   | Sign in                                                 | —          |
| Signup         | /signup          | No   | Create account                                          | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                           | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                        | Login      |
| Today          | /today           | Yes  | Daily summary with calorie ring and meal log            | —          |
| LogFood        | /log             | Yes  | Search and log food items                               | —          |
| FoodDetail     | /food/:id        | Yes  | Nutrition detail for a single food                      | —          |
| Progress       | /progress        | Yes  | Weekly/monthly charts and streaks                       | —          |
| Goals          | /goals           | Yes  | Calorie and macro targets                               | —          |
| Settings       | /settings        | Yes  | Profile, preferences, integrations                      | —          |
| Recipes        | /recipes         | Yes  | List of saved custom recipes and meals                  | —          |
| RecipeDetail   | /recipes/:id     | Yes  | View/edit a recipe's ingredients and computed nutrition | —          |
| WeightTracking | /weight          | Yes  | Weight log over time with trend chart                   | —          |
| Onboarding     | /onboarding      | Yes  | First-time setup wizard for personal stats and goals    | —          |

## App Constraints

- The calorie ring is the hero of Today — always prominent, animated from 0 on mount
- Macros (Protein/Carbs/Fat) always use their semantic colors (#6366f1, #f59e0b, #ec4899) consistently across screens
- Meal sections use their meal color as a 3px left border accent (Breakfast #f97316, Lunch #0d9488, Dinner #6366f1, Snacks #ec4899)

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0d9488`
- Primary Hover: `#14b8a6`
- Primary Dark: `#0f766e`
- Accent: `#f97316`
- Accent Hover: `#fb923c`
- Accent Dark: `#ea580c`

### Semantic — Macronutrients

- Protein: `#6366f1`
- Protein Light: `#e0e7ff`
- Carbs: `#f59e0b`
- Carbs Light: `#fef3c7`
- Fat: `#ec4899`
- Fat Light: `#fce7f3`
- Fiber: `#8b5cf6`
- Fiber Light: `#ede9fe`

### Semantic — Calorie Budget

- Under Goal: `#10b981`
- Under Goal Light: `#d1fae5`
- Near Goal: `#f59e0b`
- Near Goal Light: `#fef3c7`
- Over Goal: `#ef4444`
- Over Goal Light: `#fee2e2`

### Semantic — Meals

- Breakfast: `#f97316`
- Lunch: `#0d9488`
- Dinner: `#6366f1`
- Snacks: `#ec4899`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f0fdfa`
- Progress Ring: `#f0fdfa`
- Meal Section: `#f8fafc`

### Text

- Calorie Value: `#111827`
- Macro Value: `#374151`
- Food Name: `#1f2937`
- Serving Size: `#6b7280`
- Link: `#0d9488`
- Link Hover: `#0f766e`

### Dark Theme Overrides

- Primary: `#2dd4bf`
- Accent: `#fb923c`
- Background: `#0c1917`
- Surface: `#1a2e2b`
- Surface Secondary: `#1e3a36`
- Meal Section: `#162825`
- Text Primary: `#f0fdfa`
- Text Secondary: `#99f6e4`
- Border Primary: `#2a4a46`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Numbers: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

### Font Specs

- Calorie display (hero): `3rem`, weight `800`, line-height `1`
- Macro label: `0.75rem`, weight `600`, uppercase, letter-spacing `0.05em`
- Macro value: `1.25rem`, weight `700`
- Food item name: `0.9375rem`, weight `500`
- Serving detail: `0.8125rem`, weight `400`, color serving-size

## Layout

- Content Max Width: `960px`
- Dashboard Grid Columns: `1` (mobile), `2` (tablet), `3` (desktop — daily summary, meals, quick-add)
- Dashboard Gap: `16px`
- Sidebar Width: `280px` (desktop food search/history panel)
- Sidebar Collapsed: `0px` (hidden on mobile, overlay drawer)
- Meal Section Spacing: `24px`
- Date Picker Bar Height: `48px`

## Components

### Calorie Ring (Daily Summary)

- Size: `200px` diameter (desktop), `160px` (mobile)
- Stroke width: `14px`
- Track color: progress-ring background
- Fill color: primary (under), near-goal (approaching), over-goal (exceeded)
- Center text: remaining calories, weight `800`, size `2.25rem`
- Sub-text: "remaining" label, size `0.75rem`, weight `500`, secondary text color
- Animation: fill from 0 on mount, `600ms ease-out`

### Macro Bar (Protein / Carbs / Fat)

- Height: `8px`
- Border radius: `9999px` (full)
- Track color: respective macro light color
- Fill color: respective macro color
- Label above: macro name (left), current/goal grams (right)
- Label font: `0.75rem`, weight `600`
- Row spacing: `12px` between macro bars

### Meal Section Card

- Border radius: `12px` (lg)
- Background: meal-section
- Padding: `16px`
- Header: meal name (left, weight `600`, size `1rem`) + meal total calories (right, weight `700`)
- Header accent: `3px` left border in respective meal color
- Divider: `1px solid` border-primary between food items
- Add food button: ghost variant, primary color, full width at bottom

### Food Item Row

- Padding: `12px 0`
- Layout: food name + brand (left), calories (right, weight `600`)
- Serving size below name: `0.8125rem`, serving-size color
- Swipe actions: edit (primary), delete (error) on mobile
- Tap target: full row, min height `48px`

### Food Search

- Input height: `48px`
- Border radius: `12px` (lg)
- Search icon: left inset, `20px`, secondary color
- Barcode icon button: right inset, `24px`, accent color
- Results: instant dropdown, max height `400px`, scrollable
- Result item: food name (bold) + brand (secondary), calories right-aligned
- Recent searches: shown when input is empty, italic secondary text header

### Quick Add Button (Floating)

- Size: `56px` diameter
- Border radius: `9999px` (full)
- Background: accent
- Shadow: `lg`
- Icon: `+` symbol, `24px`, white
- Position: fixed bottom-right, `24px` offset
- Active: scale `0.95`, shadow `md`

### Nutrition Detail Panel

- Border radius: `12px` (lg)
- Shadow: `md`
- Padding: `24px`
- Sections: Calories, Macros (ring charts), Micronutrients (horizontal bars)
- Micronutrient bar height: `6px`, border radius full
- Micronutrient label: `0.8125rem`, value right-aligned
- Daily % badge: pill, `0.75rem`, primary-light bg when >50%, muted when <50%

### Date Navigator

- Height: `48px`
- Background: surface
- Border bottom: `1px solid` border-primary
- Left/right arrows: `32px` tap targets
- Center: date label, weight `600`, tappable for calendar picker
- "Today" pill: accent background, white text, `0.75rem`, visible only when not on today

### Barcode Scanner Overlay

- Full-screen overlay with camera viewfinder
- Viewfinder: `280px` square, `3px` corner brackets in accent color, border radius `16px`
- Instruction text: white, weight `500`, centered below viewfinder
- Background: `rgba(0, 0, 0, 0.7)` outside viewfinder
- Close button: top-right, `40px`, ghost white

### Progress Chart (Weekly/Monthly)

- Border radius: `12px` (lg)
- Padding: `16px`
- Chart type: bar chart (daily calories) with goal line overlay
- Bar color: primary (under goal), over-goal (exceeded)
- Goal line: dashed `2px`, accent color
- X-axis: day abbreviations, `0.75rem`, secondary color
- Y-axis: calorie values, `0.75rem`, secondary color
- Active bar: `md` shadow, tooltip with exact value

### Notification Toast

- Border radius: `8px`
- Padding: `12px 16px`
- Background: surface, `1px solid` border-primary
- Icon left: contextual (check for logged, bell for reminder, fire for streak)
- Shadow: `lg`
- Position: top-center, `16px` from top
- Auto-dismiss: `3000ms`
- Meal reminder: includes quick-log CTA button
