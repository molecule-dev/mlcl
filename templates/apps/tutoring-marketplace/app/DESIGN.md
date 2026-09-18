# DESIGN.md — Tutoring Marketplace

## Brand Identity

- **App Name:** Chalk
- **Tagline:** Where minds meet
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Encouraging, curious, credible, approachable

## Target Persona

Students and parents seeking quality tutors for academic subjects, test prep, and skill growth — they value verified reputation, clear pricing, and flexible scheduling.

## Screens

| Name                | Route                  | Auth | Purpose                                                                                        | deriveFrom |
| ------------------- | ---------------------- | ---- | ---------------------------------------------------------------------------------------------- | ---------- |
| Landing             | /                      | No   | Marketing home with hero search, category pills, featured tutors                               | —          |
| Login               | /login                 | No   | Sign in                                                                                        | —          |
| Signup              | /signup                | No   | Create account                                                                                 | Login      |
| ForgotPassword      | /forgot-password       | No   | Request reset                                                                                  | Login      |
| ResetPassword       | /reset-password        | No   | Set new password                                                                               | Login      |
| Search              | /search                | Yes  | Tutor grid with filter sidebar (subject, price, rating, availability)                          | —          |
| TutorProfile        | /tutor/:id             | Yes  | Profile header, subjects, reviews, availability calendar, booking CTA                          | —          |
| Booking             | /book/:tutorId         | Yes  | Session booking with slot picker, subject, duration, price confirmation                        | —          |
| Sessions            | /sessions              | Yes  | Upcoming and past tutoring sessions with status badges and actions                             | —          |
| Messages            | /messages              | Yes  | Direct message threads with tutors or students                                                 | —          |
| Account             | /account               | Yes  | Profile, payment, notifications, role toggle (student/tutor)                                   | —          |
| SessionDetail       | /sessions/:id          | Yes  | Session detail with video room link, materials, pre/post notes, status timeline, review prompt | —          |
| BookingConfirmation | /book/:tutorId/confirm | Yes  | Booking receipt with summary, calendar add buttons, prep checklist, contact tutor link         | —          |
| BecomeTutor         | /become-tutor          | Yes  | Tutor onboarding: hero pitch, application form (subjects, rates, credentials, availability)    | —          |
| TutorDashboard      | /dashboard             | Yes  | Tutor home: upcoming sessions, pending requests, earnings stats, mini-calendar, recent reviews | —          |

## App Constraints

- Tutor cards overlap avatar above card (`-40px` top) — never flush
- Subject tags are pill-shaped with primary-light background; maximum 3 visible then "+N" overflow
- Availability calendar uses tinted backgrounds per slot state; never flat borders only

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#6366f1`
- Primary Hover: `#818cf8`
- Primary Dark: `#4f46e5`
- Accent: `#f59e0b`
- Accent Hover: `#fbbf24`
- Accent Dark: `#d97706`

### Semantic

- Available: `#16a34a`
- Available Light: `#dcfce7`
- Booked: `#6366f1`
- Booked Light: `#e0e7ff`
- In Session: `#9333ea`
- In Session Light: `#f3e8ff`
- Verified: `#0d9488`
- Verified Light: `#ccfbf1`
- Top Rated: `#f59e0b`
- Top Rated Light: `#fef3c7`
- Cancelled: `#dc2626`
- Cancelled Light: `#fee2e2`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Calendar Slot Available: `#f0fdf4`
- Calendar Slot Booked: `#eef2ff`
- Session Active: `#faf5ff`

### Text

- Rate: `#111827`
- Rate Per Hour: `#6b7280`
- Subject Tag: `#4f46e5`
- Link: `#6366f1`
- Link Hover: `#4f46e5`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#fbbf24`
- Background: `#0c0a1d`
- Surface: `#1a1733`
- Surface Secondary: `#241f42`
- Text Primary: `#f8fafc`
- Text Secondary: `#a5b4fc`
- Border Primary: `#312e54`
- Calendar Slot Available: `#052e16`
- Calendar Slot Booked: `#1e1b4b`

## Typography

### Font Families

- Heading: `"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Rate: `"Tabular Nums", "Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)

## Layout

- Content Max Width: `1200px`
- Tutor Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Tutor Grid Gap: `24px`
- Search Sidebar Filter Width: `280px`
- Calendar Day Column Width: `120px`
- Session Panel Width: `420px`
- Landing Hero Max Width: `720px`

## Components

### Tutor Card

- Border radius: `16px` (xl)
- Shadow: `sm`, hover: `md`
- Padding: `0` (avatar flush top) + `20px` (content)
- Avatar: `80px` circle, centered, `-40px` top overlap on card
- Subject tags: pill badges, primary-light background, primary text
- Rate: right-aligned, bold, with `/hr` suffix in muted text
- Verified badge: checkmark icon, verified color, inline with name
- Hover: translate `Y -2px`, shadow transition `300ms ease`

### Tutor Profile Header

- Avatar: `120px` circle, border `3px solid` primary
- Name: `2xl` bold
- Headline: `lg` secondary text, max 2 lines
- Stats row: lessons taught | response time | repeat students
- Stats divider: `1px solid` border-primary, `16px` horizontal spacing

### Star Rating

- Star size: `18px`
- Filled color: `#f59e0b` (accent)
- Half-filled: gradient split
- Empty color: `#e5e7eb`
- Review count: `sm` muted text, parenthesized

### Subject Tag

- Border radius: `9999px` (pill)
- Padding: `4px 12px`
- Font size: `xs` (12px)
- Font weight: `500`
- Background: `#eef2ff`
- Text: `#4f46e5`
- Dark mode background: `#1e1b4b`
- Dark mode text: `#a5b4fc`

### Booking Calendar

- Border radius: `12px` (lg) for container
- Day cell height: `48px`
- Available slot: green-tinted background, `1px solid` available color
- Booked slot: primary-tinted background, `1px solid` booked color
- Selected slot: primary solid background, inverse text
- Unavailable slot: muted background, no pointer cursor
- Time labels: `sm` monospace, secondary text
- Current time indicator: `2px solid` accent, horizontal rule

### Session Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `16px`
- Left border: `4px solid` status color (booked/in-session/completed/cancelled)
- Tutor avatar: `40px` circle, inline with name
- Subject: `sm` semibold, primary color
- Date/time: `sm` secondary text
- Status badge: pill, status-colored background, `xs` text
- Actions: ghost buttons, right-aligned

### Session Status Badge

- Upcoming: booked color background, booked text
- In Progress: in-session color background, white text, pulsing dot
- Completed: available color background, available text
- Cancelled: cancelled color background, cancelled text

### Review Card

- Border radius: `8px` (md)
- Padding: `16px`
- Border: `1px solid` border-primary
- Reviewer avatar: `32px` circle
- Star rating: inline, `14px` stars
- Review text: `sm` normal weight, `1.6` line height
- Date: `xs` secondary text

### Search Bar

- Border radius: `9999px` (pill)
- Height: `56px` (hero variant), `44px` (nav variant)
- Shadow: `md` (hero), `sm` (nav)
- Padding: `12px 24px`
- Search icon: `20px`, secondary color, left-aligned
- Placeholder: "Search subjects, tutors, or topics..."
- Focus: `2px solid` primary, shadow `lg`

### Availability Indicator

- Online now: `10px` circle, available color, pulsing animation
- Available today: `10px` circle, available color, static
- Busy: `10px` circle, accent color, static
- Offline: `10px` circle, `#d1d5db`, static

### Price Display

- Rate font size: `xl`
- Rate font weight: `700`
- Per-hour suffix: `sm`, `400` weight, muted text
- First lesson free badge: accent background, bold white text, `xs`

### Message Thread

- Bubble border radius: `16px` (sent), `16px` with `4px` top-left (received)
- Sent bubble: primary background, inverse text
- Received bubble: surface-secondary background, primary text
- Timestamp: `xs`, centered, secondary text
- Avatar: `28px` circle, beside received messages only

### Landing Hero

- Background: linear gradient `135deg` from `#4f46e5` to `#7c3aed`
- Text: inverse (white)
- Search bar: white background, prominent shadow `xl`
- Trusted-by logos: grayscale, `60%` opacity, `sm` text label above
- Stats row: large numbers (`3xl` bold), `sm` labels below

### Category Pills (Landing)

- Border radius: `9999px`
- Padding: `8px 20px`
- Border: `1px solid` border-primary
- Font size: `sm`
- Font weight: `500`
- Hover: primary background, inverse text
- Active: primary background, inverse text
- Icon: `16px`, left of label, `8px` gap
