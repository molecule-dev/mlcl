# DESIGN.md — Weather Dashboard

## Brand Identity

- **App Name:** Nimbus
- **Tagline:** See what's coming
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Atmospheric, informed, fluid, quietly authoritative

## Target Persona

Professionals, outdoor planners, and data-curious people who want rich forecasts and glanceable conditions across multiple saved locations.

## Screens

| Name           | Route            | Auth | Purpose                                                                                                                  | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Landing        | /                | No   | Marketing home with value props and signup CTA                                                                           | —          |
| Login          | /login           | No   | Sign in                                                                                                                  | —          |
| Signup         | /signup          | No   | Create account                                                                                                           | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                                                                            | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                                                                         | Login      |
| Dashboard      | /dashboard       | Yes  | Primary widgets grid for active location (hero, hourly, daily, metrics, alerts, map)                                     | —          |
| LocationDetail | /location/:id    | Yes  | Deep dive per saved location with charts and multi-day breakdown                                                         | —          |
| Locations      | /locations       | Yes  | Saved locations manager with reorder and remove                                                                          | —          |
| Radar          | /radar           | Yes  | Full-screen interactive weather map with layers and time scrubber                                                        | —          |
| Alerts         | /alerts          | Yes  | Active weather alerts and subscription management                                                                        | —          |
| Settings       | /settings        | Yes  | Units, notifications, appearance, data sources                                                                           | —          |
| Trends         | /trends          | Yes  | Historical analytics — temperature/precip trends, climatological comparison, wind patterns over configurable time ranges | —          |
| Compare        | /compare         | Yes  | Side-by-side multi-location comparison with metrics, hourly strips, activity verdicts                                    | —          |

## App Constraints

- Dark theme is the default; glass-morphism (`backdrop-filter: blur`) is used on every widget card over atmospheric gradient backgrounds
- Temperature hero values render in Inter weight 200 with tight `-0.03em` letter-spacing; never use bold for temp numerals
- Timestamps, coordinates, wind speeds, and any raw reading values use JetBrains Mono

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0891b2`
- Primary Hover: `#22d3ee`
- Primary Dark: `#0e7490`
- Accent: `#06d6a0`
- Accent Hover: `#34d399`
- Accent Dark: `#059669`

### Semantic

- Clear Sky: `#38bdf8`
- Cloudy: `#94a3b8`
- Rain: `#6366f1`
- Snow: `#e2e8f0`
- Storm: `#7c3aed`
- Temp Hot: `#ef4444`
- Temp Warm: `#f97316`
- Temp Mild: `#eab308`
- Temp Cool: `#0891b2`
- Temp Cold: `#3b82f6`
- Temp Freezing: `#a78bfa`
- UV Low: `#22c55e`
- UV Moderate: `#eab308`
- UV High: `#f97316`
- UV Very High: `#ef4444`
- UV Extreme: `#7c3aed`
- AQI Good: `#22c55e`
- AQI Moderate: `#eab308`
- AQI Unhealthy: `#f97316`
- AQI Hazardous: `#dc2626`
- Alert Watch: `#f59e0b`
- Alert Warning: `#f97316`
- Alert Emergency: `#dc2626`

### Backgrounds

- Primary: `#0c1524`
- Secondary: `#111d32`
- Tertiary: `#162340`
- Surface: `#1a2942`
- Surface Secondary: `#1e3050`
- Input: `#162340`
- Sky Gradient Start: `#0c1524`
- Sky Gradient End: `#1a2942`

### Text

- Primary: `#f1f5f9`
- Secondary: `#94a3b8`
- Tertiary: `#64748b`
- Inverse: `#0f172a`
- Link: `#22d3ee`
- Link Hover: `#67e8f9`
- Temperature: `#f1f5f9`
- Unit: `#64748b`

### Borders

- Primary: `#1e3a5f`
- Secondary: `#2a4a6f`
- Focus: `#0891b2`
- Glass: `rgba(255, 255, 255, 0.08)`

### Dark Theme Overrides

Dark is the default theme for Nimbus. Light theme overrides:

- Primary: `#0891b2`
- Background: `#f0f9ff`
- Secondary: `#e0f2fe`
- Tertiary: `#bae6fd`
- Surface: `#ffffff`
- Surface Secondary: `#f0f9ff`
- Text Primary: `#0f172a`
- Text Secondary: `#475569`
- Border Primary: `#bae6fd`
- Input: `#ffffff`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Temperature: `"Inter", -apple-system, sans-serif` (font-weight: 200, letter-spacing: -0.03em)
- Data: `"JetBrains Mono", SFMono-Regular, Menlo, monospace` (for readings, timestamps, coordinates)

### Font Sizes (overrides)

- Temperature Hero: `4.5rem` (72px) — current temperature, large display
- Temperature Card: `2rem` (32px) — forecast day temps
- Temperature Inline: `1.125rem` (18px) — hourly forecast

## Layout

- Content Max Width: `1440px`
- Dashboard Grid Columns: `12`
- Dashboard Grid Gap: `16px`
- Sidebar Width: `320px` (locations panel)
- Sidebar Collapsed: `64px`
- Top Bar Height: `56px`
- Widget Min Height: `200px`
- Map Panel Height: `480px`
- Forecast Strip Height: `120px`

### Widget Grid Sizing

- Small widget: `span 3 cols` (1/4 width)
- Medium widget: `span 4 cols` (1/3 width)
- Large widget: `span 6 cols` (1/2 width)
- Full widget: `span 12 cols` (full width)
- Tablet: all widgets `span 6 cols`
- Mobile: all widgets `span 12 cols`

## Components

### Weather Widget Card

- Border radius: `16px` (xl)
- Background: `rgba(26, 41, 66, 0.7)` with `backdrop-filter: blur(20px)`
- Border: `1px solid rgba(255, 255, 255, 0.08)`
- Shadow: `0 4px 24px -4px rgba(0, 0, 0, 0.3)`
- Padding: `20px`
- Header: label in text-secondary (`sm`, weight `500`), top-right icon/action
- Transition: `300ms ease` on hover, subtle lift (`translateY(-2px)`)

### Current Conditions Hero

- Temperature font: `4.5rem`, weight `200`, letter-spacing `-0.03em`
- Condition icon: `64px` animated SVG/Lottie
- High/Low pills: `sm` text, `4px 10px` padding, `rgba(255,255,255,0.1)` background, `full` radius
- "Feels like" text: `sm`, text-secondary, below temperature
- Location name: `xl`, weight `600`
- Last updated: `xs`, text-tertiary, monospace font

### Hourly Forecast Strip

- Horizontal scroll with snap: `scroll-snap-type: x mandatory`
- Each hour cell: `80px` width, `scroll-snap-align: start`
- Time label: `xs`, text-secondary
- Icon: `32px`
- Temperature: `base`, weight `500`
- Precipitation %: `xs`, rain color when > 30%
- Active hour: `rgba(8, 145, 178, 0.15)` background highlight

### Daily Forecast Row

- Height: `56px`
- Day label: `sm`, weight `500`, `80px` fixed width
- Condition icon: `28px`
- Condition text: `sm`, text-secondary, `120px` fixed width
- Temperature bar: gradient from cool to warm, `4px` height, `full` radius
- Low/High labels: `sm`, monospace, flanking the bar
- Precipitation %: `sm`, rain color, right-aligned
- Hover: surface-secondary background

### Alert Banner

- Border radius: `12px`
- Padding: `12px 16px`
- Border-left: `4px solid` (alert-watch / alert-warning / alert-emergency)
- Background: matching color at `0.1` opacity
- Icon: `20px`, matching severity color
- Title: `sm`, weight `600`
- Collapse/expand for details: chevron icon, `fast` transition
- Stacks vertically, `8px` gap between multiple alerts

### Location Card (Sidebar)

- Border radius: `12px`
- Padding: `12px 16px`
- Background: surface on hover
- Active: `rgba(8, 145, 178, 0.12)` background, primary left border `3px`
- City name: `base`, weight `600`
- Country/region: `xs`, text-tertiary
- Current temp: `lg`, weight `300`, right-aligned
- Mini condition icon: `24px`, beside temperature
- Drag handle: `16px` grip dots, text-tertiary

### Precipitation Chart

- Area fill: `rgba(99, 102, 241, 0.2)` (rain color, translucent)
- Line stroke: rain color, `2px`
- Grid lines: `rgba(255, 255, 255, 0.05)`
- Axis labels: `xs`, monospace, text-tertiary
- Tooltip: surface background, `sm` text, `8px` radius, `md` shadow
- Y-axis unit label: `xs`, text-tertiary

### Temperature Chart

- Line gradient: cool-to-warm semantic colors
- Line stroke: `2.5px`
- Data points: `6px` circles, surface fill, `2px` primary stroke
- Active point: `10px`, primary fill, glow `0 0 8px rgba(8, 145, 178, 0.5)`
- Fill area: matching gradient at `0.1` opacity

### Map Overlay

- Border radius: `16px` (container)
- Controls: top-right, `8px` gap, glass-morphism buttons
- Layer toggle buttons: `32px` height, `8px` radius, glass background
- Active layer: primary background, inverse text
- Attribution: `xs`, bottom-left, `rgba(0,0,0,0.5)` pill
- Zoom controls: vertical stack, `36px` square buttons, glass background

### Metric Gauge (UV, Humidity, Pressure, etc.)

- Circular arc: `6px` stroke, `120px` diameter
- Track: `rgba(255, 255, 255, 0.08)`
- Fill: gradient per metric (UV uses UV scale colors, humidity uses cyan)
- Center value: `2xl`, weight `300`
- Center label: `xs`, text-secondary
- Range labels: `xs`, text-tertiary, at arc ends

### Search Bar (Location Search)

- Border radius: `full` (pill)
- Height: `44px`
- Background: `rgba(255, 255, 255, 0.06)`
- Border: `1px solid rgba(255, 255, 255, 0.1)`
- Focus: primary border, `0 0 0 3px rgba(8, 145, 178, 0.15)` ring
- Search icon: `18px`, text-secondary
- Placeholder: text-tertiary
- Dropdown: `12px` radius, surface background, `lg` shadow, `8px` top offset

### Settings Panel

- Full-height slide-over from right, `400px` width
- Background: surface
- Section headers: `sm`, text-secondary, weight `600`, uppercase, `1px` letter-spacing
- Toggle switches: `44px` wide, `24px` tall, primary when active
- Dividers: border-primary, `24px` vertical spacing between sections

## Design Principles (Nimbus-specific)

1. **Dark-first** — dark theme is the default; all glass-morphism and glow effects are designed for dark backgrounds
2. **Data density without clutter** — show maximum information per widget using compact typography and tight spacing, but never sacrifice legibility
3. **Color encodes meaning** — temperature, UV, AQI, and alert severity all use semantic color scales; never use these colors decoratively
4. **Atmospheric depth** — glass-morphism (`backdrop-filter: blur`) and subtle gradients create layered depth; avoid flat solid backgrounds on widgets
5. **Motion mirrors weather** — transitions should feel natural and fluid; use `ease` curves, never `linear` for UI elements
