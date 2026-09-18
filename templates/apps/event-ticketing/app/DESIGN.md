# DESIGN.md — Event Ticketing

## Brand Identity

- **App Name:** Turnstile
- **Tagline:** Every moment, front row
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Expressive, bold, energetic, celebratory

## Target Persona

Event-goers discovering and buying tickets to concerts, festivals, and conferences, plus event organizers managing attendees and check-ins.

## Screens

| Name              | Route                    | Auth | Purpose                                                                                            | deriveFrom        |
| ----------------- | ------------------------ | ---- | -------------------------------------------------------------------------------------------------- | ----------------- |
| Landing           | /                        | No   | Marketing home with hero gradient and event grid                                                   | —                 |
| Login             | /login                   | No   | Sign in                                                                                            | —                 |
| Signup            | /signup                  | No   | Create account                                                                                     | Login             |
| ForgotPassword    | /forgot-password         | No   | Request reset                                                                                      | Login             |
| ResetPassword     | /reset-password          | No   | Set new password                                                                                   | Login             |
| Dashboard         | /dashboard               | Yes  | Organizer dashboard with analytics                                                                 | —                 |
| EventList         | /events                  | Yes  | Browse events with filters                                                                         | —                 |
| EventDetail       | /events/:id              | Yes  | Hero banner, ticket selector, venue map                                                            | —                 |
| Checkout          | /checkout                | Yes  | Ticket purchase with tier selector                                                                 | —                 |
| Attendees         | /events/:id/attendees    | Yes  | Attendee list and check-in status                                                                  | —                 |
| Settings          | /settings                | Yes  | Account, payment methods, preferences                                                              | —                 |
| CreateEvent       | /events/new              | Yes  | Organizer form to create a new event with banner, schedule, venue, and ticket tiers                | —                 |
| EditEvent         | /events/:id/edit         | Yes  | Edit existing event details and tiers (with Cancel/Delete danger zone)                             | CreateEvent       |
| MyTickets         | /my-tickets              | Yes  | Attendee's library of purchased tickets — upcoming, past, and transferred — with QR access         | —                 |
| OrderConfirmation | /orders/:id/confirmation | Yes  | Post-checkout success page with QR ticket(s) and next-step actions                                 | —                 |
| TicketDetail      | /tickets/:id             | Yes  | Single ticket view with QR, venue, and transfer/refund actions                                     | OrderConfirmation |
| Notifications     | /notifications           | Yes  | Activity feed of ticket purchases, event updates, transfers, check-ins, refunds, and announcements | —                 |

## App Constraints

- Hero banners use the violet-to-indigo gradient (#6d28d9 to #312e81) prominently
- Event cards have date badges (accent #f43f5e) in top-left corner, stacked format
- Ticket confirmation layouts use dashed tear-line decorations with circle cutouts (perforated-ticket aesthetic)

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#6d28d9`
- Primary Hover: `#7c3aed`
- Primary Dark: `#5b21b6`
- Accent: `#f43f5e`
- Accent Hover: `#fb7185`
- Accent Dark: `#e11d48`
- Accent Secondary: `#06b6d4`

### Semantic

- Tickets Available: `#16a34a`
- Tickets Low: `#f59e0b`
- Sold Out: `#dc2626`
- Sold Out Light: `#fee2e2`
- Checked In: `#06b6d4`
- Checked In Light: `#cffafe`
- On Sale: `#f43f5e`
- On Sale Light: `#ffe4e6`
- Free Event: `#8b5cf6`
- Free Event Light: `#ede9fe`
- Draft: `#6b7280`
- Published: `#16a34a`
- Cancelled: `#dc2626`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#faf5ff`
- Hero Gradient Start: `#6d28d9`
- Hero Gradient End: `#312e81`
- Venue Map: `#f8fafc`
- Analytics Panel: `#faf5ff`

### Text

- Price: `#111827`
- Price Highlight: `#6d28d9`
- Date Accent: `#f43f5e`
- Venue: `#6b7280`
- Link: `#6d28d9`
- Link Hover: `#5b21b6`

### Borders

- Ticket Dashed: `#c4b5fd`
- Section Divider: `#ede9fe`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#fb7185`
- Accent Secondary: `#22d3ee`
- Background: `#0c0a1d`
- Surface: `#1a1533`
- Surface Secondary: `#231e3d`
- Text Primary: `#f5f3ff`
- Text Secondary: `#c4b5fd`
- Border Primary: `#312e81`
- Ticket Dashed: `#4c1d95`

## Typography

### Font Families

- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Date Display: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums; font-weight: 700)
- Ticket Mono: `"JetBrains Mono", SFMono-Regular, Menlo, monospace` (for ticket codes, QR refs, check-in IDs)

## Layout

- Content Max Width: `1200px`
- Event Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Event Grid Gap: `24px`
- Sidebar Filter Width: `280px`
- Analytics Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Hero Banner Height: `480px` (desktop), `320px` (mobile)
- Map Container Height: `400px`
- Ticket Selection Panel Width: `420px`

## Components

### Event Card

- Border radius: `16px` (xl)
- Shadow: `sm`, hover: `lg` with `translateY(-2px)` lift
- Transition: `300ms ease` (normal)
- Image aspect ratio: `16:9`
- Image overlay: linear gradient `transparent 40%` to `rgba(0,0,0,0.7)` at bottom
- Padding: `0` (image flush) + `20px` (content area)
- Date badge: accent background, bold white text, `12px` border-radius, top-left absolute, `12px` offset
- Date badge format: stacked (month abbr above day number, `0.7rem` / `1.25rem`)
- Price badge: primary background, white text, bottom-right of image overlay
- "Sold Out" state: grayscale image filter `0.6`, sold-out badge replaces price

### Ticket Selector

- Border radius: `12px` (lg)
- Border: `1px dashed` ticket-dashed color
- Padding: `20px`
- Background: surface-secondary
- Quantity stepper: `36px` square buttons, `8px` radius, primary outline
- Tier name font weight: `600`
- Tier description font size: `sm` (14px), text-secondary
- Price font weight: `700`, price-highlight color
- Max per order note: `xs` (12px), text-secondary, italic

### Date Display Block

- Font family: date-display
- Month: uppercase, `xs` (12px), letter-spacing `0.1em`, accent color
- Day: `3xl` (30px), bold, text-primary
- Weekday + time: `sm` (14px), text-secondary
- Container: `80px` wide, centered text, `1px solid` border-primary right edge separator

### Venue / Map Card

- Border radius: `12px` (lg)
- Map height: `280px`
- Padding below map: `16px`
- Venue name font weight: `600`, `lg` (18px)
- Address font size: `sm` (14px), text-secondary
- "Get Directions" link: primary color, `sm`, with external arrow icon

### Check-In Badge

- Border radius: `9999px` (pill)
- Padding: `4px 12px`
- Font size: `sm` (14px)
- Font weight: `600`
- Variants:
  - Checked In: checked-in background, white text
  - Pending: `#f3f4f6` background, text-secondary
  - VIP: accent background, white text
- QR code display: `180px` square, `16px` white padding border, `12px` radius container

### Analytics Stat Card

- Border radius: `12px` (lg)
- Padding: `24px`
- Background: surface
- Border-left: `4px solid` (color varies by metric)
- Metric value: `2xl` (24px), font-weight `700`
- Metric label: `sm` (14px), text-secondary
- Trend indicator: `sm`, success (up arrow) or error (down arrow) with percentage
- Sparkline height: `40px`, stroke: primary, fill: primary at `0.1` opacity

### Search / Filter Bar

- Border radius: `12px` (lg)
- Height: `56px`
- Background: surface
- Shadow: `md`
- Internal dividers: `1px solid` border-primary, `24px` height
- Location input with map pin icon prefix
- Date range picker with calendar icon prefix
- Category pills: `9999px` radius, `8px 16px` padding, `sm` font, primary outline (active: primary filled)

### Hero Banner

- Full-bleed width
- Background: hero gradient (start to end, 135deg angle)
- Content max width: `1200px`, centered
- Title: `4xl` (36px) desktop / `2xl` (24px) mobile, white, bold
- Subtitle: `lg` (18px), `rgba(255,255,255,0.85)`
- CTA button: accent background, white text, `xl` height (56px), `12px` radius, `600` weight
- Floating search bar overlapping bottom edge by `28px` negative margin

### Ticket / Order Confirmation

- Border radius: `16px` (xl)
- Shadow: `lg`
- Top accent stripe: `4px solid` primary
- Dashed tear line: `1px dashed` ticket-dashed, with circle cutouts (`20px` diameter) at left/right edges
- Event name: `xl` (20px), font-weight `700`
- Ticket details: two-column grid, `sm` labels in text-secondary, `base` values in text-primary
- QR code: centered, `200px`, with ticket-mono ref code below
- "Add to Calendar" button: outline variant, primary color

### Attendee List Table

- Header background: analytics-panel
- Row hover: surface-secondary
- Cell padding: `12px 16px`
- Check-in status column: badge component (see Check-In Badge)
- Ticket type column: `sm`, text-secondary, with colored dot prefix matching tier
- Search/filter row above table: input with search icon, `40px` height
- Bulk actions bar: sticky bottom, surface background, `md` shadow top, `16px` padding
