# DESIGN.md — Meal Planner

## Brand Identity

- **App Name:** Simmer
- **Tagline:** Cook less. Plan once.
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight), pot glyph in public/logo.svg
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Warm, practical, unhurried — a well-organized kitchen, not a nutrition lecture

## Target Persona

Home cooks who want to decide dinner once a week instead of every evening: save recipes, plan the week on one screen, shop a list that builds itself.

## Screens

| Name           | Route                           | Auth | Purpose                                              |
| -------------- | ------------------------------- | ---- | ---------------------------------------------------- |
| Landing        | /                               | No   | Marketing home with value props                      |
| Login          | /login                          | No   | Sign in                                              |
| Signup         | /signup                         | No   | Create account                                       |
| ForgotPassword | /forgot-password                | No   | Request reset                                        |
| ResetPassword  | /reset-password                 | No   | Set new password                                     |
| MealPlan       | /plan                           | Yes  | Week grid — assign recipes to breakfast/lunch/dinner |
| Recipes        | /recipes                        | Yes  | Searchable recipe grid with tag and time filters     |
| RecipeDetail   | /recipes/:id                    | Yes  | Ingredients (scaled), steps, servings scaler         |
| RecipeEdit     | /recipes/new, /recipes/:id/edit | Yes  | Create / edit a recipe with ingredient + step rows   |
| GroceryList    | /groceries                      | Yes  | Auto-generated list grouped by aisle, check-off      |
| Pantry         | /pantry                         | Yes  | On-hand items; list badges "you already have this"   |
| Settings       | /settings                       | Yes  | Profile, export, language, danger zone               |
| Onboarding     | /onboarding                     | Yes  | Household size + diet walkthrough after signup       |

## App Constraints

- The week grid is the hero of /plan — seven day columns × three slot rows, horizontally scrollable below the min width
- Meal slots always use their semantic colors (Breakfast #f59e0b, Lunch #16a34a, Dinner #6366f1) via the --color-breakfast/-lunch/-dinner tokens
- Ingredient quantities always rescale with the servings scaler; never show unscaled numbers next to a non-default scaler
- The grocery list is grouped by aisle in canonical order: produce, meat, seafood, dairy, bakery, frozen, pantry, spices, drinks, other

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#15803d` (basil green-700)
- Primary Hover: `#22c55e`
- Primary Dark: `#166534`
- Accent: `#c2410c` (tomato orange-700 — white CTA text passes contrast)
- Accent Hover: `#fb923c`
- Accent Dark: `#9a3412`

### Semantic — Meal Slots

- Breakfast: `#f59e0b`
- Lunch: `#16a34a`
- Dinner: `#6366f1`

### Semantic — Pantry

- Have-it badge: `#065f46` on `#d1fae5`

### Backgrounds

- Background: `#f7fef9`
- Surface: `#ffffff`
- Surface Secondary: `#f7fef9`
- Surface Variant (list rows): `#eff9f1`

### Dark Theme Overrides

- Primary bridge: `#16a34a` with near-white `--color-on-primary`
- Accent: `#fb923c`
- Background / Surface: `#0e100f`
- Surface Secondary / Container: `#161a17`

## Typography

- Body/Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Numbers: `tabular-nums` everywhere quantities render
- Headline font (shared pricing/legal pages): Georgia serif stack via `--font-headline`

## Layout

- Sidebar width: `240px` (hidden below md)
- Content max width: none (dashboard canvas), grids cap at `lg` breakpoints
- Week grid min width: `56rem` with horizontal scroll on smaller screens
- Card corner radius: `16px` (2xl), pills `9999px`

## Components

### Week Grid (MealPlan)

- Day header chips highlight today with `bg-primary-container`
- Empty cell: dashed outline, slot icon + plus, full-cell tap target
- Entry chip: surface-variant card with emoji, clamped title, "serves n"
- Entry remove: hover-revealed × button (visible on focus)

### Servings Scaler (RecipeDetail)

- Pill stepper (− / "n servings" / +), min 1, max 50
- All ingredient quantities rescale as `qty × target / base`

### Grocery Sections

- Aisle header: uppercase, tracking-wide, icon + count
- Item row: checkbox, name, "qty unit", source tag for manual adds, pantry badge when matched
- Progress bar: primary fill on surface-variant track

### Pantry Rows

- Steppers (−/+) adjust quantity by whole units; delete button on the right
