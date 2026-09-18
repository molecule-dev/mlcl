# DESIGN.md — AI Study Buddy

## Brand Identity

- **App Name:** Koan
- **Tagline:** Question everything, master anything
- **Logo:** Text-based logo using the app name in the heading font (bold/black weight)
- All screens MUST use this exact app name in the header/nav branding — no alternatives, no variations

## Voice

- Encouraging, curious, patient, thoughtful

## Target Persona

Students and self-learners studying with AI tutoring, flashcards, quizzes, and spaced repetition.

## Screens

| Name           | Route             | Auth | Purpose                                                                                                                      | deriveFrom |
| -------------- | ----------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Landing        | /                 | No   | Marketing home with warm teal+orange palette, student-friendly illustrations, features, pricing                              | —          |
| Login          | /login            | No   | Centered card with teal primary, encouraging tone                                                                            | —          |
| Signup         | /signup           | No   | Create account                                                                                                               | Login      |
| ForgotPassword | /forgot-password  | No   | Request reset                                                                                                                | Login      |
| ResetPassword  | /reset-password   | No   | Set new password                                                                                                             | Login      |
| Dashboard      | /dashboard        | Yes  | Sidebar, streak counter top with fire icon in orange, progress cards grid, next-up review queue, mastery charts              | —          |
| StudySession   | /study/:id        | Yes  | Sidebar, Merriweather serif study content center with headings and body, AI chat panel right for Q&A with teal primary       | —          |
| Flashcards     | /flashcards       | Yes  | Sidebar, deck grid with mastery progress bars per deck, category filters, study now buttons                                  | —          |
| Quiz           | /quiz/:id         | Yes  | Sidebar, multiple-choice question card center with timer bar top, options list, AI explanation expandable after answer       | —          |
| Courses        | /courses          | Yes  | Sidebar, course cards grid with hero images, progress bars, lessons count, last-studied date                                 | —          |
| Settings       | /settings         | Yes  | Sidebar, study preferences, notification times, streak reminders, account                                                    | —          |
| CourseDetail   | /courses/:id      | Yes  | Sidebar, course hero with cover image and progress ring, lesson list with mastery chips, instructor sidebar, continue button | —          |
| DeckDetail     | /flashcards/:id   | Yes  | Sidebar, single flashcard center with flip animation, prev/next, mark mastered/learning controls, deck progress bar top      | —          |
| QuizResults    | /quiz/:id/results | Yes  | Sidebar, big score circle, correct/incorrect breakdown chart, per-question review list with AI explanations, retry CTA       | —          |
| Progress       | /progress         | Yes  | Sidebar, mastery charts over time, study time heatmap, streak history calendar, topic mastery distribution                   | —          |
| Profile        | /profile          | Yes  | Sidebar, avatar header, learning stats summary, achievements grid, recent activity timeline, edit profile                    | —          |
| Notifications  | /notifications    | Yes  | Sidebar, grouped notification list with streak reminders, achievement unlocks, AI suggestions, mark read controls            | —          |
| Billing        | /billing          | Yes  | Sidebar, current plan card, usage meters for AI tutor minutes, upgrade tier comparison, payment method, invoice history      | —          |
| Search         | /search           | Yes  | Sidebar, global search bar top, faceted filters left (courses/decks/quizzes/topics), grouped result cards with snippets      | —          |

## App Constraints

- Study content uses Merriweather serif for reading comprehension
- Streak counts use orange accent with fire icon; mastery uses green
- Quiz correct/incorrect uses distinct semantic colors with tabular-nums scores

Extends the [base Molecule design system](../../../../molecule/DESIGN.md). Only overrides are listed here — all other tokens inherit from the base.

## Colors

### Brand

- Primary: `#0d9488`
- Primary Hover: `#14b8a6`
- Primary Dark: `#0f766e`
- Accent: `#d97706`
- Accent Hover: `#f59e0b`
- Accent Dark: `#b45309`

### Semantic

- Mastered: `#16a34a`
- Mastered Light: `#dcfce7`
- Reviewing: `#0d9488`
- Reviewing Light: `#ccfbf1`
- Learning: `#6366f1`
- Learning Light: `#e0e7ff`
- Not Started: `#9ca3af`
- Quiz Correct: `#16a34a`
- Quiz Correct Light: `#dcfce7`
- Quiz Incorrect: `#dc2626`
- Quiz Incorrect Light: `#fee2e2`
- Quiz Skipped: `#6b7280`
- Streak Active: `#d97706`
- Streak Active Light: `#fef3c7`
- Streak Broken: `#9ca3af`
- AI Confidence High: `#0d9488`
- AI Confidence Medium: `#f59e0b`
- AI Confidence Low: `#ef4444`
- Source Relevance: `#8b5cf6`
- Source Relevance Light: `#ede9fe`

### Backgrounds

- Primary: `#f0fdfa`
- Surface: `#ffffff`
- Surface Secondary: `#f7fdfb`
- Study Content: `#ffffff`
- Chat Panel: `#f8fffe`
- Code Block: `#1e293b`
- Quiz Area: `#f0fdfa`

### Text

- Primary: `#134e4a`
- Secondary: `#6b7280`
- Tertiary: `#5f7571`
- Link: `#0d9488`
- Link Hover: `#0f766e`
- Streak Count: `#d97706`

### Borders

- Primary: `#d1e7e4`
- Secondary: `#b8d8d4`
- Focus: `#0d9488`

### Dark Theme Overrides

- Primary: `#2dd4bf`
- Accent: `#fbbf24`
- Background: `#0c1514`
- Surface: `#162221`
- Surface Secondary: `#1c2e2c`
- Chat Panel: `#142120`
- Text Primary: `#f0fdfa`
- Text Secondary: `#94a3b8`
- Border Primary: `#264743`

## Typography

### Font Families

- Body: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Study Content: `"Merriweather", Georgia, "Times New Roman", serif`
- Code: `"JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, monospace`
- Stat: `"Inter", sans-serif` (font-variant-numeric: tabular-nums — for streak counts, scores, percentages)

### Font Sizes

- Study Heading: `2xl` (24px), weight `700`, study-content family
- Study Body: `base` (16px), weight `400`, study-content family
- AI Message: `sm` (14px), body family
- Stat Value: `3xl` (30px), weight `700`, stat family
- Stat Label: `xs` (12px), weight `500`, uppercase, secondary text
- Source Citation: `xs` (12px), weight `400`, secondary text

### Line Heights

- Study Content: `1.8`
- AI Messages: `1.6`

## Layout

- Content Max Width: `1120px`
- Sidebar Width: `260px` (collapsed: `56px`)
- Top Bar Height: `56px`
- Chat Panel Width: `380px` (resizable, min `300px`, max `480px`)
- Study Content Max Width: `720px` (centered within main area)
- Dashboard Grid Columns: `3` (desktop), `2` (tablet), `1` (mobile)
- Dashboard Grid Gap: `20px`
- Quiz Option Grid: `1` column, `12px` gap

## Components

### Subject Card

- Border radius: `12px` (lg)
- Padding: `20px`
- Border: `1px solid` border-primary
- Shadow: `sm`, hover: `md`
- Progress bar: bottom, `4px` height, fill color matches mastery level (learning/reviewing/mastered)
- Subject icon: `32px`, top-left, primary color
- Title: `lg` (18px), weight `600`
- Subtitle: `sm` (14px), secondary text, 1-line clamp
- Stats row: `xs` (12px), stat family — "24 topics · 68% mastered"

### Mastery Ring

- Size: `56px` (card), `96px` (detail header)
- Stroke width: `5px`
- Track: border-primary
- Segments: mastered (green), reviewing (teal), learning (indigo), not started (gray) — proportional fill
- Center text: percentage, `700` weight, stat family
- Center label: `xs`, secondary text, "mastered"

### Quiz Option

- Border radius: `10px`
- Padding: `14px 18px`
- Border: `2px solid` border-primary
- Hover: border shifts to primary, `rgba(13, 148, 136, 0.04)` background
- Selected: `2px solid` primary, `rgba(13, 148, 136, 0.08)` background
- Correct: `2px solid` quiz-correct, quiz-correct-light background, check icon `16px`
- Incorrect: `2px solid` quiz-incorrect, quiz-incorrect-light background, x icon `16px`
- Skipped: border-secondary, `0.6` opacity
- Option letter: `sm` (14px), weight `600`, `28px` circle, surface-secondary background
- Option text: `sm` (14px), weight `400`

### Quiz Progress Bar

- Height: `6px`
- Border radius: `full`
- Track: border-primary
- Fill: primary, animated width transition `300ms ease`
- Step dots: `8px` circles above bar at each question position
- Active dot: primary fill with `2px` ring
- Answered dot: quiz-correct or quiz-incorrect fill
- Unanswered dot: border-primary outline only

### AI Chat Bubble

- Border radius: `14px`, `4px` on sender's corner
- User message: primary background, inverse text, `sm` (14px)
- AI message: surface-secondary background, primary text, `sm` (14px)
- AI typing indicator: 3 dots, `6px` each, primary color, staggered `300ms` pulse
- Source citation block: `8px` radius, source-relevance-light background, `2px` left border source-relevance color
- Citation title: `xs` (12px), weight `600`
- Citation relevance: `xs` (12px), stat family, source-relevance color, percentage

### Study Content Block

- Border radius: `12px` (lg)
- Padding: `32px`
- Background: study-content
- Shadow: `sm`
- Heading: study-content family, `2xl`, weight `700`
- Body: study-content family, `base`, line-height `1.8`
- Key term highlight: primary background at `0.1` opacity, `4px` radius inline, weight `600`
- Code inline: code family, `sm`, `rgba(13, 148, 136, 0.08)` background, `4px` radius
- Code block: code family, `sm`, code-block background, `8px` radius, `16px` padding

### Streak Badge

- Border radius: `full` (pill)
- Padding: `6px 14px`
- Background: streak-active-light (active) or surface-secondary (broken)
- Border: `1px solid` accent (active) or border-primary (broken)
- Flame icon: `16px`, accent color (active) or not-started color (broken)
- Count: stat family, `sm` (14px), weight `700`, streak-count color
- Label: `xs` (12px), weight `400`, secondary text — "day streak"

### Progress Timeline

- Vertical orientation, left-aligned
- Date connector: `2px solid` border-primary, `16px` gap
- Date node: `10px` circle, primary fill (studied) or border-only (missed)
- Today node: `10px` circle with `3px` pulsing ring in primary color
- Day card: `8px` radius, `12px 16px` padding, surface-secondary background
- Topics studied: `sm` (14px), weight `500`
- Duration: stat family, `xs` (12px), secondary text
- Quiz score: stat family, `sm`, weight `600`, color matches score tier (mastered >80%, reviewing 50-80%, learning <50%)

### Source Card (RAG Results)

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border-left: `3px solid` source-relevance color
- Background: surface
- Title: `sm` (14px), weight `600`, primary text, 1-line clamp
- Snippet: `xs` (12px), secondary text, 2-line clamp
- Relevance score: stat family, `xs`, source-relevance color, right-aligned
- Source type icon: `14px` (book, link, note), secondary color

### Dashboard Stat Card

- Border radius: `12px` (lg)
- Padding: `20px`
- Background: surface
- Border: `1px solid` border-primary
- Value: stat family, `3xl` (30px), weight `700`, primary text
- Label: `xs` (12px), weight `500`, uppercase, letter-spacing `0.05em`, secondary text
- Trend: stat family, `sm`, weight `600`, mastered (positive) or quiz-incorrect (negative) color
- Icon: `24px`, primary color, top-right

### Topic Chip

- Border radius: `full` (pill)
- Padding: `4px 12px`
- Font size: `xs` (12px), weight `500`
- Variants by mastery:
  - Mastered: mastered color text, mastered-light background
  - Reviewing: reviewing color text, reviewing-light background
  - Learning: learning color text, learning-light background
  - Not Started: not-started color text, surface-secondary background
