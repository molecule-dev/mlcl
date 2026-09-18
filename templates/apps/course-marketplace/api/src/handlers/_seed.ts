/**
 * Demo seed for course-marketplace.
 *
 * Two layers:
 *
 * 1. **Globals** (`seedGlobalCatalogIfEmpty`) — a stable demo instructor
 *    user plus a curated catalog (~6 published courses with lessons and
 *    a few seeded reviews). Idempotent: returns early if any non-draft
 *    course row already exists.
 *
 * 2. **Per-user** (`seedDemoForUser`) — for a freshly signed-up user,
 *    enrol them in a couple of courses, populate `lesson_progress` so
 *    `MyLearning` shows real % bars, issue one certificate so
 *    `/my-learning/:courseId/certificate` actually has a row to render,
 *    and create starter notifications so the bell isn't empty.
 *    Idempotent on user_id.
 *
 * The seed creates a real `users` row for the demo instructor so
 * `/api/instructors/:id` resolves cleanly and `/instructors/:id` page
 * renders. It deliberately creates NO `usersSecrets` row, so the demo
 * instructor has no password hash and is **not loginable** — the shared
 * login handler (`@molecule/api-resource-user`) returns 403 at its
 * `!secrets` check for any account without secrets. This is intentional:
 * the seed exists only so anonymous browsers see a populated catalog and
 * the instructor pages render; no one ever needs to authenticate as the
 * seed instructor. NEVER add a hardcoded password / `usersSecrets` row
 * here — a static credential committed to template source is a public
 * backdoor in every deployment.
 *
 * @module
 */

import crypto from 'node:crypto'

import { count, create, findMany, findOne } from '@molecule/api-database'

const DEMO_INSTRUCTOR_EMAIL = 'demo-instructor@example.com'
const DEMO_INSTRUCTOR_USERNAME = 'demoinstructor'

interface SeedLesson {
  title: string
  description: string
  duration_sec: number
  free_preview?: boolean
}

interface SeedCourse {
  slug: string
  title: string
  description: string
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  price_cents: number
  duration_min: number
  thumbnail_url: string
  featured: boolean
  status: 'published' | 'draft'
  rating_avg: number
  rating_count: number
  total_enrollments: number
  lessons: SeedLesson[]
  reviews: { rating: number; title: string; body: string; reviewer_name: string }[]
}

const SEED_COURSES: SeedCourse[] = [
  {
    slug: 'ux-figma',
    title: 'Mastering UI/UX Design: From Figma to Framer',
    description:
      'A studio-grade workflow for shipping interfaces that read like editorial design — from primitives to motion, with real Figma + Framer files for every module.',
    category: 'Design',
    level: 'intermediate',
    price_cents: 5999,
    duration_min: 14 * 60,
    thumbnail_url: 'https://picsum.photos/seed/feat-ux/640/360',
    featured: true,
    status: 'published',
    rating_avg: 4.9,
    rating_count: 8420,
    total_enrollments: 89400,
    lessons: [
      {
        title: 'Why systems beat one-offs',
        description: 'Why design systems pay off long-term.',
        duration_sec: 12 * 60 + 4,
        free_preview: true,
      },
      {
        title: 'Setting your studio palette',
        description: 'Choose a working colour scheme.',
        duration_sec: 8 * 60 + 21,
      },
      {
        title: 'A short history of the grid',
        description: 'Reading: foundations of grid design.',
        duration_sec: 5 * 60,
      },
      {
        title: 'Type scale and line-height pairing',
        description: 'Build a vertical rhythm.',
        duration_sec: 14 * 60 + 40,
      },
      {
        title: 'Color tokens that scale',
        description: 'Container/on-color pairs that survive theming.',
        duration_sec: 17 * 60 + 2,
      },
      {
        title: 'Spacing and the 8pt grid',
        description: 'Spacing tokens for layout.',
        duration_sec: 9 * 60 + 47,
      },
      {
        title: 'Composing primitives into components',
        description: 'From tokens to components.',
        duration_sec: 21 * 60 + 10,
      },
      {
        title: 'Storybook conventions',
        description: 'Conventions for component docs.',
        duration_sec: 15 * 60 + 15,
      },
    ],
    reviews: [
      {
        rating: 5,
        title: 'Unmatched depth',
        body: 'Sarah\u2019s curriculum is unmatched. The depth alone is worth 10x the price.',
        reviewer_name: 'James Wilson',
      },
      {
        rating: 5,
        title: 'Shipped a real system',
        body: 'I shipped a full design system using exactly the templates Sarah walks through.',
        reviewer_name: 'Amara Okafor',
      },
      {
        rating: 4,
        title: 'Brilliantly structured',
        body: 'Even as an engineer, I left with sharper opinions about typography and motion.',
        reviewer_name: 'David Chen',
      },
    ],
  },
  {
    slug: 'js-modern',
    title: 'The Complete JavaScript Modern Frameworks Bootcamp',
    description:
      'Take a tour through the modern JavaScript ecosystem — modules, build tooling, and the React/Vue/Svelte trifecta.',
    category: 'Development',
    level: 'beginner',
    price_cents: 4999,
    duration_min: 18 * 60,
    thumbnail_url: 'https://picsum.photos/seed/feat-js/640/360',
    featured: true,
    status: 'published',
    rating_avg: 4.8,
    rating_count: 12340,
    total_enrollments: 142100,
    lessons: [
      {
        title: 'Why modern JS is different',
        description: 'A tour of ES2022.',
        duration_sec: 9 * 60 + 12,
        free_preview: true,
      },
      {
        title: 'Modules and bundlers',
        description: 'Vite from scratch.',
        duration_sec: 14 * 60 + 30,
      },
      {
        title: 'TypeScript essentials',
        description: 'Types you will actually use.',
        duration_sec: 18 * 60 + 5,
      },
      {
        title: 'React, Vue, Svelte: the trade-offs',
        description: 'Honest comparison of the big three.',
        duration_sec: 22 * 60 + 18,
      },
      {
        title: 'Async patterns',
        description: 'Promises, generators, async iterators.',
        duration_sec: 16 * 60 + 4,
      },
      {
        title: 'Testing the modern stack',
        description: 'Vitest and Playwright.',
        duration_sec: 19 * 60 + 22,
      },
    ],
    reviews: [
      {
        rating: 5,
        title: 'Best JS course',
        body: 'Cleared up so many concepts I\u2019d only half-understood.',
        reviewer_name: 'Mia Park',
      },
      {
        rating: 5,
        title: 'Clear and dense',
        body: 'No filler. Every minute is high-density.',
        reviewer_name: 'Tom Becker',
      },
    ],
  },
  {
    slug: 'ds-archive',
    title: 'Data Science & Machine Learning Archive',
    description:
      'A lifetime archive of pragmatic ML. Start with linear models, end with transformers, all in Python.',
    category: 'Data Science',
    level: 'intermediate',
    price_cents: 4499,
    duration_min: 26 * 60,
    thumbnail_url: 'https://picsum.photos/seed/feat-ds/640/360',
    featured: true,
    status: 'published',
    rating_avg: 4.7,
    rating_count: 22100,
    total_enrollments: 168000,
    lessons: [
      {
        title: 'Why most ML projects fail',
        description: 'A frank intro.',
        duration_sec: 11 * 60 + 50,
        free_preview: true,
      },
      {
        title: 'Linear models you should still know',
        description: 'Foundations.',
        duration_sec: 22 * 60 + 4,
      },
      {
        title: 'Trees, forests, gradient boosting',
        description: 'Tabular ML in production.',
        duration_sec: 25 * 60 + 12,
      },
      {
        title: 'Embeddings and what they mean',
        description: 'Word, image, multimodal.',
        duration_sec: 18 * 60 + 30,
      },
      {
        title: 'Transformers from first principles',
        description: 'Attention is all you need.',
        duration_sec: 32 * 60,
      },
    ],
    reviews: [
      {
        rating: 5,
        title: 'Best ML primer',
        body: 'I\u2019ve taken three. This is the one to actually finish.',
        reviewer_name: 'Priya Singh',
      },
    ],
  },
  {
    slug: 'leadership',
    title: 'Executive Leadership: The Modern Approach',
    description:
      'Lead modern, asynchronous teams. Includes templates, scripts, and a real 12-week practice.',
    category: 'Business',
    level: 'advanced',
    price_cents: 8999,
    duration_min: 9 * 60,
    thumbnail_url: 'https://picsum.photos/seed/feat-lead/640/360',
    featured: true,
    status: 'published',
    rating_avg: 4.8,
    rating_count: 5630,
    total_enrollments: 31200,
    lessons: [
      {
        title: 'What modern leadership actually means',
        description: 'Setting the stage.',
        duration_sec: 10 * 60 + 50,
        free_preview: true,
      },
      {
        title: 'The async-first operating model',
        description: 'Practical async leadership.',
        duration_sec: 17 * 60 + 22,
      },
      {
        title: 'Setting expectations in writing',
        description: 'Templates included.',
        duration_sec: 14 * 60,
      },
      {
        title: 'Running a quarterly with no surprises',
        description: 'How to plan ahead.',
        duration_sec: 21 * 60,
      },
    ],
    reviews: [
      {
        rating: 5,
        title: 'Practical and short',
        body: 'No fluff. Used the templates within a week.',
        reviewer_name: 'Sandra Liu',
      },
    ],
  },
  {
    slug: 'design-systems',
    title: 'Design Systems at Scale',
    description:
      'Operate a design system across many product teams. Tokens, components, governance.',
    category: 'Design',
    level: 'advanced',
    price_cents: 5499,
    duration_min: 12 * 60,
    thumbnail_url: 'https://picsum.photos/seed/br-ds-sys/640/360',
    featured: false,
    status: 'published',
    rating_avg: 4.7,
    rating_count: 4490,
    total_enrollments: 18420,
    lessons: [
      {
        title: 'When a design system is worth it',
        description: 'The decision.',
        duration_sec: 9 * 60 + 44,
        free_preview: true,
      },
      {
        title: 'Token architecture',
        description: 'Tokens, primitives, semantic layers.',
        duration_sec: 19 * 60,
      },
      {
        title: 'Governance models',
        description: 'How to scale ownership.',
        duration_sec: 22 * 60 + 12,
      },
      {
        title: 'Migrating existing apps',
        description: 'Strategies that work.',
        duration_sec: 18 * 60,
      },
    ],
    reviews: [
      {
        rating: 5,
        title: 'Real-world advice',
        body: 'The governance section alone made this worth it.',
        reviewer_name: 'Caleb Frost',
      },
    ],
  },
  {
    slug: 'ux-research',
    title: 'User Research for Designers',
    description:
      'A working research practice for product designers — interviews, usability studies, and data triangulation.',
    category: 'Design',
    level: 'beginner',
    price_cents: 0,
    duration_min: 6 * 60,
    thumbnail_url: 'https://picsum.photos/seed/br-ux/640/360',
    featured: false,
    status: 'draft',
    rating_avg: 0,
    rating_count: 0,
    total_enrollments: 0,
    lessons: [
      { title: 'Why research matters', description: 'Setting context.', duration_sec: 8 * 60 },
      {
        title: 'Running an interview',
        description: 'Practical interview craft.',
        duration_sec: 14 * 60,
      },
    ],
    reviews: [],
  },
]

async function ensureDemoInstructor(): Promise<{ id: string; created: boolean }> {
  const existing = await findOne<Record<string, unknown>>('users', [
    { field: 'email', operator: '=', value: DEMO_INSTRUCTOR_EMAIL },
  ])
  if (existing) {
    return { id: String(existing.id), created: false }
  }
  const userId = crypto.randomUUID()
  await create('users', {
    id: userId,
    name: 'Sarah Dillard',
    username: DEMO_INSTRUCTOR_USERNAME,
    email: DEMO_INSTRUCTOR_EMAIL,
    is_instructor: true,
    instructor_bio:
      'Sarah has spent 15 years shipping design systems and developer tooling at category-defining companies. She teaches the studio practice she wishes she had when she started.',
    instructor_avatar_url: 'https://i.pravatar.cc/256?u=demo-instructor',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  // Deliberately NO `usersSecrets` row: the demo instructor must exist so the
  // catalog/instructor pages render, but it must NOT be loginable. Without a
  // password hash, the shared login handler returns 403 at its `!secrets`
  // check, so there is no committed-credential backdoor.
  return { id: userId, created: true }
}

/**
 * Seed the global catalog (instructor, courses, lessons, reviews) if no
 * published course row already exists. Idempotent.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  instructorCreated: boolean
  coursesCreated: number
  lessonsCreated: number
  reviewsCreated: number
}> {
  const publishedCount = await count('courses', [
    { field: 'status', operator: '=', value: 'published' },
  ])
  if (publishedCount > 0) {
    return { instructorCreated: false, coursesCreated: 0, lessonsCreated: 0, reviewsCreated: 0 }
  }

  const { id: instructorId, created: instructorCreated } = await ensureDemoInstructor()

  let coursesCreated = 0
  let lessonsCreated = 0
  let reviewsCreated = 0

  for (const course of SEED_COURSES) {
    const courseResult = await create<Record<string, unknown>>('courses', {
      instructor_id: instructorId,
      user_id: instructorId,
      title: course.title,
      slug: course.slug,
      description: course.description,
      category: course.category,
      thumbnail_url: course.thumbnail_url,
      price_cents: course.price_cents,
      level: course.level,
      duration_min: course.duration_min,
      total_lessons: course.lessons.length,
      status: course.status,
      featured: course.featured,
      total_enrollments: course.total_enrollments,
      rating_avg: course.rating_avg,
      rating_count: course.rating_count,
      published_at: course.status === 'published' ? new Date() : null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const courseRow = (courseResult.data ?? {}) as Record<string, unknown>
    const cId = String(courseRow.id ?? '')
    if (!cId) throw new Error('seed: failed to create course (no id returned)')
    coursesCreated++

    for (let i = 0; i < course.lessons.length; i++) {
      const lesson = course.lessons[i]
      await create('lessons', {
        course_id: cId,
        user_id: instructorId,
        title: lesson.title,
        description: lesson.description,
        video_url: null,
        video_hls_url: null,
        thumbnail_url: `https://picsum.photos/seed/${course.slug}-lesson-${i}/320/180`,
        duration_sec: lesson.duration_sec,
        sort_order: i,
        free_preview: !!lesson.free_preview,
        created_at: new Date(),
        updated_at: new Date(),
      })
      lessonsCreated++
    }

    // Reviews use synthetic reviewer ids so multiple demo reviews can coexist
    // for the same course (the table has a unique (resourceType, resourceId,
    // userId) constraint, so distinct reviewer ids are mandatory).
    for (const review of course.reviews) {
      await create('reviews', {
        resourceType: 'course',
        resourceId: cId,
        userId: crypto.randomUUID(),
        rating: review.rating,
        title: review.title,
        body: `${review.body} \u2014 ${review.reviewer_name}`,
        helpful: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      reviewsCreated++
    }
  }

  return { instructorCreated, coursesCreated, lessonsCreated, reviewsCreated }
}

/**
 * Seed a freshly signed-up user with starter enrollments, lesson
 * progress, a single completed certificate, and notifications so every
 * authed page has real data to render. Idempotent.
 */
export async function seedDemoForUser(userId: string): Promise<{
  enrollmentsCreated: number
  lessonProgressCreated: number
  certificatesCreated: number
  notificationsCreated: number
}> {
  if (!userId) {
    return {
      enrollmentsCreated: 0,
      lessonProgressCreated: 0,
      certificatesCreated: 0,
      notificationsCreated: 0,
    }
  }

  const existingEnrollments = await count('enrollments', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existingEnrollments > 0) {
    return {
      enrollmentsCreated: 0,
      lessonProgressCreated: 0,
      certificatesCreated: 0,
      notificationsCreated: 0,
    }
  }

  const publishedCourses = await findMany<Record<string, unknown>>('courses', {
    where: [{ field: 'status', operator: '=', value: 'published' }],
    orderBy: [{ field: 'published_at', direction: 'desc' }],
    limit: 6,
  })
  if (publishedCourses.length === 0) {
    return {
      enrollmentsCreated: 0,
      lessonProgressCreated: 0,
      certificatesCreated: 0,
      notificationsCreated: 0,
    }
  }

  // Pick three courses for the demo learner journey:
  //   - first course: in progress (~25% complete) so the Continue CTA works
  //   - second course: fully complete (eligible for certificate)
  //   - third course: just enrolled, 0% (so the empty-progress branch shows)
  const picks = publishedCourses.slice(0, 3)

  let enrollmentsCreated = 0
  let lessonProgressCreated = 0
  let certificatesCreated = 0

  for (let i = 0; i < picks.length; i++) {
    const course = picks[i]
    const courseId = String(course.id)
    const lessons = await findMany<Record<string, unknown>>('lessons', {
      where: [{ field: 'course_id', operator: '=', value: courseId }],
      orderBy: [{ field: 'sort_order', direction: 'asc' }],
      limit: 200,
    })

    let completedLessons: number
    if (i === 0) {
      completedLessons = Math.max(1, Math.floor(lessons.length * 0.25))
    } else if (i === 1) {
      completedLessons = lessons.length
    } else {
      completedLessons = 0
    }

    const enrollmentResult = await create<Record<string, unknown>>('enrollments', {
      user_id: userId,
      course_id: courseId,
      payment_id: null,
      progress: lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0,
      completed_at: completedLessons === lessons.length && lessons.length > 0 ? new Date() : null,
      enrolled_at: new Date(Date.now() - (i + 1) * 86_400_000),
      created_at: new Date(),
      updated_at: new Date(),
    })
    const enrollmentRow = (enrollmentResult.data ?? {}) as Record<string, unknown>
    const enrollmentId = String(enrollmentRow.id ?? '')
    if (!enrollmentId) continue
    enrollmentsCreated++

    for (let j = 0; j < lessons.length; j++) {
      const lesson = lessons[j]
      const isComplete = j < completedLessons
      if (!isComplete && j !== completedLessons) continue
      const watched = isComplete
        ? Number(lesson.duration_sec ?? 0)
        : Math.floor(Number(lesson.duration_sec ?? 60) * 0.4)
      await create('lesson_progress', {
        user_id: userId,
        lesson_id: lesson.id,
        course_id: courseId,
        watched_seconds: watched,
        completed_at: isComplete ? new Date(Date.now() - (lessons.length - j) * 3600 * 1000) : null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      lessonProgressCreated++
    }

    if (completedLessons === lessons.length && lessons.length > 0) {
      const certNumber = `LECT-${Date.now().toString(36).slice(-4).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`
      await create('certificates', {
        user_id: userId,
        course_id: courseId,
        enrollment_id: enrollmentId,
        certificate_number: certNumber,
        pdf_url: null,
        issued_at: new Date(),
        created_at: new Date(),
      })
      certificatesCreated++
    }
  }

  // Notifications keyed off the picks so the in-app links are real.
  const notifs = [
    {
      type: 'enrollment',
      title: 'You enrolled in a new course',
      body: `Welcome to "${picks[0]?.title ?? 'your course'}". Pick up where you left off any time.`,
      href: picks[0] ? `/courses/${picks[0].id}` : '/my-learning',
      entity_id: picks[0]?.id ?? null,
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    {
      type: 'certificate',
      title: 'Certificate ready',
      body: picks[1]?.title
        ? `You completed "${picks[1].title}". Your certificate is ready to download.`
        : 'Your certificate is ready.',
      href: picks[1] ? `/my-learning/${picks[1].id}/certificate` : '/my-learning',
      entity_id: picks[1]?.id ?? null,
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      type: 'review',
      title: 'New 5-star review',
      body: '"Sarah\u2019s curriculum is unmatched \u2014 the depth alone is worth 10x the price." \u2014 James W.',
      href: picks[0] ? `/courses/${picks[0].id}` : '/instructor',
      entity_id: picks[0]?.id ?? null,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      type: 'update',
      title: 'Course updated',
      body: 'New lessons were added to a course in your library.',
      href: picks[2] ? `/courses/${picks[2].id}` : '/browse',
      entity_id: picks[2]?.id ?? null,
      created_at: new Date(Date.now() - 36 * 60 * 60 * 1000),
    },
  ]

  let notificationsCreated = 0
  for (const n of notifs) {
    await create('notifications', {
      user_id: userId,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      entity_id: n.entity_id,
      unread: true,
      read_at: null,
      created_at: n.created_at,
    })
    notificationsCreated++
  }

  return {
    enrollmentsCreated,
    lessonProgressCreated,
    certificatesCreated,
    notificationsCreated,
  }
}
