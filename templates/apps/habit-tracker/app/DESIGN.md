# DESIGN.md — Habit Tracker

## Brand Identity

- **App Name:** Streak
- **Tagline:** Keep the fire alive.
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Encouraging, disciplined, motivating, grounded

## Target Persona

People building lasting routines — health seekers, self-improvers, creators, and students — who want to visualize streaks, celebrate milestones, and stay accountable to daily practices.

## Screens

| Name           | Route            | Auth | Purpose                                           | deriveFrom |
| -------------- | ---------------- | ---- | ------------------------------------------------- | ---------- |
| Landing        | /                | No   | Marketing home with streak story + signup CTA     | —          |
| Login          | /login           | No   | Sign in                                           | —          |
| Signup         | /signup          | No   | Create account                                    | Login      |
| ForgotPassword | /forgot-password | No   | Request reset                                     | Login      |
| ResetPassword  | /reset-password  | No   | Set new password                                  | Login      |
| Dashboard      | /dashboard       | Yes  | Streak banner + daily checklist + stats overview  | —          |
| Habits         | /habits          | Yes  | All habits grid with category filters             | —          |
| HabitDetail    | /habit/:id       | Yes  | Single habit with heatmap + history + edit        | —          |
| Achievements   | /achievements    | Yes  | Trophy case with locked/unlocked badges           | —          |
| Stats          | /stats           | Yes  | Charts, trends, weekly heatmap, streak stats      | —          |
| Settings       | /settings        | Yes  | Profile, categories, reminders, freeze days       | —          |
| Notifications  | /notifications   | Yes  | Reminders, streak milestones, achievement unlocks | —          |

## Colors

- Primary: `#4a5fd7`
- Accent (heatmap): `#10b981`
- Streak hero color: `#f97316` (flame)
