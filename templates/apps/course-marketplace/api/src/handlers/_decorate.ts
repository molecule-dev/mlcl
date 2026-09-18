/**
 * View-projection helpers — convert raw DB rows from `courses`, `lessons`,
 * `enrollments`, `certificates`, `users` (instructor), and `notifications`
 * into the camelCase shapes the React pages render.
 *
 * Everything async — most projections look up adjacent rows (instructor
 * for a course, course for an enrollment, lesson_progress for an
 * enrolled course) so callers should batch via the `decorate*Many`
 * variants rather than round-tripping per row.
 *
 * @module
 */

import { count, findById, findMany, findOne } from '@molecule/api-database'

function asISO(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

export interface ViewCourseSummary {
  id: string
  slug: string | null
  title: string
  description: string | null
  category: string | null
  level: string
  thumbnail_url: string | null
  price_cents: number
  original_price_cents: number | null
  duration_min: number
  total_lessons: number
  total_enrollments: number
  rating_avg: number
  rating_count: number
  status: string
  featured: boolean
  instructor_id: string | null
  instructor_name: string | null
  instructor_avatar_url: string | null
  created_at: string | null
  published_at: string | null
}

export interface ViewLesson {
  id: string
  course_id: string
  title: string
  description: string | null
  duration_sec: number
  duration_label: string
  video_url: string | null
  video_hls_url: string | null
  thumbnail_url: string | null
  sort_order: number
  free_preview: boolean
  completed: boolean
  watched_seconds: number
}

export interface ViewEnrolledCourse extends ViewCourseSummary {
  enrollment_id: string
  course_id: string
  enrolled_at: string | null
  enrollment_completed_at: string | null
  lessons_total: number
  lessons_completed: number
  progress_percent: number
}

export interface ViewCertificate {
  id: string
  certificate_number: string
  course_id: string
  course_title: string
  user_id: string
  recipient_name: string
  instructor_name: string
  issued_at: string | null
  download_url: string
}

export interface ViewInstructor {
  id: string
  name: string
  username: string | null
  bio: string | null
  avatar_url: string | null
  is_instructor: boolean
  created_at: string | null
  total_courses: number
  total_students: number
  average_rating: number
  total_reviews: number
}

export interface ViewNotification {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  entity_id: string | null
  unread: boolean
  read_at: string | null
  created_at: string | null
}

function durationLabel(seconds: number): string {
  if (!seconds || seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

async function instructorRow(
  cache: Map<string, Record<string, unknown> | null>,
  instructorId: string | null,
): Promise<Record<string, unknown> | null> {
  if (!instructorId) return null
  if (cache.has(instructorId)) return cache.get(instructorId)!
  const row = await findById<Record<string, unknown>>('users', instructorId)
  cache.set(instructorId, row ?? null)
  return row ?? null
}

export async function decorateCourse(
  course: Record<string, unknown>,
  instructorCache: Map<string, Record<string, unknown> | null> = new Map(),
): Promise<ViewCourseSummary> {
  const instructor = await instructorRow(
    instructorCache,
    course.instructor_id ? String(course.instructor_id) : null,
  )
  return {
    id: String(course.id),
    slug: course.slug ? String(course.slug) : null,
    title: String(course.title ?? ''),
    description: course.description ? String(course.description) : null,
    category: course.category ? String(course.category) : null,
    level: String(course.level ?? 'beginner'),
    thumbnail_url: course.thumbnail_url ? String(course.thumbnail_url) : null,
    price_cents: Number(course.price_cents ?? 0),
    original_price_cents:
      course.price_cents && Number(course.price_cents) > 0
        ? Math.round(Number(course.price_cents) * 2.5)
        : null,
    duration_min: Number(course.duration_min ?? 0),
    total_lessons: Number(course.total_lessons ?? 0),
    total_enrollments: Number(course.total_enrollments ?? 0),
    rating_avg: Number(course.rating_avg ?? 0),
    rating_count: Number(course.rating_count ?? 0),
    status: String(course.status ?? 'draft'),
    featured: !!course.featured,
    instructor_id: course.instructor_id ? String(course.instructor_id) : null,
    instructor_name: instructor?.name ? String(instructor.name) : null,
    instructor_avatar_url: instructor?.instructor_avatar_url
      ? String(instructor.instructor_avatar_url)
      : null,
    created_at: asISO(course.created_at),
    published_at: asISO(course.published_at),
  }
}

export async function decorateCourses(
  rows: Record<string, unknown>[],
): Promise<ViewCourseSummary[]> {
  const cache = new Map<string, Record<string, unknown> | null>()
  return Promise.all(rows.map((row) => decorateCourse(row, cache)))
}

export async function decorateLesson(
  lesson: Record<string, unknown>,
  ctx: { userId: string | null } = { userId: null },
): Promise<ViewLesson> {
  let completed = false
  let watched = 0
  if (ctx.userId) {
    const progress = await findOne<Record<string, unknown>>('lesson_progress', [
      { field: 'user_id', operator: '=', value: ctx.userId },
      { field: 'lesson_id', operator: '=', value: String(lesson.id) },
    ])
    if (progress) {
      completed = !!progress.completed_at
      watched = Number(progress.watched_seconds ?? 0)
    }
  }
  const seconds = Number(lesson.duration_sec ?? 0)
  return {
    id: String(lesson.id),
    course_id: String(lesson.course_id),
    title: String(lesson.title ?? ''),
    description: lesson.description ? String(lesson.description) : null,
    duration_sec: seconds,
    duration_label: durationLabel(seconds),
    video_url: lesson.video_url ? String(lesson.video_url) : null,
    video_hls_url: lesson.video_hls_url ? String(lesson.video_hls_url) : null,
    thumbnail_url: lesson.thumbnail_url ? String(lesson.thumbnail_url) : null,
    sort_order: Number(lesson.sort_order ?? 0),
    free_preview: !!lesson.free_preview,
    completed,
    watched_seconds: watched,
  }
}

export async function decorateLessons(
  rows: Record<string, unknown>[],
  ctx: { userId: string | null } = { userId: null },
): Promise<ViewLesson[]> {
  return Promise.all(rows.map((r) => decorateLesson(r, ctx)))
}

export async function decorateEnrolledCourse(
  enrollment: Record<string, unknown>,
  course: Record<string, unknown>,
  instructorCache: Map<string, Record<string, unknown> | null>,
): Promise<ViewEnrolledCourse> {
  const summary = await decorateCourse(course, instructorCache)
  const lessonsTotal = Number(course.total_lessons ?? 0)
  const completedRows = await count('lesson_progress', [
    { field: 'user_id', operator: '=', value: String(enrollment.user_id) },
    { field: 'course_id', operator: '=', value: String(course.id) },
    { field: 'completed_at', operator: 'is_not_null' },
  ])
  const completedSafe = lessonsTotal > 0 ? Math.min(lessonsTotal, completedRows) : completedRows
  const progress = lessonsTotal > 0 ? Math.round((completedSafe / lessonsTotal) * 100) : 0
  return {
    ...summary,
    enrollment_id: String(enrollment.id),
    course_id: String(course.id),
    enrolled_at: asISO(enrollment.enrolled_at),
    enrollment_completed_at: asISO(enrollment.completed_at),
    lessons_total: lessonsTotal,
    lessons_completed: completedSafe,
    progress_percent: progress,
  }
}

export async function decorateMyLearning(
  enrollments: Record<string, unknown>[],
): Promise<ViewEnrolledCourse[]> {
  const cache = new Map<string, Record<string, unknown> | null>()
  const out: ViewEnrolledCourse[] = []
  for (const e of enrollments) {
    const course = await findById<Record<string, unknown>>('courses', String(e.course_id))
    if (!course) continue
    out.push(await decorateEnrolledCourse(e, course, cache))
  }
  return out
}

export async function decorateCertificate(cert: Record<string, unknown>): Promise<ViewCertificate> {
  const course = await findById<Record<string, unknown>>('courses', String(cert.course_id))
  const user = await findById<Record<string, unknown>>('users', String(cert.user_id))
  let instructor: Record<string, unknown> | null = null
  if (course?.instructor_id) {
    instructor = await findById<Record<string, unknown>>('users', String(course.instructor_id))
  }
  const certId = String(cert.id)
  return {
    id: certId,
    certificate_number: String(cert.certificate_number ?? ''),
    course_id: String(cert.course_id),
    course_title: String(course?.title ?? ''),
    user_id: String(cert.user_id),
    recipient_name: String(user?.name ?? user?.email ?? 'Student'),
    instructor_name: String(instructor?.name ?? ''),
    issued_at: asISO(cert.issued_at),
    download_url: `/api/certificates/${certId}/download`,
  }
}

export async function decorateInstructor(user: Record<string, unknown>): Promise<ViewInstructor> {
  const id = String(user.id)
  const courses = await findMany<Record<string, unknown>>('courses', {
    where: [
      { field: 'instructor_id', operator: '=', value: id },
      { field: 'status', operator: '=', value: 'published' },
    ],
    select: ['id', 'total_enrollments', 'rating_avg', 'rating_count'],
    limit: 200,
  })
  const totalCourses = courses.length
  const totalStudents = courses.reduce((sum, c) => sum + Number(c.total_enrollments ?? 0), 0)
  const totalReviews = courses.reduce((sum, c) => sum + Number(c.rating_count ?? 0), 0)
  const averageRating =
    totalReviews === 0
      ? 0
      : Math.round(
          (courses.reduce(
            (acc, c) => acc + Number(c.rating_avg ?? 0) * Number(c.rating_count ?? 0),
            0,
          ) /
            totalReviews) *
            100,
        ) / 100
  return {
    id,
    name: String(user.name ?? ''),
    username: user.username ? String(user.username) : null,
    bio: user.instructor_bio ? String(user.instructor_bio) : null,
    avatar_url: user.instructor_avatar_url
      ? String(user.instructor_avatar_url)
      : `https://i.pravatar.cc/256?u=${encodeURIComponent(id)}`,
    is_instructor: !!user.is_instructor,
    created_at: asISO((user as Record<string, unknown>).createdAt ?? user.created_at),
    total_courses: totalCourses,
    total_students: totalStudents,
    average_rating: averageRating,
    total_reviews: totalReviews,
  }
}

export function decorateNotification(n: Record<string, unknown>): ViewNotification {
  return {
    id: String(n.id),
    type: String(n.type ?? 'system'),
    title: String(n.title ?? ''),
    body: n.body ? String(n.body) : null,
    href: n.href ? String(n.href) : null,
    entity_id: n.entity_id ? String(n.entity_id) : null,
    unread: !!n.unread,
    read_at: asISO(n.read_at),
    created_at: asISO(n.created_at),
  }
}
