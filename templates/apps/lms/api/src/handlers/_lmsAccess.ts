import type { Response } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { findById, findMany, findOne } from '@molecule/api-database'

/**
 * Re-export with the project's local name. Handlers historically called
 * `requireUserId(res)` so we keep that surface; the implementation
 * delegates to molecule's `requireUser(res)` (writes a 401 + returns null
 * when no session, returns string user id otherwise).
 */
export const requireUserId = requireUser

/**
 * Runtime input validation for helper arguments. The handlers that call
 * these helpers already validate request bodies via `validateBody`, but the
 * helper API surface receives raw strings extracted from URL params /
 * session locals — parsing them through a zod schema here catches accidental
 * misuse (undefined, empty, non-string IDs) before we hit the database.
 */
const idSchema = z.string().min(1)

export async function getCourse(courseId: string): Promise<Record<string, unknown> | null> {
  if (!idSchema.safeParse(courseId).success) return null
  const course = await findById<Record<string, unknown>>('courses', courseId)
  return course ?? null
}

/** True when the user is the course instructor or an active TA enrollment. */
export async function isCourseStaff(userId: string, courseId: string): Promise<boolean> {
  const course = await getCourse(courseId)
  if (!course) return false
  if (course.instructor_id === userId) return true
  const ta = await findOne<Record<string, unknown>>('enrollments', [
    { field: 'course_id', operator: '=', value: courseId },
    { field: 'student_id', operator: '=', value: userId },
    { field: 'role', operator: '=', value: 'ta' },
    { field: 'status', operator: '=', value: 'active' },
  ])
  return Boolean(ta)
}

export async function assertCourseStaff(
  res: Response,
  userId: string,
  courseId: string,
): Promise<boolean> {
  const course = await getCourse(courseId)
  if (!course) {
    res.status(404).json({ error: 'Course not found' })
    return false
  }
  if (await isCourseStaff(userId, courseId)) return true
  res.status(403).json({ error: 'Forbidden' })
  return false
}

/**
 * Every course id the user is staff for: courses they instruct plus
 * courses where they hold an active TA enrollment. Used to scope a
 * non-self caller's cross-course reads (e.g. an instructor viewing one
 * student's grades across only the courses they staff) without leaking
 * grades/enrollments from courses the caller has no role in.
 */
export async function staffCourseIds(userId: string): Promise<string[]> {
  if (!idSchema.safeParse(userId).success) return []
  const owned = await findMany<Record<string, unknown>>('courses', {
    where: [{ field: 'instructor_id', operator: '=', value: userId }],
  })
  const taEnrollments = await findMany<Record<string, unknown>>('enrollments', {
    where: [
      { field: 'student_id', operator: '=', value: userId },
      { field: 'role', operator: '=', value: 'ta' },
      { field: 'status', operator: '=', value: 'active' },
    ],
  })
  const ids = new Set<string>()
  for (const c of owned) ids.add(String(c.id))
  for (const e of taEnrollments) ids.add(String(e.course_id))
  return [...ids]
}

/**
 * Every course id the caller has an active enrollment in (as student, TA, or
 * observer). Used to scope a forum-wide list to the courses the caller is
 * actually a member of, without leaking threads from courses they have no
 * relationship to. Combine with `staffCourseIds` for the full readable set.
 */
export async function enrolledCourseIds(userId: string): Promise<string[]> {
  if (!idSchema.safeParse(userId).success) return []
  const rows = await findMany<Record<string, unknown>>('enrollments', {
    where: [
      { field: 'student_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'active' },
    ],
  })
  return [...new Set(rows.map((r) => String(r.course_id)))]
}

/** Active student (or TA) enrollment in the course. */
export async function assertEnrolled(
  res: Response,
  userId: string,
  courseId: string,
): Promise<boolean> {
  const course = await getCourse(courseId)
  if (!course) {
    res.status(404).json({ error: 'Course not found' })
    return false
  }
  const enrollment = await findOne<Record<string, unknown>>('enrollments', [
    { field: 'course_id', operator: '=', value: courseId },
    { field: 'student_id', operator: '=', value: userId },
    { field: 'status', operator: '=', value: 'active' },
  ])
  if (enrollment) return true
  res.status(403).json({ error: 'Forbidden' })
  return false
}
