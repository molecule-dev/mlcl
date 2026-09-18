# DESIGN.md — Meeting Scheduler

## Brand Identity

- **App Name:** Meridian
- **Tagline:** Where schedules align
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Efficient
- Polished
- Considerate
- Clear

## Target Persona

Professionals sharing booking links and managing availability across timezones.

## Screens

| Name                | Route                 | Auth | Purpose                                                                                      | deriveFrom  |
| ------------------- | --------------------- | ---- | -------------------------------------------------------------------------------------------- | ----------- |
| Landing             | /                     | No   | Marketing home                                                                               | —           |
| Login               | /login                | No   | Sign in                                                                                      | —           |
| Signup              | /signup               | No   | Create account                                                                               | Login       |
| ForgotPassword      | /forgot-password      | No   | Request reset                                                                                | Login       |
| ResetPassword       | /reset-password       | No   | Set new password                                                                             | Login       |
| Dashboard           | /dashboard            | Yes  | Upcoming meetings, booking link stats, recent bookings                                       | —           |
| Calendar            | /calendar             | Yes  | Week/month calendar with meetings overlaid                                                   | Dashboard   |
| EventTypes          | /event-types          | Yes  | Manage bookable event types (15/30/60 min)                                                   | Dashboard   |
| EventTypeEditor     | /event-types/:id      | Yes  | Edit duration, availability, buffers, form fields                                            | Dashboard   |
| BookingPage         | /book/:slug           | No   | Public booking page with available slots                                                     | Login       |
| Availability        | /availability         | Yes  | Weekly availability schedule editor                                                          | Dashboard   |
| Integrations        | /integrations         | Yes  | Connect Google/Outlook calendars, video tools                                                | Dashboard   |
| Settings            | /settings             | Yes  | Profile, booking defaults, timezone                                                          | Dashboard   |
| Bookings            | /bookings             | Yes  | List of all scheduled meetings (upcoming, past, cancelled) with filters and side preview     | Dashboard   |
| MeetingDetail       | /bookings/:id         | Yes  | Single meeting detail — attendee, agenda, notes, video link, sync, reschedule/cancel actions | Dashboard   |
| BookingConfirmation | /book/:slug/confirmed | No   | Public confirmation shown to invitee after successful booking with Add-to-Calendar           | BookingPage |
| Notifications       | /notifications        | Yes  | Activity feed for booking events plus notification preferences sidebar                       | Dashboard   |
| Billing             | /settings/billing     | Yes  | Plan management, usage stats, plan comparison, payment method, invoice history               | Dashboard   |

## App Constraints

- Timezone-aware pickers everywhere
- Calendar heatmap for availability
- Booking link preview card

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#4f46e5`
- Primary Hover: `#6366f1`
- Primary Dark: `#4338ca`
- Accent: `#0ea5e9`
- Accent Hover: `#38bdf8`
- Accent Dark: `#0284c7`

### Semantic

- Available: `#10b981`
- Available Light: `#d1fae5`
- Booked: `#6366f1`
- Booked Light: `#e0e7ff`
- Pending: `#f59e0b`
- Pending Light: `#fef3c7`
- Conflict: `#ef4444`
- Conflict Light: `#fee2e2`
- Buffer: `#94a3b8`
- Buffer Light: `#f1f5f9`
- Past: `#9ca3af`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8fafc`
- Calendar Grid: `#ffffff`
- Calendar Header: `#f1f5f9`
- Time Slot Hover: `#eef2ff`
- Booking Form: `#fafafa`

### Text

- Primary: `#1e293b`
- Secondary: `#64748b`
- Tertiary: `#94a3b8`
- Time: `#334155`
- Duration: `#6366f1`
- Link: `#4f46e5`
- Link Hover: `#4338ca`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Time Slot: `#e2e8f0`
- Focus: `#6366f1`

### Dark Theme Overrides

- Primary: `#818cf8`
- Accent: `#38bdf8`
- Background: `#0f172a`
- Surface: `#1e293b`
- Surface Secondary: `#1a2332`
- Calendar Grid: `#1e293b`
- Calendar Header: `#253347`
- Time Slot Hover: `#2d3a5c`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Text Time: `#cbd5e1`
- Border Primary: `#334155`
- Available: `#34d399`
- Booked: `#a5b4fc`
- Pending: `#fbbf24`

## Typography

### Font Families

- Body: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Time: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, monospace` (font-variant-numeric: tabular-nums)
- Heading: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

### Overrides

- Calendar day numbers: `500` weight, `sm` size
- Time labels: `Time` font family, `xs` size, `500` weight
- Duration badges: `Time` font family, `xs` size
- Meeting titles in calendar: `500` weight, `sm` size, truncate with ellipsis

## Layout

- Content Max Width: `1440px`
- Calendar Grid Columns: `7` (week view), `1` (day view), `4` (month mini-grid)
- Calendar Row Height: `60px` (one hour)
- Calendar Half-Hour Line: dashed `1px` border-secondary
- Sidebar Width: `300px` (scheduling panel), collapsed: `0px`
- Sidebar Filter Width: `240px`
- Booking Page Max Width: `640px` (centered, public-facing)
- Booking Page Calendar Width: `340px`
- Time Slot Grid Gap: `8px`
- Dashboard Grid: `3` columns (desktop), `2` (tablet), `1` (mobile)
- Top Bar Height: `56px`

## Components

### Calendar Day Cell

- Border: `1px solid` border-time-slot
- Min height: `120px` (month view), full height (week/day view)
- Padding: `4px`
- Today highlight: primary background at `8%` opacity, `2px` left border primary
- Hover: time-slot-hover background
- Weekend: surface-secondary background

### Meeting Block (calendar event)

- Border radius: `6px`
- Border-left: `3px solid` (color by meeting type)
- Padding: `4px 8px`
- Font size: `sm` (14px)
- Background opacity: `90%`
- Booked: booked-light bg, primary border-left
- Pending: pending-light bg, pending border-left
- Conflict: conflict-light bg, conflict border-left
- External (synced): `#dbeafe` bg, accent border-left
- Hover: elevate shadow to `sm`, cursor pointer
- Truncation: single line ellipsis for title, hide details if < 30min slot

### Time Slot Picker (public booking page)

- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Padding: `12px 16px`
- Height: `44px`
- Font family: Time
- Available state: surface bg, primary text, primary border on hover
- Selected state: primary bg, inverse text, primary-dark border
- Unavailable state: surface-secondary bg, tertiary text, no pointer
- Hover (available): time-slot-hover bg, primary border
- Transition: fast (150ms)
- Grid: 1 column, `8px` gap

### Availability Matrix

- Cell size: `48px × 32px`
- Border radius: `4px` (sm)
- Available: available-light bg
- Unavailable: transparent
- Drag-selecting: primary at `20%` opacity with dashed `1px` primary border
- Selected: primary at `30%` opacity with solid `1px` primary border
- Row labels (days): `sm` size, `500` weight, `80px` width
- Column labels (hours): Time font, `xs` size, `500` weight

### Booking Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Border-left: `4px solid` (color by status: available → available, booked → booked, pending → pending)
- Avatar: `40px` circle with `2px` primary border
- Title: `base` size, `600` weight
- Duration badge: pill shape, primary-light bg, primary text, Time font, `xs` size
- Time: Time font, `sm` size, time color
- Status pill: `full` radius, `xs` font, `500` weight, semantic color bg

### Duration Selector

- Border radius: `8px` (md)
- Padding: `8px 16px`
- Preset options: `15min`, `30min`, `45min`, `60min`, `90min` as pill-shaped toggles
- Active: primary bg, inverse text
- Inactive: surface bg, secondary text, border-primary
- Custom input: appears inline when "Custom" selected
- Gap: `8px`

### Calendar Sync Badge

- Border radius: `full` (pill)
- Padding: `2px 10px`
- Font size: `xs` (12px)
- Google Calendar: `#4285f4` bg at `15%`, `#4285f4` text
- Outlook: `#0078d4` bg at `15%`, `#0078d4` text
- Apple Calendar: `#333333` bg at `15%`, `#333333` text (dark: `#f5f5f5` variants)
- iCal: buffer bg, secondary text
- Icon: `14px`, left of label

### Booking Confirmation

- Border radius: `12px` (lg)
- Shadow: `md`
- Padding: `32px`
- Max width: `480px`, centered
- Success icon: `48px` circle, available bg, checkmark inverse
- Title: `xl` size, `700` weight
- Details grid: label (`secondary` text, `sm`) / value (`primary` text, `base`) pairs
- "Add to Calendar" buttons: row of calendar-sync-badge styled buttons
- Border-top divider: `1px solid` border-primary with `24px` vertical margin

### Weekly Availability Overview

- 7-column grid, header row with day abbreviations
- Each column: vertical stack of colored blocks representing availability windows
- Block height: proportional to duration (1hr = `48px`)
- Gap between blocks: `2px`
- Available blocks: available color at `25%` opacity
- Booked blocks: booked color at `25%` opacity
- Time axis: left-aligned, Time font, `xs` size, every 2 hours labeled

### Empty States

- Centered layout, `64px` top margin
- Illustration: `120px` styled calendar/clock icon in primary at `15%` opacity
- Title: `lg` size, `600` weight, primary text
- Description: `sm` size, secondary text, `360px` max width
- CTA button: primary, `md` size

### Notification Preferences Card

- Border radius: `12px` (lg)
- Padding: `20px`
- Border: `1px solid` border-primary
- Toggle switches: `40px × 22px`, primary when on, border-secondary when off
- Channel icons (email, push, SMS): `20px`, secondary color
- Reminder presets: `5min`, `15min`, `30min`, `1hr` as selectable pills
- Section dividers: `1px solid` border-primary with `16px` margin
