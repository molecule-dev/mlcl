---
name: learning-platform
intent: |
  - "Udemy clone"
  - "Coursera clone"
  - "Online courses"
  - "LMS / learning management system"
  - "Sell video courses"
keywords: [course, lms, udemy, coursera, lesson, education, training]
---

# Learning platform (compound — multi-feature roadmap)

**This isn't a single example.** An LMS composes auth + content +
progress tracking + payments + video delivery.

## Build order

1. **`auth/email-password-login/`** + **`auth/oauth-google-login/`**
   — instructors and learners.
2. **`content/markdown-blog/`** — adapt for course outlines + lesson
   content. Add `course_id` foreign key.
3. **`uploads/file-attachments/`** — for instructors to upload video
   files / PDFs / slides.
4. **`commerce/stripe-checkout/`** — one-time purchase per course OR
   subscription mode for "all-access".
5. **`commerce/digital-downloads/`** — same shape as the
   downloadable file pattern; signed URL for video access.
6. **`forms/multi-step-wizard/`** — quizzes / checkpoints between
   lessons.
7. **`ratings/star-ratings/`** — course reviews.

## What you'll build on top

Custom code with no example coverage:

- **`courses` + `lessons` + `enrollments` + `progress` tables.**
  `enrollments` links a user to a course (paid or free). `progress`
  tracks per-lesson completion.
- **Video player UI**: HTMLVideoElement + a "mark complete on 90%
  watched" hook.
- **Certificates**: PDF generation when a course is finished. See
  `commerce/pdf-invoices/` for the rendering pattern.
- **Course curriculum / TOC**: a sidebar listing lessons with
  progress checkmarks. UI from `@molecule/app-ui-react`.

## Anti-patterns

- Do not invent `@molecule/app-lms` or `@molecule/api-courses`.
  Composition.
- Do not host video on your own server unless small. Use a CDN
  (Cloudflare Stream, Bunny, Mux) and proxy access via signed URLs.
- Do not let users mark themselves complete arbitrarily. The
  90%-watched server-validated event is the gate.
- Do not skip "resume where you left off". It's table-stakes.

## Verify

Instructor signs up → creates course → uploads video for lesson 1
→ publishes → learner buys → enrolls → watches video → progress
updates → marks complete → certificate downloadable → next lesson
unlocks.
