# DESIGN.md — Student Portal

## Brand Identity

- **App Name:** Chalk
- **Tagline:** Your academic day, decoded
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Supportive, organized, encouraging, clear

## Target Persona

Middle and high school students (and their parents) who need a single organized view of classes, grades, assignments, and school communication.

## Screens

| Name             | Route               | Auth | Purpose                                                                                           | deriveFrom |
| ---------------- | ------------------- | ---- | ------------------------------------------------------------------------------------------------- | ---------- |
| Landing          | /                   | No   | Marketing home with value props and signup CTA                                                    | —          |
| Login            | /login              | No   | Sign in                                                                                           | —          |
| Signup           | /signup             | No   | Create account                                                                                    | Login      |
| ForgotPassword   | /forgot-password    | No   | Request reset                                                                                     | Login      |
| ResetPassword    | /reset-password     | No   | Set new password                                                                                  | Login      |
| Dashboard        | /dashboard          | Yes  | Today's schedule, upcoming assignments, GPA snapshot                                              | —          |
| Schedule         | /schedule           | Yes  | Weekly class schedule grid                                                                        | —          |
| Grades           | /grades             | Yes  | Grade book and report card                                                                        | —          |
| Assignments      | /assignments        | Yes  | Assignments list with filters and status                                                          | —          |
| Calendar         | /calendar           | Yes  | Month view of school events                                                                       | —          |
| Messages         | /messages           | Yes  | Teacher/parent messages                                                                           | —          |
| Attendance       | /attendance         | Yes  | Attendance history and status                                                                     | —          |
| Settings         | /settings           | Yes  | Profile, notifications, preferences                                                               | —          |
| AssignmentDetail | /assignments/:id    | Yes  | Full assignment instructions, resources, submission area, and graded feedback                     | —          |
| CourseDetail     | /courses/:id        | Yes  | Single class detail — syllabus, teacher info, class-specific gradebook and assignments            | —          |
| MessageThread    | /messages/:id       | Yes  | Full inline conversation view with reply composer                                                 | —          |
| ReportCard       | /grades/report-card | Yes  | Formal end-of-semester report card with GPA, per-subject grades, attendance, and teacher comments | —          |
| Notifications    | /notifications      | Yes  | Activity feed of grade postings, assignment reminders, messages, and announcements                | —          |

## App Constraints

- Subject color coding must be consistent across schedule, grades, and assignments (Math blue, Science green, English purple, History amber, etc.)
- Grade badges always render as letter + percentage pill with semantic color background
- Schedule strip uses the dedicated `#f0eef9` surface, never generic surface-secondary

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#5b4fc7`
- Primary Hover: `#7266d4`
- Primary Dark: `#4840a8`
- Accent: `#e09020`
- Accent Hover: `#eba040`
- Accent Dark: `#c07818`

### Semantic

- Grade A: `#16a34a`
- Grade B: `#3b82f6`
- Grade C: `#e09020`
- Grade D: `#e05820`
- Grade F: `#dc2626`
- Present: `#16a34a`
- Present Light: `#dcfce7`
- Absent: `#dc2626`
- Absent Light: `#fee2e2`
- Tardy: `#e09020`
- Tardy Light: `#fef3c7`
- Excused: `#6b7280`
- Excused Light: `#f3f4f6`
- Assignment Due: `#e05820`
- Assignment Submitted: `#16a34a`
- Assignment Graded: `#5b4fc7`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8f7fc`
- Schedule Strip: `#f0eef9`
- Notification Badge: `#dc2626`

### Text

- Price: n/a
- GPA: `#111827`
- Period Label: `#5b4fc7`
- Link: `#5b4fc7`
- Link Hover: `#4840a8`

### Dark Theme Overrides

- Primary: `#a5a0f0`
- Accent: `#f0b060`
- Background: `#0c0a1a`
- Surface: `#1a1830`
- Surface Secondary: `#242040`
- Text Primary: `#f0f0f8`
- Text Secondary: `#a0a0c0`
- Border Primary: `#302d50`
- Schedule Strip: `#1e1c38`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- GPA / Numeric: `"Inter", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Schedule Labels: `"Inter", -apple-system, sans-serif` (font-weight: 600, text-transform: uppercase, letter-spacing: 0.04em)

## Layout

- Content Max Width: `1440px`
- Dashboard Grid Columns: `12`
- Dashboard Grid Gap: `24px`
- Sidebar Width: `260px` (collapsed: `64px`)
- Top Bar Height: `56px`
- Schedule Column Min Width: `180px`
- Calendar Day Cell Min Height: `100px`
- Message Thread Max Width: `800px`

## Components

### Grade Badge

- Border radius: `9999px` (pill)
- Padding: `2px 12px`
- Font size: `sm` (14px)
- Font weight: `700`
- Colors by letter: Grade A bg `#dcfce7` text `#16a34a`, Grade B bg `#dbeafe` text `#3b82f6`, Grade C bg `#fef3c7` text `#c07818`, Grade D bg `#ffedd5` text `#c04018`, Grade F bg `#fee2e2` text `#dc2626`
- Percentage grades rendered beside the letter in `text-secondary`, weight `400`

### GPA Display

- Font size: `4xl` (36px)
- Font weight: `700`
- Font variant: tabular-nums
- Color: `text-primary`
- Scale label beneath: font size `xs`, weight `500`, color `text-secondary`, text "/ 4.0"
- Optional trend arrow: `#16a34a` up, `#dc2626` down, `#6b7280` flat

### Schedule Card

- Border radius: `12px` (lg)
- Border-left: `4px solid` (color matches subject — see Subject Colors below)
- Padding: `12px 16px`
- Shadow: `sm`
- Period number: font weight `700`, font size `xs`, text-transform uppercase, color `period-label`
- Class name: font weight `600`, font size `base`
- Teacher / room: font size `sm`, color `text-secondary`
- Time range: font size `sm`, font weight `500`, color `text-tertiary`

### Subject Colors

Consistent color coding across schedule, grades, and assignments:

- Math: `#3b82f6`
- Science: `#16a34a`
- English: `#8b5cf6`
- History: `#e09020`
- Art / Elective: `#ec4899`
- PE / Health: `#14b8a6`
- World Language: `#f97316`
- Default / Other: `#6b7280`

### Attendance Indicator

- Shape: circle, `10px` diameter
- Present: filled `#16a34a`
- Absent: filled `#dc2626`
- Tardy: filled `#e09020`
- Excused: outlined `#6b7280` with `2px` border, hollow center
- Row variant: full-width bar, height `36px`, with icon + label + date

### Assignment Row

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border-bottom: `1px solid` border-primary
- Subject dot: `8px` circle using subject color, inline before subject name
- Due date: font size `sm`, color `text-secondary`; overdue: color `#dc2626`, font weight `600`
- Status badge: pill, font size `xs`, weight `500` — Due: accent bg, Submitted: success-light bg + success text, Graded: primary-light bg + primary text, Missing: error-light bg + error text
- Grade (when graded): right-aligned, font weight `700`

### Calendar Day Cell

- Min height: `100px`
- Padding: `8px`
- Border: `1px solid` border-primary
- Today: background `#f0eef9`, border `2px solid #5b4fc7`
- Event dot: `6px` circle, color matches event type (assignment: accent, exam: error, activity: primary)
- Day number: font size `sm`, weight `500`, top-left
- Weekend / off-day: background `surface-secondary`, text `text-secondary`

### Message Thread

- Max width: `800px`
- Sender avatar: `36px` circle, border-radius `full`
- Sender name: font weight `600`, font size `sm`
- Timestamp: font size `xs`, color `text-secondary`
- Message body: font size `base`, line-height `relaxed`
- Unread indicator: `8px` filled circle, color `#5b4fc7`
- Thread divider: `1px solid` border-primary, `24px` vertical margin

### Notification Bell

- Icon size: `20px`
- Badge: `18px` circle, background `#dc2626`, color `#ffffff`, font size `11px`, font weight `700`, top-right offset `-4px`
- Dropdown max height: `400px`, width: `360px`
- Notification item padding: `12px 16px`
- Unread background: `#f0eef9`

### Report Card Table

- Header background: `#f0eef9`
- Header font weight: `600`, font size: `sm`, text-transform: uppercase, letter-spacing: `0.04em`
- Row hover: `surface-secondary`
- Cell padding: `12px 16px`
- Grade column: right-aligned, font weight `700`
- GPA row: background `#f0eef9`, font weight `700`, border-top `2px solid` border-secondary
- Semester divider: `2px solid` primary with label centered

### Empty State

- Icon size: `64px`, color `text-secondary`, opacity `0.5`
- Heading: font size `lg`, weight `600`
- Body: font size `sm`, color `text-secondary`, max-width `320px`, centered
- Action button: primary variant, `md` size
