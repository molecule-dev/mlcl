# DESIGN.md — AI Hotel Receptionist

## Brand Identity

- **App Name:** Switchboard
- **Tagline:** Every call answered, in every language.
- **Logo:** Text-based logo in the heading font (bold weight), desk-bell glyph in public/logo.svg
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Calm front-desk professionalism with quiet technical confidence — a night auditor who speaks six languages, not a call-center script

## Target Persona

Independent hotel operators (30–120 rooms) whose front desk misses calls at check-in peaks and after hours: they want the phone answered, rooms sold, and the reservation book accurate — without hiring another receptionist.

## Screens

| Name              | Route             | Auth | Purpose                                                      |
| ----------------- | ----------------- | ---- | ------------------------------------------------------------ |
| Landing           | /                 | No   | Marketing home: multilingual voice pitch, live-call mock     |
| Login             | /login            | No   | Sign in                                                      |
| Signup            | /signup           | No   | Create account                                               |
| ForgotPassword    | /forgot-password  | No   | Request reset                                                |
| ResetPassword     | /reset-password   | No   | Set new password                                             |
| Dashboard         | /dashboard        | Yes  | Today's arrivals/departures, room status board, occupancy    |
| Reservations      | /reservations     | Yes  | Filterable reservation list                                  |
| ReservationDetail | /reservations/:id | Yes  | Lifecycle transitions, guest contact, source                 |
| NewReservation    | /reservations/new | Yes  | Manual front-desk booking                                    |
| RoomsRates        | /rooms            | Yes  | Room types, rooms, rate plans                                |
| Guests            | /guests           | Yes  | Guest profiles with stay history and preferred language      |
| GuestDetail       | /guests/:id       | Yes  | Profile, stays, notes                                        |
| VoiceAgents       | /agents           | Yes  | Agent config: languages, voice, rules, after-hours mode      |
| Calls             | /calls            | Yes  | Call log with language + outcome                             |
| CallDetail        | /calls/:id        | Yes  | Transcript, detected language, tool-call timeline, outcome   |
| CallSimulator     | /simulator        | Yes  | Place a simulated call: pick agent + language, watch it book |
| Account           | /account          | Yes  | Profile, security, language                                  |

## App Constraints

- The call transcript renders as a phone-line UI: caller turns left-aligned, agent turns right-aligned, system/tool events as centered monospace chips
- Language is a first-class visual element: every call surface carries a language badge (native endonym, e.g. Español, 日本語) — never a bare locale code
- The room status board uses semantic states only: vacant-clean (success), occupied (primary), cleaning (warning), out-of-order (danger)
- Night-desk dark mode is a first-class theme, not an inversion — the Calls and Simulator screens are designed dark-first
- Rate amounts always render in the property currency with the same formatting as the PMS handlers (integer cents → localized display)

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

- Primary: deep teal `#00695c` (Switchboard teal — desk-lamp calm)
- Secondary/accent: amber `#d97706` (the held-call glow)
- Dark-mode base: near-black blue-green `#0b1512`
- Status colors inherit from the base system; room states map to success/primary/warning/danger as listed above

## Typography

- Headings: Arimo (fleet default), bold
- Body: Inter (fleet default)
- Transcripts and tool-call chips: JetBrains Mono
