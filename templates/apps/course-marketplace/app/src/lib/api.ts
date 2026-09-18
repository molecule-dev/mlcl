/**
 * Thin fetch wrapper for the course-marketplace API.
 *
 * - Always sends credentials so the JWT cookie is included on every call.
 * - Throws a typed `ApiError` for non-2xx responses so React components can
 *   render a stable "something went wrong" surface without having to reach
 *   into the raw `Response` object.
 * - Centralises the `/api` prefix so per-page code reads as
 *   `api('/courses/featured')` instead of repeating string literals.
 */

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

export type ApiInit = Omit<RequestInit, 'body'> & {
  body?: unknown
}

export async function api<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  const url = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? '' : '/'}${path}`
  const headers = new Headers(init.headers ?? {})
  let body: BodyInit | undefined
  if (init.body !== undefined && init.body !== null) {
    if (typeof init.body === 'string' || init.body instanceof FormData) {
      body = init.body as BodyInit
    } else {
      headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json')
      body = JSON.stringify(init.body)
    }
  }
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers,
    body,
  })
  const text = await response.text()
  let parsed: unknown = text
  if (text) {
    try {
      parsed = JSON.parse(text)
      // intentional noop: if JSON.parse fails, fall back to raw text response
    } catch (_error) {
      parsed = text
    }
  }
  if (!response.ok) {
    const message =
      typeof parsed === 'string'
        ? parsed
        : ((parsed as { message?: string } | null)?.message ?? response.statusText)
    throw new ApiError(response.status, message || `Request failed (${response.status})`, parsed)
  }
  return parsed as T
}

export type CourseSummary = {
  id: string
  slug?: string
  title: string
  description?: string
  category?: string
  level?: string
  thumbnail_url?: string
  price_cents: number
  original_price_cents?: number
  duration_min?: number
  duration_label?: string
  total_lessons?: number
  total_enrollments?: number
  rating_avg?: number
  rating_count?: number
  status?: string
  featured?: boolean
  instructor_id?: string
  instructor_name?: string
  instructor_avatar_url?: string
  created_at?: string
  published_at?: string
}

export type Lesson = {
  id: string
  course_id: string
  title: string
  description?: string | null
  duration_sec: number
  duration_label?: string
  sort_order?: number
  /** legacy alias preserved for any consumer that still reads order_index */
  order_index?: number
  free_preview?: boolean
  video_url?: string | null
  video_hls_url?: string | null
  thumbnail_url?: string | null
  is_completed?: boolean
  watched_seconds?: number
  progress_sec?: number
}

export type Review = {
  id: string
  resourceType: string
  resourceId: string
  userId: string
  rating: number
  title?: string
  body?: string
  helpful?: number
  createdAt?: string
}

/**
 * Shape returned by `/api/enrollments`. The decorator merges course
 * fields into the row (so `title`, `slug`, `instructor_name` etc. are
 * available at the top level) and adds enrollment-specific keys.
 */
export type EnrolledCourse = CourseSummary & {
  enrollment_id: string
  course_id: string
  enrolled_at?: string | null
  enrollment_completed_at?: string | null
  lessons_total: number
  lessons_completed: number
  progress_percent: number
}

export type Certificate = {
  id: string
  user_id: string
  course_id: string
  issued_at: string
  serial: string
  course?: CourseSummary
}

export type Instructor = {
  id: string
  name: string
  username?: string | null
  bio?: string | null
  avatar_url?: string | null
  is_instructor?: boolean
  total_students?: number
  total_courses?: number
  average_rating?: number
  total_reviews?: number
  created_at?: string | null
}

export type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body?: string
  href?: string
  entity_id?: string
  unread: boolean
  read_at?: string | null
  created_at: string
}

export type Category = { name: string; courseCount?: number }
