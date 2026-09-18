---
name: booking-app
intent: |
  - "Calendly clone"
  - "Booking system" / "Reservation app"
  - "Let people book a time with me"
  - "Appointment scheduling"
  - "Salon / restaurant / class booking"
keywords: [booking, calendar, schedule, appointment, reservation, calendly]
---

# Booking app (compound — multi-feature roadmap)

**This isn't a single example.** A booking app composes several
primitives. Read this README as a build order, then read each linked
example for the actual code.

## Build order

1. **`auth/oauth-google-login/`** — for the host (provider). Bookers
   often book without an account; collect their email at booking time.
2. **`forms/contact-form/`** — adapt for the booking form: name,
   email, selected slot. Validates + emails the host.
3. **`commerce/stripe-checkout/`** — only if the booking is paid.
   Use one-time payment mode keyed by booking id.
4. **`content/markdown-blog/`** — optional. Marketing pages for
   the host's services.

## What you'll build on top

Custom code with no example coverage:

- **Availability windows** — host defines weekly recurring open hours
  (Mon 9-12, etc.) in a `availabilities` table.
- **Slot generator** — given availability + existing bookings, render
  the next 4 weeks of bookable slots. Pure compute on the API side —
  do NOT do it client-side or you'll race against bookings.
- **Booking lock** — first-write-wins per (slot, host). Use a unique
  index on `(host_id, starts_at)` to make double-booking impossible.
- **Calendar UI** — use `@molecule/app-calendar` (core: month/week/day/agenda
  views, drag-and-drop) with `@molecule/app-calendar-fullcalendar`, or
  `@molecule/app-mini-calendar-react` for a compact picker. Do NOT hand-roll a
  grid, and `@molecule/app-calendar-react` is not the package name — the core is
  `@molecule/app-calendar`.
- **Notification emails** — confirm to booker, alert to host. Use
  `@molecule/api-emails-*` (same bond as the contact form).
- **Calendar invite (.ics)** — generate an `.ics` file in the
  confirmation email so it lands in their calendar app.

## Anti-patterns

- Do not invent `@molecule/api-booking` or `@molecule/app-calendly`.
  Composition.
- Do not let the client compute "available slots" — it'll let users
  book taken slots if their data is stale.
- Do not skip the unique index on bookings; race conditions WILL
  double-book.
- Do not embed an external Calendly iframe and call it done — the
  whole point is owning the data + branding.

## Verify

Host signs up → defines availability (Mon-Fri 9-5) → publishes their
booking link → visitor (incognito browser) opens link → sees this
week's free slots → books Tuesday 10am → both get email → host's
admin shows the booking → booking the same slot again returns 409.
