# DESIGN.md — Transit Tracker

## Brand Identity

- **App Name:** MetroPulse
- **Tagline:** Every line, every stop, live
- **Logo:** Route-fork mark (two trunk lines meeting at an amber interchange node) + wordmark in the heading font
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Punctual, calm, civic-minded; talks like a good station attendant, not a marketer

## Target Persona

Daily transit riders — commuters and students — who plan around the timetable and want to know "when do I actually leave?"

## The Network (demo data)

One fictional mid-size city ("Averton"): 6 lines — 2 metro, 1 tram, 3 bus — 36 stops, full polyline geometry. "Live" arrivals are DETERMINISTICALLY simulated server-side from the schedule + clock (headway arithmetic — no randomness, no websocket).

## Screens

| Name           | Route            | Auth | Purpose                                                            | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------------------------ | ---------- |
| Landing        | /                | No   | Marketing home with stop search and a preview departures board     | —          |
| Login          | /login           | No   | Sign in                                                            | —          |
| Signup         | /signup          | No   | Create account                                                     | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                                      | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                                   | Login      |
| Nearby         | /nearby          | Yes  | Stop search + saved stops + all stops (interchanges first)         | —          |
| StopBoard      | /stops/:code     | Yes  | Signature screen — live arrivals board, lines serving, save/unsave | —          |
| RouteDetail    | /lines/:code     | Yes  | Line map (SVG), stop list, service window per direction            | —          |
| TripPlanner    | /plan            | Yes  | Origin → destination → ranked itineraries (fastest/fewest/direct)  | —          |
| Alerts         | /alerts          | Yes  | Service alerts (line + system-wide), severity-coded                | —          |
| SavedStops     | /saved           | Yes  | Manage saved stops                                                 | —          |
| Settings       | /settings        | Yes  | Profile, home stop, preferences                                    | —          |
| PlanUpdated    | /plan-updated    | Yes  | Billing confirmation                                               | —          |
| About          | /about           | No   | Public about page                                                  | —          |
| Privacy        | /privacy         | No   | Legal (modal + standalone)                                         | —          |
| Terms          | /terms           | No   | Legal (modal + standalone)                                         | —          |

## App Constraints

- The departures board is the signature surface: route badge (line's own data color) | destination | countdown ("due" under a minute, amber) + clock time, one row per arrival, soonest first
- Line colors come from DATA (transit_lines.color) via inline style — they are per-line brand facts, not theme tokens; board STATES (due/live/warning/severe/hub) are theme tokens
- Route maps are static SVG projections of the line geometry (fictional city — no map tiles; see LineMapSvg)
- All clock arithmetic renders from epoch ms returned by the API; the UI never re-derives arrival times
- Hero stop search on Landing and Nearby is the same StopSearchCard — one fetch of the stop list, client-side filter
- Dark mode is the night-service palette: teal-black surfaces, lifted teal primary, amber accent (departures-board heritage)
