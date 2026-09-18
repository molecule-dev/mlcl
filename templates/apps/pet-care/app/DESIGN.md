# DESIGN.md — Pet Care

## Brand Identity

- **App Name:** Nuzzle
- **Tagline:** Every pet, perfectly cared for
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Warm, attentive, trustworthy, professional

## Target Persona

Pet owners managing vet visits, medications, and sitter bookings for one or more pets.

## Screens

| Name            | Route            | Auth | Purpose                                                          | deriveFrom |
| --------------- | ---------------- | ---- | ---------------------------------------------------------------- | ---------- |
| Landing         | /                | No   | Marketing home with signup CTA                                   | —          |
| Login           | /login           | No   | Sign in                                                          | —          |
| Signup          | /signup          | No   | Create account                                                   | Login      |
| ForgotPassword  | /forgot-password | No   | Request reset                                                    | Login      |
| ResetPassword   | /reset-password  | No   | Set new password                                                 | Login      |
| Dashboard       | /dashboard       | Yes  | Pets snapshot, upcoming appointments, notifications              | —          |
| Pets            | /pets            | Yes  | Grid of pet profile cards                                        | —          |
| PetDetail       | /pets/:id        | Yes  | Profile, vet records, timeline, gallery                          | —          |
| Sitters         | /sitters         | Yes  | Sitter marketplace with ratings and filters                      | —          |
| Bookings        | /bookings        | Yes  | Calendar/list of appointments and sittings                       | —          |
| VetRecords      | /vet-records     | Yes  | Vaccination and medical records list                             | —          |
| Settings        | /settings        | Yes  | Profile, notifications, integrations                             | —          |
| SitterDetail    | /sitters/:id     | Yes  | Sitter profile with reviews, availability, services and book CTA | —          |
| BookingDetail   | /bookings/:id    | Yes  | Booking summary, sitter, pet, schedule, messages, status actions | —          |
| VetRecordDetail | /vet-records/:id | Yes  | Single record: vet notes, attachments, prescription, follow-ups  | —          |
| Medications     | /medications     | Yes  | Active medications schedule, dose tracking, refill reminders     | —          |
| Notifications   | /notifications   | Yes  | Activity feed: vet reminders, sitter messages, booking updates   | —          |
| Messages        | /messages        | Yes  | Conversations with sitters and vets — list + thread view         | —          |

## App Constraints

- Pet profile cards always use circular avatars with a species icon badge (bottom-right) and color-coded health status left border
- Vet record rows use monospace for IDs, dates, and microchip numbers — clinical precision
- Navy sidebar (#0f1b2d) regardless of theme for consistent brand anchoring

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0891b2` (teal cyan — trust, care, clinical precision)
- Primary Hover: `#22b8cf`
- Primary Dark: `#0e7490`
- Accent: `#10b981` (emerald green — health, vitality)
- Accent Hover: `#34d399`
- Accent Dark: `#059669`
- Navy: `#0f1b2d` (deep navy — professional backbone)

### Semantic

- Healthy: `#10b981`
- Healthy Light: `#d1fae5`
- Needs Attention: `#f59e0b`
- Needs Attention Light: `#fef3c7`
- Critical: `#ef4444`
- Critical Light: `#fee2e2`
- Vaccinated: `#8b5cf6`
- Vaccinated Light: `#ede9fe`
- Booked: `#0891b2`
- Booked Light: `#cffafe`
- Available: `#10b981`
- Unavailable: `#6b7280`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f0fdfa` (hint of teal warmth)
- Sidebar: `#0f1b2d` (navy)
- Sidebar Active: `#162338`
- Calendar Slot Free: `#ecfdf5`
- Calendar Slot Booked: `#e0f2fe`

### Text

- Primary: `#1e293b`
- Secondary: `#64748b`
- Sidebar: `#cbd5e1`
- Sidebar Active: `#ffffff`
- Pet Name: `#0f172a` (bold display)
- Vet Note: `#334155`
- Link: `#0891b2`
- Link Hover: `#0e7490`

### Borders

- Primary: `#e2e8f0`
- Card: `#e0f2fe` (subtle teal tint)
- Focus: `#0891b2`

### Dark Theme Overrides

- Primary: `#22d3ee`
- Accent: `#34d399`
- Background: `#0a0f1a`
- Surface: `#111827`
- Surface Secondary: `#1a2332`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#1e3a5f`
- Sidebar: `#060a12`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Plus Jakarta Sans", "Inter", -apple-system, sans-serif`
- Mono: `"JetBrains Mono", SFMono-Regular, Menlo, monospace` (vet record IDs, microchip numbers)

## Layout

- Content Max Width: `1400px`
- Dashboard Grid Columns: `12`
- Dashboard Gap: `24px`
- Sidebar Width: `260px` (collapsed: `72px`)
- Top Bar Height: `64px`
- Pet Profile Card Width: `320px`
- Calendar Day Cell Min Height: `120px`
- Sitter Card Grid: `3` (desktop), `2` (tablet), `1` (mobile)
- Gallery Grid: `4` (desktop), `3` (tablet), `2` (mobile)

## Components

### Pet Profile Card

- Border radius: `16px` (xl)
- Shadow: `md`, hover: `lg`
- Avatar: `80px` circle with `3px solid` primary border
- Species icon badge: `24px`, bottom-right of avatar, surface background
- Padding: `20px`
- Pet name: heading font, `700` weight, `xl` size
- Breed + age: secondary text, `sm` size
- Health status pill: bottom of card, full width, semantic background
- Border-left: `4px solid` health status color

### Vet Record Row

- Border radius: `8px` (md)
- Background: surface
- Padding: `16px 20px`
- Left border: `3px solid` record type color (vaccination: vaccinated, checkup: primary, surgery: critical)
- Date: mono font, `sm` size, secondary text
- Vet name: `500` weight
- Attachments: icon count badge, `xs` size
- Hover: surface-secondary background

### Sitter Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Avatar: `56px` circle
- Name: `600` weight, `lg` size
- Rating: star display (filled: `#f59e0b`, empty: `#d1d5db`), `14px` stars
- Availability badge: pill, `available` or `unavailable` semantic color
- Specialties: tag pills, `xs` size, primary-light background
- Price: `700` weight, primary color, `lg` size
- Padding: `16px`
- CTA button: full width, primary, `md` height

### Health Timeline

- Vertical line: `2px solid` border-primary, left-aligned
- Node dot: `12px` circle, semantic color fill, `2px` white border
- Entry card: `8px` radius, `12px 16px` padding, connected to node by `24px` horizontal line
- Date label: mono font, `xs` size, secondary text
- Entry type badge: `xs` pill, semantic color

### Booking Calendar

- Day cell border radius: `4px`
- Today highlight: `2px solid` primary
- Booked slot: booked-light background, `4px` left border primary
- Available slot: calendar-slot-free background
- Blocked slot: `#f1f5f9` background, diagonal stripe pattern
- Time slot height: `48px`
- Time label: mono font, `xs` size, secondary color

### Notification Card

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Unread: `2px` left border primary + surface-secondary background
- Read: no left border + surface background
- Icon: `32px` circle, semantic color light background
- Timestamp: `xs` size, secondary text
- Dismiss: ghost icon button, `24px`

### Photo Gallery Tile

- Border radius: `8px` (md)
- Aspect ratio: `1:1` (grid) / `16:9` (featured)
- Hover overlay: `rgba(0, 0, 0, 0.3)` with centered action icons
- Caption: `sm` size, below image, `8px` top padding
- Upload drop zone: dashed `2px` border, primary color, `12px` radius, `80px` min height

### Search Bar

- Border radius: `9999px` (pill)
- Height: `48px`
- Background: surface-secondary
- Border: `1px solid` transparent, focus: `2px solid` primary
- Icon: `20px`, secondary text color
- Placeholder: "Search pets, sitters, records..."
- Filter chips: pill badges, `sm` size, inline after search text

### Stat Widget

- Border radius: `12px` (lg)
- Padding: `20px`
- Background: surface
- Border: `1px solid` border-primary
- Value: heading font, `3xl` size, `700` weight
- Label: `sm` size, secondary text
- Trend indicator: `xs` pill, healthy (up) or needs-attention (down)
- Icon: `40px`, primary-light background circle, primary color icon

### Data Table (Vet Records / Bookings)

- Header: navy background, white text, `600` weight, `sm` size, uppercase tracking
- Row hover: surface-secondary
- Row border: `1px solid` border-primary
- Cell padding: `12px 16px`
- Status cell: semantic color pill badge
- Sortable header: caret icon, `12px`
- Striped: alternating surface / surface-secondary
