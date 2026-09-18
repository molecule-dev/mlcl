# DESIGN.md — Health Records

## Brand Identity

- **App Name:** Meridian
- **Tagline:** Your complete health story
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Clinical, trustworthy, precise, reassuring

## Target Persona

Patients and caregivers who want a single, secure place to see lab trends, medications, immunizations, and visit history — plus share targeted slices with providers without losing privacy.

## Screens

| Name             | Route            | Auth | Purpose                                                                              | deriveFrom   |
| ---------------- | ---------------- | ---- | ------------------------------------------------------------------------------------ | ------------ |
| Landing          | /                | No   | Marketing home with security and value propositions                                  | —            |
| Login            | /login           | No   | Sign in                                                                              | —            |
| Signup           | /signup          | No   | Create account                                                                       | Login        |
| ForgotPassword   | /forgot-password | No   | Request reset                                                                        | Login        |
| ResetPassword    | /reset-password  | No   | Set new password                                                                     | Login        |
| Dashboard        | /dashboard       | Yes  | Health summary + vitals + alerts overview                                            | —            |
| Records          | /records         | Yes  | All records timeline + filters                                                       | —            |
| Medications      | /medications     | Yes  | Medication list with refill and interaction warnings                                 | —            |
| LabResults       | /labs            | Yes  | Lab results table with reference ranges and trends                                   | —            |
| Documents        | /documents       | Yes  | Medical documents with encryption badges                                             | —            |
| Sharing          | /sharing         | Yes  | Manage provider and caregiver access                                                 | —            |
| Settings         | /settings        | Yes  | Profile, security, permissions, export                                               | —            |
| RecordDetail     | /records/:id     | Yes  | Single health record detail (metadata, attachments, related entries)                 | —            |
| MedicationDetail | /medications/:id | Yes  | Single medication detail (dosage history, prescriber, refill timeline, interactions) | —            |
| LabResultDetail  | /labs/:id        | Yes  | Single lab result with trend chart, reference range, and clinician note              | —            |
| Immunizations    | /immunizations   | Yes  | Vaccination history with dose number badges and overdue alerts                       | —            |
| Visits           | /visits          | Yes  | Visit and appointment history with provider and reason                               | —            |
| VisitDetail      | /visits/:id      | Yes  | Single visit detail (provider, summary, follow-ups)                                  | RecordDetail |
| Notifications    | /notifications   | Yes  | Refill reminders, abnormal lab alerts, and sharing requests feed                     | —            |
| Profile          | /profile         | Yes  | Patient medical profile (allergies, conditions, emergency contacts, demographics)    | —            |
| InviteShare      | /sharing/new     | Yes  | Form to invite a provider or caregiver and choose permission scope                   | Sharing      |

## App Constraints

- Lab values and vitals MUST use SF Mono clinical font with tabular-nums
- Out-of-range values show H/L badge + abnormal color; critical values highlight entire row
- Encryption badges (confidential color, lock icon, pill) appear on every document card
- Permission badges use four variants (owner/caregiver/provider/readonly) with specific bg colors

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0f766e`
- Primary Hover: `#14b8a6`
- Primary Dark: `#0d5f58`
- Accent: `#6366f1`
- Accent Hover: `#818cf8`
- Accent Dark: `#4f46e5`

### Semantic

- Normal / In Range: `#16a34a`
- Normal Light: `#dcfce7`
- Abnormal / Critical: `#dc2626`
- Abnormal Light: `#fee2e2`
- Caution / Borderline: `#d97706`
- Caution Light: `#fef3c7`
- Overdue: `#ea580c`
- Overdue Light: `#fff7ed`
- Confidential: `#7c3aed`
- Confidential Light: `#ede9fe`
- Inactive / Resolved: `#6b7280`
- Inactive Light: `#f3f4f6`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f0fdfa`
- Panel: `#f8fffe`
- Chart Area: `#fafcfc`

### Text

- Primary: `#1e293b`
- Secondary: `#64748b`
- Lab Value: `#0f172a` (font-variant-numeric: tabular-nums)
- Lab Value Abnormal: `#dc2626`
- Lab Value Critical: `#991b1b`
- Link: `#0f766e`
- Link Hover: `#0d5f58`

### Borders

- Primary: `#e2e8f0`
- Section Divider: `#cbd5e1`
- Focus: `#0f766e`

### Dark Theme Overrides

- Primary: `#2dd4bf`
- Accent: `#818cf8`
- Background: `#0c1222`
- Surface: `#1a2332`
- Surface Secondary: `#132024`
- Panel: `#162028`
- Text Primary: `#f1f5f9`
- Text Secondary: `#94a3b8`
- Border Primary: `#2a3a4a`
- Normal: `#4ade80`
- Abnormal: `#f87171`
- Caution: `#fbbf24`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Clinical: `"SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace` (lab values, vitals, dosages)
- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (weight 600-700)

### Font Features

- Lab values and vitals: `font-variant-numeric: tabular-nums` for aligned columns
- Medication dosages: clinical font at `sm` size

## Layout

- Content Max Width: `1400px`
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `20px`
- Sidebar Nav Width: `260px` (collapsed: `64px`)
- Detail Panel Max Width: `800px`
- Timeline Width: `680px` (centered within detail panel)
- Top Bar Height: `56px`

## Components

### Health Summary Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Padding: `20px`
- Header: category icon + title, font weight `600`, size `base`
- Value: clinical font, size `2xl`, weight `700`
- Subtext: secondary color, size `sm`
- Status indicator: `8px` colored dot (normal/abnormal/caution) left of value
- Border-left: `4px solid` category color on active/alert cards

### Condition Row

- Padding: `14px 20px`
- Border bottom: `1px solid` border-primary
- Layout: name (weight `500`) + status badge + onset date (secondary text, right-aligned)
- Active condition: normal left border accent
- Resolved condition: inactive color, italic name

### Medication Card

- Border radius: `8px` (md)
- Padding: `16px`
- Border: `1px solid` border-primary
- Drug name: weight `600`, size `base`
- Dosage: clinical font, size `sm`, secondary color
- Frequency: size `sm`, muted
- Refill badge: pill shape, caution background when due within 7 days, overdue background when past due
- Interaction warning: `12px` triangle icon, abnormal color

### Lab Result Table

- Header background: surface-secondary
- Cell padding: `10px 16px`
- Value column: clinical font, right-aligned, tabular-nums
- Reference range: size `xs`, secondary color, beneath or beside value
- Out-of-range flag: abnormal color text + bold weight, `H` / `L` badge beside value
- Critical flag: critical color text, bold, row background abnormal-light
- Trend sparkline: `60px` wide, `24px` tall, inline in row, primary color stroke

### Vital Signs Panel

- Layout: horizontal card strip, scrollable on mobile
- Each vital: `140px` min-width card
- Value: clinical font, size `3xl`, weight `700`, centered
- Unit: size `xs`, secondary color, beneath value
- Label: size `sm`, weight `500`, above value
- Mini trend chart: `80px` x `32px` beneath unit, primary color

### Timeline Entry

- Left gutter: `48px` for date + connector line
- Connector: `2px solid` border-primary, vertical
- Node: `12px` circle, filled with category color, centered on connector
- Content: card style, `12px` radius, `16px` padding
- Date: size `xs`, weight `500`, secondary color, in left gutter
- Category icon: `16px`, inline with title

### Document Card

- Border radius: `8px` (md)
- Padding: `14px 16px`
- Layout: file type icon (left, `40px`) + name/date/size (center) + actions (right)
- File type icons: colored by type (PDF: abnormal, image: accent, lab: primary)
- Encryption badge: confidential color, lock icon, pill shape, size `xs`
- Hover: surface-secondary background, shadow `sm`

### Immunization Row

- Padding: `12px 20px`
- Layout: vaccine name + dose number badge + date + status
- Dose badge: `24px` circle, primary background, inverse text, weight `600`
- Overdue indicator: overdue color text, bold
- Up-to-date indicator: normal color check icon

### Search Results

- Result item padding: `12px 16px`
- Category label: size `xs`, weight `600`, uppercase, primary color
- Match highlight: `#fef08a` background (light), `#854d0e40` background (dark)
- Result type icon: `16px`, left of title

### Permission Badge

- Border radius: `9999px` (pill)
- Padding: `2px 10px`
- Font size: `xs`, weight `500`
- Variants: `owner` (primary bg), `caregiver` (accent bg), `provider` (normal bg), `readonly` (inactive bg)

### Report/Export Button

- Border radius: `8px` (md)
- Height: `40px` (md)
- Icon: `16px` document/download icon, left of label
- Variant: outline style by default, solid for primary export action
- Loading state: spinner replaces icon, disabled appearance

### Notification Item

- Padding: `14px 16px`
- Unread indicator: `8px` primary-colored dot, left side
- Icon: `20px`, category-colored, left of content
- Title: weight `500`, size `sm`
- Timestamp: size `xs`, secondary color, right-aligned
- Urgency variants: normal border for routine, caution border for attention, abnormal border for urgent

### Empty State

- Centered layout, `max-width: 320px`
- Illustration area: `120px` height
- Heading: size `lg`, weight `600`
- Body: size `sm`, secondary color, `line-height: relaxed`
- Action button: primary, centered below body, `16px` top margin
