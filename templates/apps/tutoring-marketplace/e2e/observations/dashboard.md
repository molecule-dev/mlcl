# Page observations: /dashboard (TutorDashboard)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name         | role        | expected behavior on interaction                     | success signal                    | failure signal                  |
| ---------------------------------- | ----------- | ---------------------------------------------------- | --------------------------------- | ------------------------------- |
| Empty-state CTA "Become a tutor →" | link/button | navigates to /become-tutor for non-tutor users       | URL is /become-tutor              | nav fails                       |
| Tutor stat card "Earnings"         | tile        | shows aggregate after tutor profile + bookings exist | numeric value rendered            | absent for non-tutors (correct) |
| Tutor stat card "Sessions"         | tile        | shows session count                                  | numeric                           | absent for non-tutors           |
| Tutor stat card "Rating"           | tile        | shows rating average                                 | numeric                           | absent for non-tutors           |
| Upcoming sessions list             | list        | renders bookings made by students                    | row appears after booking created | empty after first booking       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger    | method | path                         | what request body or query is expected          |
| ---------- | ------ | ---------------------------- | ----------------------------------------------- |
| page load  | GET    | /api/tutors/me               | returns 404 for non-tutors, tutor row otherwise |
| tutor load | GET    | /api/bookings/tutor/:tutorId | returns upcoming bookings                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
