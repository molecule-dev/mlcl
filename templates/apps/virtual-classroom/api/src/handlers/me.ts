/**
 * /me — small per-user composite endpoints.
 *
 * - GET  /me/dashboard       compact bundle the Dashboard page mounts on.
 *                              Includes counts, the user's next-upcoming
 *                              live room, recent assignments, and recent
 *                              grades. The frontend can fan out to the
 *                              detail endpoints for the full lists, but
 *                              this one round-trip is what makes the
 *                              landing screen feel snappy.
 * - GET  /me/calendar        union of `rooms.scheduled_at` and
 *                              `assignments.due_date` for courses the
 *                              user owns or is enrolled in.
 * - POST /me/seed-demo       idempotent: creates a starter course +
 *                              assignments + a live room + a couple
 *                              notifications for a brand-new user so
 *                              the app shows real content the first
 *                              time it loads. No-ops if the user
 *                              already has any course / room.
 */

import { type Request, type Response, Router } from 'express'

import { count, create, findMany, findOne } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

import {
  type AssignmentRow,
  type CourseEnrollmentRow,
  type CourseRow,
  generateJoinCode,
  type GradeRow,
  internalError,
  type NotificationRow,
  requireUser,
  type RoomRow,
} from '../lib/authz.js'

const router = Router()

router.get('/dashboard', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    // Auto-seed a brand-new user so they don't land on a blank dashboard.
    // The seed function is idempotent — it no-ops if the user already has
    // any courses or rooms.
    await ensureUserSeed(userId)

    const [owned, enrollments, upcomingRooms, recentNotifications] = await Promise.all([
      findMany<CourseRow>('courses', {
        where: [{ field: 'instructor_id', operator: '=', value: userId }],
      }),
      findMany<CourseEnrollmentRow>('course_enrollments', {
        where: [{ field: 'student_id', operator: '=', value: userId }],
      }),
      findMany<RoomRow>('rooms', {
        where: [
          { field: 'host_id', operator: '=', value: userId },
          { field: 'status', operator: '!=', value: 'ended' },
        ],
        orderBy: [{ field: 'scheduled_at', direction: 'asc' }],
        limit: 5,
      }),
      findMany<NotificationRow>('notifications', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 5,
      }),
    ])

    const courseIds = new Set<string>([
      ...owned.map((c) => c.id),
      ...enrollments.map((e) => e.course_id),
    ])
    const courseList: CourseRow[] = [...owned]
    if (enrollments.length > 0) {
      const enrolledCourses = await findMany<CourseRow>('courses', {
        where: [{ field: 'id', operator: 'in', value: enrollments.map((e) => e.course_id) }],
      })
      const seen = new Set(courseList.map((c) => c.id))
      for (const c of enrolledCourses) if (!seen.has(c.id)) courseList.push(c)
    }

    let upcomingAssignments: AssignmentRow[] = []
    let recentGrades: GradeRow[] = []
    if (courseIds.size > 0) {
      upcomingAssignments = await findMany<AssignmentRow>('assignments', {
        where: [{ field: 'course_id', operator: 'in', value: Array.from(courseIds) }],
        orderBy: [{ field: 'due_date', direction: 'asc' }],
        limit: 6,
      })
      recentGrades = await findMany<GradeRow>('grades', {
        where: [{ field: 'student_id', operator: '=', value: userId }],
        orderBy: [{ field: 'graded_at', direction: 'desc' }],
        limit: 5,
      })
    }

    const unreadCount = await count('notifications', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read_at', operator: 'is_null' },
    ])

    res.json({
      stats: {
        courses: courseList.length,
        enrolled: enrollments.length,
        teaching: owned.length,
        assignments: upcomingAssignments.length,
        unreadNotifications: unreadCount,
      },
      upcomingRoom: upcomingRooms[0] ?? null,
      upcomingRooms,
      courses: courseList,
      assignments: upcomingAssignments,
      grades: recentGrades,
      notifications: recentNotifications,
    })
  } catch (error) {
    logger.error('me.dashboard', error)
    internalError(res)
  }
})

router.get('/calendar', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    const owned = await findMany<CourseRow>('courses', {
      where: [{ field: 'instructor_id', operator: '=', value: userId }],
    })
    const enrollments = await findMany<CourseEnrollmentRow>('course_enrollments', {
      where: [{ field: 'student_id', operator: '=', value: userId }],
    })
    const courseIds = new Set<string>([
      ...owned.map((c) => c.id),
      ...enrollments.map((e) => e.course_id),
    ])

    const events: Array<{
      id: string
      kind: 'class' | 'assignment'
      title: string
      course_id: string | null
      starts_at: string | null
      ends_at: string | null
      url: string
    }> = []

    if (courseIds.size > 0) {
      const assignments = await findMany<AssignmentRow>('assignments', {
        where: [{ field: 'course_id', operator: 'in', value: Array.from(courseIds) }],
        orderBy: [{ field: 'due_date', direction: 'asc' }],
      })
      for (const a of assignments) {
        events.push({
          id: a.id,
          kind: 'assignment',
          title: a.title,
          course_id: a.course_id,
          starts_at: a.due_date,
          ends_at: a.due_date,
          url: `/assignments/${a.id}`,
        })
      }

      const rooms = await findMany<RoomRow>('rooms', {
        where: [{ field: 'course_id', operator: 'in', value: Array.from(courseIds) }],
        orderBy: [{ field: 'scheduled_at', direction: 'asc' }],
      })
      for (const r of rooms) {
        events.push({
          id: r.id,
          kind: 'class',
          title: r.name,
          course_id: r.course_id,
          starts_at: r.scheduled_at ?? r.started_at,
          ends_at: r.ended_at,
          url: `/class/${r.id}`,
        })
      }
    }

    // Always include rooms the user hosts directly (even ones not tied to a
    // course) — these include the auto-seed Aula room from ensureUserSeed.
    const hosted = await findMany<RoomRow>('rooms', {
      where: [{ field: 'host_id', operator: '=', value: userId }],
      orderBy: [{ field: 'scheduled_at', direction: 'asc' }],
    })
    const seenRooms = new Set(events.filter((e) => e.kind === 'class').map((e) => e.id))
    for (const r of hosted) {
      if (seenRooms.has(r.id)) continue
      events.push({
        id: r.id,
        kind: 'class',
        title: r.name,
        course_id: r.course_id,
        starts_at: r.scheduled_at ?? r.started_at,
        ends_at: r.ended_at,
        url: `/class/${r.id}`,
      })
    }

    events.sort((a, b) => {
      const ta = a.starts_at ? new Date(a.starts_at).getTime() : Number.MAX_SAFE_INTEGER
      const tb = b.starts_at ? new Date(b.starts_at).getTime() : Number.MAX_SAFE_INTEGER
      return ta - tb
    })

    res.json(events)
  } catch (error) {
    logger.error('me.calendar', error)
    internalError(res)
  }
})

router.post('/seed-demo', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    const seeded = await ensureUserSeed(userId)
    res.status(seeded ? 201 : 200).json({ seeded })
  } catch (error) {
    logger.error('me.seedDemo', error)
    internalError(res)
  }
})

const COURSE_PRESETS: Array<{
  code: string
  title: string
  term: string
  description: string
  assignments: Array<{
    title: string
    description: string
    type: 'homework' | 'quiz' | 'lab' | 'project' | 'exam'
    points: number
    dueOffsetDays: number
  }>
}> = [
  {
    code: 'AULA 101',
    title: 'Welcome to Aula',
    term: 'Spring 2026',
    description:
      'A guided tour of every Aula room, whiteboard, and recording feature. Use this course as a sandbox to invite a co-host, draw a stroke, and post a chat message — every action persists to your account.',
    assignments: [
      {
        title: 'Try the live whiteboard',
        description:
          'Open the Aula room from your dashboard, draw three strokes on the whiteboard, then reload the page. The strokes should still be there — that is the read-after-write proof we ship.',
        type: 'lab',
        points: 25,
        dueOffsetDays: 3,
      },
      {
        title: 'Post a chat message in your live room',
        description:
          'Open the room, send any message in class chat, then refresh. The message should still be in the transcript — chat messages persist to chat_messages, not just to the realtime fan-out.',
        type: 'homework',
        points: 10,
        dueOffsetDays: 1,
      },
    ],
  },
  {
    code: 'PROD 210',
    title: 'Hosting effective live sessions',
    term: 'Spring 2026',
    description:
      'Best practices for instructors hosting live classes — pacing, breakout rooms, recording etiquette, and turning recordings into published assets.',
    assignments: [
      {
        title: 'Reflection: what makes a class memorable?',
        description:
          'Submit a short paragraph (200–400 words) on a class you remember years later — what did the instructor do that stuck?',
        type: 'homework',
        points: 50,
        dueOffsetDays: 7,
      },
    ],
  },
]

/**
 * Idempotent per-user seed. If the user has zero courses AND zero
 * non-ended rooms, drop a starter course catalogue + a live Aula room
 * + a couple notifications so the dashboard shows real content the
 * first time. Returns true on the run that did the seeding.
 */
export async function ensureUserSeed(userId: string): Promise<boolean> {
  const courseCount = await count('courses', [
    { field: 'instructor_id', operator: '=', value: userId },
  ])
  const enrollmentCount = await count('course_enrollments', [
    { field: 'student_id', operator: '=', value: userId },
  ])
  const roomCount = await count('rooms', [{ field: 'host_id', operator: '=', value: userId }])
  if (courseCount > 0 || enrollmentCount > 0 || roomCount > 0) return false

  const now = Date.now()
  const seededCourses: CourseRow[] = []
  for (const preset of COURSE_PRESETS) {
    const courseRes = await create<CourseRow>('courses', {
      instructor_id: userId,
      code: preset.code,
      title: preset.title,
      term: preset.term,
      description: preset.description,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (courseRes.data) {
      seededCourses.push(courseRes.data)
      // Self-enroll so dashboard "Your courses" lists this even when
      // viewed from the student lens.
      await create<CourseEnrollmentRow>('course_enrollments', {
        course_id: courseRes.data.id,
        student_id: userId,
        role: 'student',
        enrolled_at: new Date(),
      })
      for (const a of preset.assignments) {
        await create<AssignmentRow>('assignments', {
          course_id: courseRes.data.id,
          title: a.title,
          description: a.description,
          due_date: new Date(now + a.dueOffsetDays * 24 * 60 * 60 * 1000),
          points: a.points,
          type: a.type,
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
    }
  }

  // Stand up a live room for the first course so "Join classroom" works
  // straight off the dashboard.
  const firstCourse = seededCourses[0] ?? null
  await create<RoomRow>('rooms', {
    course_id: firstCourse?.id ?? null,
    host_id: userId,
    name: firstCourse ? `${firstCourse.code} · Welcome session` : 'My first Aula room',
    join_code: generateJoinCode(),
    status: 'waiting',
    participant_count: 0,
    scheduled_at: new Date(now + 60 * 60 * 1000),
    started_at: null,
    ended_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  })

  await create<NotificationRow>('notifications', {
    user_id: userId,
    type: 'system.welcome',
    title: 'Welcome to Aula',
    body: 'We seeded a starter course and a live room so you can poke at every primary feature without setup.',
    link: '/dashboard',
    read_at: null,
    created_at: new Date(),
  })
  await create<NotificationRow>('notifications', {
    user_id: userId,
    type: 'assignment.created',
    title: 'New assignment: Try the live whiteboard',
    body: 'Sample lab assignment in AULA 101 — open it, draw three strokes, reload, and submit your reflection.',
    link: '/assignments',
    read_at: null,
    created_at: new Date(),
  })

  return true
}

export default router

/**
 * Used by the auth-shell so we don't expose handler internals to the test
 * harness. Public re-export so e2e specs can call it without poking at
 * the in-process database directly.
 */
export const _ensureUserSeed = ensureUserSeed
// Reference findOne to keep the import alive for future use cases (per-user
// preference reads) without breaking lint when the helper is added.
void findOne
