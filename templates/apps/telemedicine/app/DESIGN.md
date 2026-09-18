# DESIGN.md — Telemedicine

## Brand Identity

- **App Name:** Solace
- **Tagline:** Care without the commute
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Calm, caring, precise, reassuring

## Target Persona

Patients scheduling virtual doctor visits, and clinicians managing consults, prescriptions, and records.

## Screens

| Name              | Route             | Auth | Purpose                                                          | deriveFrom |
| ----------------- | ----------------- | ---- | ---------------------------------------------------------------- | ---------- |
| Landing           | /                 | No   | Marketing home                                                   | —          |
| Login             | /login            | No   | Sign in                                                          | —          |
| Signup            | /signup           | No   | Create account                                                   | Login      |
| ForgotPassword    | /forgot-password  | No   | Request reset                                                    | Login      |
| ResetPassword     | /reset-password   | No   | Set new password                                                 | Login      |
| Dashboard         | /dashboard        | Yes  | Today's appointments, vitals, messages                           | —          |
| Appointments      | /appointments     | Yes  | Appointment calendar and list                                    | —          |
| AppointmentDetail | /appointments/:id | Yes  | Detailed appointment with patient info, vitals, history, actions | —          |
| Consult           | /consult/:id      | Yes  | Video consult with notes and vitals                              | —          |
| Patients          | /patients         | Yes  | Clinician roster with search, filters, quick actions             | —          |
| PatientDetail     | /patients/:id     | Yes  | Full patient chart - vitals timeline, meds, history, care team   | —          |
| Prescriptions     | /prescriptions    | Yes  | All prescriptions across patients - refills, statuses            | —          |
| MedicalRecords    | /records          | Yes  | Browse and filter records: visits, labs, imaging, notes          | —          |
| Messages          | /messages         | Yes  | Secure messaging - thread list + conversation + patient context  | —          |
| Notifications     | /notifications    | Yes  | Activity feed grouped by time, with row-level actions            | —          |
| Settings          | /settings         | Yes  | Account, profile, notifications, privacy, devices, billing       | —          |

## App Constraints

- Video consult panel uses dark surface with teal primary accents and urgent red for End Call
- Role badges (Doctor/Nurse/Patient/Admin) have fixed colors per design
- All medical codes/vitals use mono font

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0d9488`
- Primary Hover: `#14b8a6`
- Primary Dark: `#0f766e`
- Accent: `#6366f1`
- Accent Hover: `#818cf8`
- Accent Dark: `#4f46e5`

### Semantic

- Urgent: `#dc2626`
- Urgent Light: `#fee2e2`
- Stable: `#0d9488`
- Stable Light: `#ccfbf1`
- Pending: `#f59e0b`
- Pending Light: `#fef3c7`
- Completed: `#16a34a`
- Completed Light: `#dcfce7`
- Cancelled: `#6b7280`
- Cancelled Light: `#f3f4f6`
- Prescription Active: `#0d9488`
- Prescription Expired: `#9ca3af`
- Video Live: `#dc2626`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f0fdfa`
- Sidebar: `#f0fdfa`
- Video Overlay: `rgba(0, 0, 0, 0.75)`
- Patient Banner: `#f0fdfa`

### Text

- Primary: `#1e293b`
- Secondary: `#64748b`
- Tertiary: `#94a3b8`
- Vitals Label: `#64748b`
- Vitals Value: `#1e293b`
- Link: `#0d9488`
- Link Hover: `#0f766e`

### Borders

- Primary: `#e2e8f0`
- Secondary: `#cbd5e1`
- Focus: `#0d9488`

### Dark Theme Overrides

- Primary: `#2dd4bf`
- Accent: `#818cf8`
- Background: `#0c1222`
- Surface: `#162032`
- Surface Secondary: `#1a2940`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#1e3a5f`
- Video Live: `#f87171`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Mono (vitals/codes): `"SF Mono", "Fira Code", Menlo, Monaco, Consolas, monospace`

### Font Weights

- Vitals Value: `600`
- Section Heading: `600`
- Patient Name: `700`
- Nav Item: `500`

## Layout

- Content Max Width: `1360px`
- Dashboard Grid Columns: `12`
- Dashboard Grid Gap: `24px`
- Sidebar Width: `260px` (collapsed: `72px`)
- Top Bar Height: `64px`
- Patient Detail Panel Width: `420px`
- Video Panel Min Height: `480px`
- Calendar Day Column Width: `140px`

## Components

### Appointment Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `16px`
- Left border: `4px solid` status color (urgent: urgent, scheduled: primary, completed: completed, cancelled: cancelled)
- Time display: mono font, `600` weight, `14px`
- Patient avatar: `40px` circle
- Status badge: pill, matching status color background with darker text

### Patient Card

- Border radius: `12px` (lg)
- Shadow: `sm`
- Padding: `20px`
- Avatar: `56px` circle with `2px` primary border
- Name: `18px`, `700` weight
- Metadata row: `14px`, secondary text, icon-prefixed (age, ID, last visit)
- Quick-action buttons: ghost variant, icon-only, `32px` square

### Vitals Display

- Border radius: `8px` (md)
- Background: surface-secondary
- Padding: `12px 16px`
- Layout: grid, `2` columns (desktop), `1` column (mobile)
- Label: `12px`, uppercase, `600` weight, secondary text
- Value: `24px`, `600` weight, mono font
- Unit: `14px`, `400` weight, tertiary text
- Abnormal indicator: urgent color value + subtle urgent-light background

### Video Consultation Panel

- Border radius: `16px` (xl)
- Shadow: `lg`
- Background: `#111827` (near-black)
- Remote video: fills panel, `object-fit: cover`
- Self video: `180px × 135px`, bottom-right, `12px` border-radius, `2px solid #ffffff` border
- Controls bar: bottom, centered, `64px` height, semi-transparent `rgba(0, 0, 0, 0.6)` background, `9999px` border-radius
- Control button: `48px` circle, `rgba(255, 255, 255, 0.15)` background, white icon
- End call button: `48px` circle, urgent background, white icon
- Live indicator: `8px` circle, video-live color, pulsing animation, top-left with "LIVE" label
- Duration timer: top-center, mono font, `rgba(0, 0, 0, 0.5)` pill background, white text

### Prescription Card

- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Padding: `16px`
- Medication name: `16px`, `600` weight
- Dosage: `14px`, primary color, `500` weight
- Instructions: `14px`, secondary text
- Status pill: active (primary bg) or expired (cancelled bg)
- Refill button: outline variant, `sm` size

### Medical Record Entry

- Border radius: `8px` (md)
- Border-bottom: `1px solid` border-primary (timeline style)
- Padding: `16px 0`
- Date column: `80px` fixed, `12px`, secondary text, mono font
- Type badge: pill, category-colored (visit: primary, lab: accent, imaging: info, note: secondary)
- Title: `15px`, `600` weight
- Summary: `14px`, secondary text, max `2` lines with ellipsis
- Attachments: inline file chips, `sm` border-radius, secondary border

### Calendar / Schedule View

- Day header: `14px`, `600` weight, uppercase, secondary text
- Time slot height: `48px`
- Appointment block: `4px` left border (status color), primary-light background, `8px` border-radius
- Current time indicator: `2px solid` urgent, full-width line with `8px` circle marker
- Available slot: dashed `1px` border-primary, hover: surface-secondary background

### Notification Badge

- Size: `20px` circle (on nav icons)
- Background: urgent
- Text: `11px`, `700` weight, inverse text
- Urgent notification row: urgent-light background with urgent left border

### File Upload Zone

- Border radius: `12px` (lg)
- Border: `2px dashed` border-secondary
- Background: surface-secondary
- Padding: `32px`
- Hover/dragover: primary border, primary-light background
- Icon: `48px`, secondary color
- Accepted formats label: `12px`, tertiary text
- Progress bar: `4px` height, primary fill, full border-radius

### Search Bar (Patient/Record Lookup)

- Border radius: `9999px` (pill)
- Height: `44px`
- Background: surface-secondary
- Border: `1px solid transparent`, focus: `2px solid` primary
- Padding: `8px 16px 8px 44px` (icon space)
- Search icon: `20px`, secondary color
- Dropdown results: `12px` border-radius, `lg` shadow, max-height `400px`

### Permission / Role Badge

- Border radius: `4px` (sm)
- Padding: `2px 8px`
- Font size: `11px`
- Font weight: `600`
- Uppercase
- Variants: Doctor (`#0d9488` bg, white text), Nurse (`#6366f1` bg, white text), Patient (`#64748b` bg, white text), Admin (`#1e293b` bg, white text)
