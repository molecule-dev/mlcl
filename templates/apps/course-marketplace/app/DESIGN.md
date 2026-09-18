# DESIGN.md — Course Marketplace

## Brand Identity

- **App Name:** Lectura
- **Tagline:** Master anything, teach everything
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Inspiring, knowledgeable, inclusive, empowering

## Target Persona

Lifelong learners and instructors who want to discover high-quality courses across topics or publish their own expertise to a wide audience.

## Screens

| Name                   | Route                              | Auth | Purpose                                                                       | deriveFrom |
| ---------------------- | ---------------------------------- | ---- | ----------------------------------------------------------------------------- | ---------- |
| Landing                | /                                  | No   | Marketing home with search, featured courses, categories                      | —          |
| Login                  | /login                             | No   | Sign in                                                                       | —          |
| Signup                 | /signup                            | No   | Create account                                                                | Login      |
| ForgotPassword         | /forgot-password                   | No   | Request reset                                                                 | Login      |
| ResetPassword          | /reset-password                    | No   | Set new password                                                              | Login      |
| Browse                 | /browse                            | Yes  | Course grid with filter sidebar, sort, pagination                             | —          |
| CourseDetail           | /courses/:id                       | Yes  | Landing page for a single course with curriculum, reviews, enroll CTA         | —          |
| Lesson                 | /courses/:id/lessons/:lessonId     | Yes  | Video player with lesson sidebar and notes                                    | —          |
| MyLearning             | /my-learning                       | Yes  | Enrolled courses with progress bars                                           | —          |
| InstructorDashboard    | /instructor                        | Yes  | Instructor stats, courses, revenue, reviews                                   | —          |
| Settings               | /settings                          | Yes  | Account, notifications, payment methods                                       | —          |
| Checkout               | /checkout                          | Yes  | Order summary, payment method, billing details, total with discount           | —          |
| InstructorCourseEditor | /instructor/courses/:id/edit       | Yes  | Curriculum builder with sections/lectures, course settings tabs, drag handles | —          |
| InstructorProfile      | /instructors/:id                   | Yes  | Public instructor profile — bio, stats, courses grid, reviews                 | —          |
| Certificate            | /my-learning/:courseId/certificate | Yes  | Completion certificate display with download, share, print actions            | —          |
| Notifications          | /notifications                     | Yes  | Activity feed grouped by date — enrollments, reviews, replies, course updates | —          |

## App Constraints

- Course cards use `16:9` imagery with Bestseller/New/Free badges top-left absolute
- Lesson player layout splits into a 16:9 video area and a `340px` right sidebar curriculum with progress markers
- Star ratings are always rendered with the numeric score and review count beside them

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#6336e0`
- Primary Hover: `#7c5af0`
- Primary Dark: `#4f22c4`
- Accent: `#e8a820`
- Accent Hover: `#f0be44`
- Accent Dark: `#c48e10`

### Semantic

- Enrolled: `#2f8a60`
- Enrolled Light: `#dcfce7`
- In Progress: `#e8a820`
- In Progress Light: `#fef3c7`
- Completed: `#6336e0`
- Completed Light: `#ede9fe`
- Certificate: `#c48e10`
- Certificate Light: `#fef9e7`
- Rating Star: `#f59e0b`
- Rating Empty: `#d1d5db`
- Free Badge: `#10b981`
- Bestseller Badge: `#f59e0b`
- New Badge: `#6336e0`

### Backgrounds

- Surface: `#ffffff`
- Surface Secondary: `#f8f7fc`
- Video Player: `#0a0a0a`
- Lesson Sidebar: `#faf9fe`

### Text

- Price: `#1a1a2e`
- Price Sale: `#dc2626`
- Price Original: `#9ca3af` (strikethrough)
- Instructor: `#6336e0`
- Link: `#6336e0`
- Link Hover: `#4f22c4`
- Category: `#6b7280`

### Borders

- Focus: `#6336e0`

### Dark Theme Overrides

- Primary: `#a78bfa`
- Accent: `#fbbf24`
- Background: `#0c0a1a`
- Surface: `#1a1630`
- Surface Secondary: `#231e3a`
- Lesson Sidebar: `#1a1630`
- Text Primary: `#f0eef8`
- Text Secondary: `#b0a8cc`
- Border Primary: `#2e2850`

## Typography

### Font Families

- Heading: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Price: `"Tabular Nums", -apple-system, sans-serif` (font-variant-numeric: tabular-nums)
- Code: `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

## Layout

- Content Max Width: `1280px`
- Course Grid Columns: `4` (desktop), `2` (tablet), `1` (mobile)
- Course Grid Gap: `24px`
- Sidebar Filter Width: `260px`
- Lesson Sidebar Width: `340px`
- Video Player Max Width: `960px`
- Video Player Aspect Ratio: `16:9`
- Landing Hero Height: `540px`
- Category Bar Height: `48px`

## Components

### Course Card

- Border radius: `12px` (lg)
- Shadow: `sm`, hover: `md`
- Image aspect ratio: `16:9`
- Padding: `0` (image flush) + `16px` (content area)
- Content spacing: `8px` between elements
- Title: `base` (16px), font weight `600`, max 2 lines with ellipsis
- Instructor: `sm` (14px), font weight `400`, instructor color
- Rating: inline star row + numeric score (`sm`, `600`) + review count (`sm`, `400`, secondary text)
- Price: `lg` (18px), font weight `700`
- Bestseller/New badges: top-left absolute, `4px 10px` padding, `4px` radius, `xs` bold uppercase

### Video Player

- Border radius: `8px` (md) when not fullscreen
- Background: video player background (`#0a0a0a`)
- Controls bar height: `48px`
- Progress bar height: `4px`, hover: `6px`, color: primary
- Buffered bar color: `rgba(255, 255, 255, 0.25)`
- Thumbnail on hover: `160px` wide

### Lesson List (Sidebar)

- Background: lesson sidebar background
- Section header: `sm` (14px), font weight `700`, uppercase, `12px 16px` padding, tertiary background
- Lesson row height: `52px`
- Lesson row padding: `8px 16px`
- Active lesson: primary light background (`#ede9fe`), left border `3px solid` primary
- Completed lesson: checkmark icon in completed color, title with subtle strikethrough or muted
- Lesson duration: `xs` (12px), secondary text, right-aligned
- Lesson type icon: `16px`, secondary text (video, article, quiz icons)

### Progress Bar (Course)

- Height: `6px`
- Border radius: `full` (9999px)
- Track color: tertiary background
- Fill color: primary, animated `300ms ease`
- Label: `sm` (14px), font weight `500`, right-aligned percentage

### Instructor Card

- Border radius: `12px` (lg)
- Avatar size: `64px`, border radius `full`
- Name: `lg` (18px), font weight `600`
- Title/bio: `sm` (14px), secondary text
- Stats row: review average, student count, course count — `sm`, `500` weight
- Padding: `24px`

### Star Rating

- Star size: `16px` (inline), `20px` (detail page), `24px` (review form)
- Filled color: rating star (`#f59e0b`)
- Empty color: rating empty (`#d1d5db`)
- Half-star: gradient fill
- Numeric display: font weight `600`, beside stars

### Certificate Card

- Border radius: `12px` (lg)
- Border: `2px solid` certificate color
- Background: certificate light
- Shadow: `md`
- Padding: `32px`
- Title: `2xl` (24px), font weight `700`, centered
- Completion date: `sm` (14px), secondary text, centered
- Download button: accent background, `600` weight

### Enrollment Button

- Border radius: `8px` (md)
- Height: `52px` (slightly larger than standard lg)
- Font size: `lg` (18px)
- Font weight: `600`
- Background: primary
- Full width on course detail page
- Idle state: "Enroll Now" + price
- Enrolled state: "Continue Learning", outline variant in enrolled color

### Price Display

- Current price: `2xl` (24px), font weight `700`, price color
- Sale price color: price sale (`#dc2626`)
- Original price: `base` (16px), font weight `400`, strikethrough, muted
- Discount badge: sale color background, white text, `4px 8px` padding, `4px` radius, `xs` bold
- Free: `2xl` (24px), font weight `700`, free badge color

### Category Pill

- Border radius: `full` (9999px)
- Padding: `6px 16px`
- Font size: `sm` (14px)
- Font weight: `500`
- Default: secondary background, primary text
- Active: primary background, inverse text
- Hover: primary hover background, inverse text

### Review Card

- Border radius: `8px` (md)
- Padding: `16px`
- Border bottom: `1px solid` border-primary
- Avatar: `40px`, border radius `full`
- Name: `sm` (14px), font weight `600`
- Date: `xs` (12px), secondary text
- Star row: `14px` stars, below name
- Body: `base` (16px), font weight `400`, line height relaxed

### Search Bar (Landing)

- Border radius: `full` (9999px)
- Height: `56px`
- Shadow: `lg`
- Icon: `20px` search icon, left `16px`
- Input padding: `16px 16px 16px 48px`
- Font size: `lg` (18px)
- Dropdown: `12px` radius, `lg` shadow, max height `400px`

### Curriculum Accordion

- Border radius: `8px` (md) for outer container
- Section header padding: `16px`
- Section header background: surface secondary
- Section header font: `base` (16px), font weight `600`
- Chevron icon: `16px`, `150ms` rotation transition
- Lecture count + duration: `sm` (14px), secondary text, right side
- Expanded content padding: `0 16px 16px`
