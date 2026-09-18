/**
 * Student-portal — per-user demo seed.
 *
 * Idempotent. Runs lazily on the first GET to any list endpoint
 * (`/announcements`, `/assignments`, `/attendance`, `/grades`,
 * `/messages`, `/schedule`) so a freshly-signed-up user lands on a
 * dashboard populated with realistic course / grade / assignment /
 * attendance / schedule / message / announcement rows instead of
 * empty tables.
 *
 * Concurrency-safe: a per-user in-flight Promise coalesces the ~5
 * parallel GETs the dashboard fires on first load so we don't
 * insert duplicate rows.
 *
 * @module
 */

import { count, create } from '@molecule/api-database'

const seedLocks = new Map<string, Promise<void>>()
const seeded = new Set<string>()

export async function ensureStudentPortalSeeded(userId: string): Promise<void> {
  if (seeded.has(userId)) return
  const inflight = seedLocks.get(userId)
  if (inflight) return inflight
  const promise = (async () => {
    await runSeed(userId)
  })().finally(() => {
    seedLocks.delete(userId)
  })
  seedLocks.set(userId, promise)
  return promise
}

const DAY_MS = 86400000

interface CourseSeed {
  id: string
  name: string
  subject: string
  teacher: string
  teacherEmail: string
  room: string
  period: number
}

const COURSES: readonly CourseSeed[] = [
  {
    id: 'algebra-2',
    name: 'Algebra II',
    subject: 'math',
    teacher: 'Ms. Tran',
    teacherEmail: 'tran@bayside.edu',
    room: 'Room 204',
    period: 1,
  },
  {
    id: 'ap-bio',
    name: 'AP Biology',
    subject: 'science',
    teacher: 'Mr. Okafor',
    teacherEmail: 'okafor@bayside.edu',
    room: 'Lab 3',
    period: 2,
  },
  {
    id: 'english-lit',
    name: 'English Lit',
    subject: 'english',
    teacher: 'Dr. Park',
    teacherEmail: 'park@bayside.edu',
    room: 'Room 112',
    period: 3,
  },
  {
    id: 'world-history',
    name: 'World History',
    subject: 'history',
    teacher: 'Ms. Reyes',
    teacherEmail: 'reyes@bayside.edu',
    room: 'Room 305',
    period: 4,
  },
  {
    id: 'studio-art',
    name: 'Studio Art',
    subject: 'art',
    teacher: 'Mx. Bell',
    teacherEmail: 'bell@bayside.edu',
    room: 'Studio A',
    period: 5,
  },
  {
    id: 'spanish-3',
    name: 'Spanish III',
    subject: 'language',
    teacher: 'Sra. Diaz',
    teacherEmail: 'diaz@bayside.edu',
    room: 'Room 118',
    period: 6,
  },
  {
    id: 'pe-health',
    name: 'PE / Health',
    subject: 'pe',
    teacher: 'Coach Hill',
    teacherEmail: 'hill@bayside.edu',
    room: 'Gym',
    period: 7,
  },
] as const

async function runSeed(userId: string): Promise<void> {
  // The cheapest existence check — if any assignment exists for this user, skip.
  const existing = await count('assignments', [{ field: 'user_id', operator: '=', value: userId }])
  if (Number(existing) > 0) {
    seeded.add(userId)
    return
  }

  const now = Date.now()
  const today = new Date(now)
  today.setUTCHours(0, 0, 0, 0)
  const todayMs = today.getTime()

  await seedAssignments(userId, todayMs)
  await seedGrades(userId, todayMs)
  await seedSchedule(userId)
  await seedAttendance(userId, todayMs)
  await seedAnnouncements(userId, todayMs)
  await seedMessages(userId, todayMs)

  seeded.add(userId)
}

async function seedAssignments(userId: string, todayMs: number): Promise<void> {
  const assignments: Array<{
    course: CourseSeed
    title: string
    description: string
    daysOffset: number
    points: number
    status: 'upcoming' | 'submitted' | 'graded' | 'overdue'
  }> = [
    {
      course: COURSES[0],
      title: 'Quadratics — practice set 7',
      description: 'Complete problems 1–18 from §7.4. Show every step of your factoring.',
      daysOffset: 0,
      points: 25,
      status: 'upcoming',
    },
    {
      course: COURSES[1],
      title: 'Lab report 4 — Photosynthesis',
      description:
        'Submit your full lab report including hypothesis, methods, results, and conclusion.',
      daysOffset: 2,
      points: 50,
      status: 'submitted',
    },
    {
      course: COURSES[2],
      title: 'Essay outline — The Crucible',
      description: 'A one-page outline detailing your thesis and three supporting points.',
      daysOffset: 4,
      points: 20,
      status: 'graded',
    },
    {
      course: COURSES[3],
      title: 'Reading reflection — Industrial Era',
      description: 'A 500-word reflection on the assigned chapter from your textbook.',
      daysOffset: -3,
      points: 15,
      status: 'overdue',
    },
    {
      course: COURSES[4],
      title: 'Charcoal still-life sketch',
      description:
        'Submit a single charcoal still-life sketch focusing on shading and composition.',
      daysOffset: 3,
      points: 30,
      status: 'upcoming',
    },
    {
      course: COURSES[5],
      title: 'Vocabulary quiz — capítulo 7',
      description: 'Online vocabulary quiz covering chapter 7 terms.',
      daysOffset: 1,
      points: 10,
      status: 'submitted',
    },
    {
      course: COURSES[6],
      title: 'Cardio benchmark log',
      description: 'Submit your weekly cardio benchmark log entries.',
      daysOffset: 4,
      points: 10,
      status: 'graded',
    },
    {
      course: COURSES[5],
      title: 'Conjugation drills (irregular)',
      description: 'Complete the irregular verb conjugation packet.',
      daysOffset: 3,
      points: 15,
      status: 'upcoming',
    },
    {
      course: COURSES[3],
      title: 'Mid-unit reading: Mesopotamia',
      description: 'Read the assigned chapter and answer the comprehension questions.',
      daysOffset: 4,
      points: 15,
      status: 'submitted',
    },
  ]

  for (const a of assignments) {
    const dueDate = new Date(todayMs + a.daysOffset * DAY_MS)
    const submittedAt =
      a.status === 'submitted' || a.status === 'graded' ? new Date(todayMs - DAY_MS) : null
    await create('assignments', {
      course_id: null,
      course_name: a.course.name,
      user_id: userId,
      title: a.title,
      description: a.description,
      due_date: dueDate,
      points: a.points,
      status: a.status,
      submitted_at: submittedAt,
      created_at: new Date(todayMs - 7 * DAY_MS),
    })
  }
}

async function seedGrades(userId: string, todayMs: number): Promise<void> {
  const grades: Array<{ course: CourseSeed; score: number; weight: number; daysAgo: number }> = [
    { course: COURSES[0], score: 86, weight: 1, daysAgo: 5 },
    { course: COURSES[0], score: 92, weight: 0.5, daysAgo: 14 },
    { course: COURSES[1], score: 93, weight: 1, daysAgo: 4 },
    { course: COURSES[2], score: 95, weight: 1, daysAgo: 3 },
    { course: COURSES[3], score: 88, weight: 1, daysAgo: 7 },
    { course: COURSES[4], score: 97, weight: 1, daysAgo: 6 },
    { course: COURSES[5], score: 78, weight: 1, daysAgo: 8 },
    { course: COURSES[6], score: 99, weight: 1, daysAgo: 2 },
  ]
  for (const g of grades) {
    const letter = letterFor(g.score)
    await create('grades', {
      user_id: userId,
      course_id: null,
      course_name: g.course.name,
      subject: g.course.subject,
      term_id: null,
      score: g.score,
      letter_grade: letter,
      weight: g.weight,
      graded_at: new Date(todayMs - g.daysAgo * DAY_MS),
      created_at: new Date(todayMs - g.daysAgo * DAY_MS),
    })
  }
}

function letterFor(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

async function seedSchedule(userId: string): Promise<void> {
  // Repeat each course for every weekday Monday–Friday (1..5).
  const periodTimes: Record<number, { start: string; end: string }> = {
    1: { start: '08:15', end: '09:05' },
    2: { start: '09:15', end: '10:05' },
    3: { start: '10:15', end: '11:05' },
    4: { start: '11:15', end: '12:05' },
    5: { start: '13:00', end: '13:50' },
    6: { start: '14:00', end: '14:50' },
    7: { start: '15:00', end: '15:50' },
  }

  for (const c of COURSES) {
    const time = periodTimes[c.period]
    for (let weekday = 1; weekday <= 5; weekday++) {
      await create('schedule_entries', {
        user_id: userId,
        course_id: null,
        course_name: c.name,
        subject: c.subject,
        teacher: c.teacher,
        room: c.room,
        period_label: `Period ${c.period}`,
        weekday,
        day: weekday,
        start_time: time.start,
        end_time: time.end,
        date: null,
        created_at: new Date(),
      })
    }
  }
}

async function seedAttendance(userId: string, todayMs: number): Promise<void> {
  const ATTENDANCE: Array<{
    daysAgo: number
    status: 'present' | 'tardy' | 'absent' | 'excused'
    note?: string
    classes: number
  }> = [
    { daysAgo: 0, status: 'present', classes: 7 },
    { daysAgo: 1, status: 'present', classes: 7 },
    { daysAgo: 2, status: 'tardy', classes: 7, note: 'Period 1 — bus delay' },
    { daysAgo: 3, status: 'present', classes: 7 },
    { daysAgo: 4, status: 'absent', classes: 0, note: 'Sick — note on file' },
    { daysAgo: 5, status: 'present', classes: 7 },
    { daysAgo: 7, status: 'present', classes: 7 },
    { daysAgo: 8, status: 'present', classes: 7 },
    { daysAgo: 9, status: 'present', classes: 7 },
    { daysAgo: 10, status: 'present', classes: 7 },
  ]
  for (const a of ATTENDANCE) {
    const date = new Date(todayMs - a.daysAgo * DAY_MS)
    await create('attendance', {
      user_id: userId,
      course_id: null,
      date,
      weekday: date.getUTCDay(),
      status: a.status,
      classes: a.classes,
      note: a.note ?? null,
      recorded_at: date,
      created_at: date,
    })
  }
}

async function seedAnnouncements(userId: string, todayMs: number): Promise<void> {
  const ANNOUNCEMENTS = [
    {
      title: 'Spring assembly moved to Friday',
      body: 'Hold the period 7 schedule for an all-school assembly in the gym. Buses run on the late bell.',
      audience: 'school' as const,
      icon: 'campaign',
      pinned: true,
      daysAgo: 0,
    },
    {
      title: 'New grade posted in AP Biology',
      body: 'Lab report 3 — “Cellular respiration” has been graded. View the rubric for feedback.',
      audience: 'class' as const,
      icon: 'grade',
      pinned: false,
      daysAgo: 0,
    },
    {
      title: 'Algebra II quiz pushed to Thursday',
      body: 'Ms. Tran moved the chapter 7 quiz one day to give extra review time. Practice set posted.',
      audience: 'class' as const,
      icon: 'event_busy',
      pinned: false,
      daysAgo: 1,
    },
  ]
  for (const a of ANNOUNCEMENTS) {
    await create('announcements', {
      user_id: userId,
      school_id: null,
      audience: a.audience,
      icon: a.icon,
      title: a.title,
      body: a.body,
      pinned: a.pinned,
      created_at: new Date(todayMs - a.daysAgo * DAY_MS),
    })
  }
}

async function seedMessages(userId: string, todayMs: number): Promise<void> {
  // Demo inbound messages — the recipient is the new user, the sender
  // is a synthetic teacher / parent identity. UUIDs are stable v4-ish
  // strings so thread grouping is consistent across seed runs and
  // satisfies the `uuid NOT NULL` columns.
  const TEACHER_TRAN_ID = '11111111-1111-4111-8111-111111111111'
  const TEACHER_OKAFOR_ID = '22222222-2222-4222-8222-222222222222'
  const PARENT_CARTER_ID = '33333333-3333-4333-8333-333333333333'
  const OFFICE_ID = '44444444-4444-4444-8444-444444444444'
  const TEACHER_PARK_ID = '55555555-5555-4555-8555-555555555555'

  const TRAN_THREAD = '11111111-1111-4111-8111-aaaaaaaaaaaa'
  const OKAFOR_THREAD = '22222222-2222-4222-8222-aaaaaaaaaaaa'
  const PARENT_THREAD = '33333333-3333-4333-8333-aaaaaaaaaaaa'
  const OFFICE_THREAD = '44444444-4444-4444-8444-aaaaaaaaaaaa'
  const PARK_THREAD = '55555555-5555-4555-8555-aaaaaaaaaaaa'

  const MESSAGES = [
    {
      sender_id: TEACHER_TRAN_ID,
      sender_name: 'Ms. Tran',
      thread: TRAN_THREAD,
      content:
        'Quick check-in: I noticed you crushed problem 6 — would you walk me through your approach next class?',
      hoursAgo: 0,
    },
    {
      sender_id: TEACHER_OKAFOR_ID,
      sender_name: 'Mr. Okafor',
      thread: OKAFOR_THREAD,
      content:
        'Lab partners for Friday are posted on the board. Bring your notebook — we’re building the Krebs cycle poster.',
      hoursAgo: 1,
    },
    {
      sender_id: PARENT_CARTER_ID,
      sender_name: 'Maya Carter',
      thread: PARENT_THREAD,
      content:
        'Pickup will be 4:15 today — your dad is taking you to the eye doctor before practice.',
      hoursAgo: 2,
    },
    {
      sender_id: OFFICE_ID,
      sender_name: 'Office of the Principal',
      thread: OFFICE_THREAD,
      content:
        'Spring assembly moves to Friday at 1:30 PM. Period 7 will be shortened to 25 minutes.',
      hoursAgo: 24,
    },
    {
      sender_id: TEACHER_PARK_ID,
      sender_name: 'Dr. Park',
      thread: PARK_THREAD,
      content:
        'Great work on the outline. I left rubric notes — strengthen your topic sentences and you’re at an A.',
      hoursAgo: 48,
    },
  ]

  for (const m of MESSAGES) {
    await create('messages', {
      user_id: m.sender_id,
      recipient_id: userId,
      recipient_email: null,
      thread_id: m.thread,
      sender_name: m.sender_name,
      content: m.content,
      read_at: null,
      notify_email: false,
      created_at: new Date(todayMs - m.hoursAgo * 3600000),
    })
  }
}
