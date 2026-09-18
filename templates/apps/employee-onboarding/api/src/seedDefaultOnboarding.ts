/**
 * Seed a fresh user's first 90-day onboarding journey.
 *
 * Idempotent: only writes if the user has zero onboardings. Called from
 * the `/api/onboardings` GET handler so a brand-new account gets a real,
 * persistent onboarding (with checklist tasks, milestones, training,
 * documents, team intros, and notifications) the first time the dashboard
 * loads — instead of falling back to hand-rolled placeholder data on the
 * frontend.
 *
 * @module
 */

import { count, create, findOne } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

/**
 * Per-user seeding mutex. The dashboard fires four parallel requests on
 * first load (/me, /tasks, /timeline-milestones, /team-members), each of
 * which calls `seedDefaultOnboardingIfMissing()`. Without serialisation,
 * all four pass the "no rows yet" check before any of them inserts and
 * end up writing four onboardings × 8 team members × 10 tasks etc per
 * user. We coalesce the concurrent calls behind a single in-flight
 * promise per userId so the seed runs exactly once.
 */
const inflightSeed = new Map<string, Promise<Record<string, unknown> | null>>()

interface SeededUser {
  name?: string | null
  email?: string | null
  createdAt?: string | Date
}

interface SeedTaskSpec {
  title: string
  description: string
  category: 'paperwork' | 'training' | 'intro' | 'it' | 'general' | 'other'
  status: 'pending' | 'in_progress' | 'complete' | 'overdue'
  /** Days from start_date until this task is due. */
  dueDayOffset: number
  /** Position in the ordered list. */
  position: number
}

const SEED_TASKS: SeedTaskSpec[] = [
  {
    title: 'Sign your offer letter',
    description: 'Counter-sign the offer letter and upload it to your employee record.',
    category: 'paperwork',
    status: 'complete',
    dueDayOffset: -7,
    position: 0,
  },
  {
    title: 'Set up your laptop & SSO',
    description:
      'Install the security profile, enable MFA, and join the company SSO so you can access every team app on day one.',
    category: 'it',
    status: 'in_progress',
    dueDayOffset: 0,
    position: 1,
  },
  {
    title: 'Coffee chat with your buddy',
    description: 'Tue 10:00 AM — meet Devon Reeves, your assigned onboarding buddy.',
    category: 'intro',
    status: 'pending',
    dueDayOffset: 1,
    position: 2,
  },
  {
    title: 'Complete handbook acknowledgement',
    description: 'Read the employee handbook and sign the acknowledgement form.',
    category: 'paperwork',
    status: 'pending',
    dueDayOffset: 7,
    position: 3,
  },
  {
    title: 'Day-30 check-in with manager',
    description: 'Reflect on your first month and set goals for the next 60 days.',
    category: 'intro',
    status: 'pending',
    dueDayOffset: 30,
    position: 4,
  },
  {
    title: 'Security & compliance training',
    description: 'Complete the mandatory security and privacy training modules.',
    category: 'training',
    status: 'pending',
    dueDayOffset: -3,
    position: 5,
  },
  {
    title: 'Headshot for team directory',
    description: 'Schedule 15 minutes with the office photographer or upload your own.',
    category: 'general',
    status: 'pending',
    dueDayOffset: 14,
    position: 6,
  },
  {
    title: 'Direct deposit form',
    description: 'Submit your bank info so payroll can run on the next cycle.',
    category: 'paperwork',
    status: 'pending',
    dueDayOffset: 5,
    position: 7,
  },
  {
    title: 'Meet your engineering manager',
    description:
      'Priya Patel will reach out for a kickoff 1:1 — block 30 minutes on your calendar.',
    category: 'intro',
    status: 'pending',
    dueDayOffset: 3,
    position: 8,
  },
  {
    title: 'Tour the design system',
    description: 'Walk through the tokens, primitives, and review etiquette before your first PR.',
    category: 'training',
    status: 'pending',
    dueDayOffset: 14,
    position: 9,
  },
]

interface SeedMilestoneSpec {
  label: string
  /** Days from start_date until this milestone is due. */
  dayOffset: number
}

const SEED_MILESTONES: SeedMilestoneSpec[] = [
  { label: 'Week 1 — Welcome & accounts', dayOffset: 7 },
  { label: 'Day 30 — Settled in', dayOffset: 30 },
  { label: 'Day 60 — Find your rhythm', dayOffset: 60 },
  { label: 'Day 90 — Take ownership', dayOffset: 90 },
]

interface SeedTeamMemberSpec {
  name: string
  role: string
  department: string
  email: string
  slack_handle: string
  bio: string
}

const SEED_TEAM_MEMBERS: SeedTeamMemberSpec[] = [
  {
    name: 'Devon Reeves',
    role: 'Senior Engineer · Onboarding Buddy',
    department: 'Engineering',
    email: 'devon@example.com',
    slack_handle: '@devon',
    bio: 'Backend services + reliability. Joined to make sure your first 90 days have at least three good coffee chats.',
  },
  {
    name: 'Priya Patel',
    role: 'Engineering Manager',
    department: 'Engineering',
    email: 'priya@example.com',
    slack_handle: '@priya',
    bio: 'Leads the platform team. Your direct manager — schedule a 1:1 in your first week.',
  },
  {
    name: 'Jamal Carter',
    role: 'Product Designer',
    department: 'Design',
    email: 'jamal@example.com',
    slack_handle: '@jamal',
    bio: 'Design systems + product flows. A peer in your cohort — pair with him on your first design review.',
  },
  {
    name: 'Aria Nakamura',
    role: 'Product Manager',
    department: 'Product',
    email: 'aria@example.com',
    slack_handle: '@aria',
    bio: 'Roadmap, customer interviews, launches. Owns the area you’ll be shipping into first.',
  },
  {
    name: 'Eli Whitfield',
    role: 'Account Executive',
    department: 'Sales',
    email: 'eli@example.com',
    slack_handle: '@eli',
    bio: 'Talks to enterprise customers daily — a great resource for understanding why we build what we build.',
  },
  {
    name: 'Sasha Romero',
    role: 'People Partner · HR',
    department: 'HR',
    email: 'sasha@example.com',
    slack_handle: '@sasha',
    bio: 'Your point of contact for benefits, payroll, and any "I don’t know who to ask" question.',
  },
  {
    name: 'Kenji Vargas',
    role: 'Marketing Lead',
    department: 'Marketing',
    email: 'kenji@example.com',
    slack_handle: '@kenji',
    bio: 'Storytelling and customer narratives. Hosts the monthly all-hands customer spotlight.',
  },
  {
    name: 'Naomi Field',
    role: 'Senior Engineer',
    department: 'Engineering',
    email: 'naomi@example.com',
    slack_handle: '@naomi',
    bio: 'Frontend architecture and accessibility. A peer in your cohort — pair with her on your first PR.',
  },
]

interface SeedTrainingModuleSpec {
  title: string
  description: string
  content: string
  duration_minutes: number
  quiz: Array<{ question: string; options: string[]; answer: number }>
}

const SEED_TRAINING_MODULES: SeedTrainingModuleSpec[] = [
  {
    title: 'Security & Compliance',
    description:
      'How we handle data, secrets, incidents, and the small day-to-day habits that keep customers safe.',
    content:
      'Module covers: data classification, secrets handling, incident response, and the on-call escalation matrix. Required for everyone — pass with 80% to mark complete.',
    duration_minutes: 45,
    quiz: [
      {
        question: 'Where should you NEVER paste a customer access token?',
        options: [
          '1Password vault',
          '#general Slack channel',
          'Local password manager',
          'Encrypted .env file',
        ],
        answer: 1,
      },
      {
        question: 'When you discover a possible incident, what is the first action?',
        options: [
          'Fix it quietly',
          'Tell your manager next week',
          'Page the on-call via /pager',
          'Email the CEO',
        ],
        answer: 2,
      },
      {
        question: 'PII (personally identifiable information) belongs in which classification?',
        options: ['Public', 'Internal', 'Confidential', 'Restricted'],
        answer: 3,
      },
      {
        question: 'Which password manager does the company sanction?',
        options: ['Browser autofill', '1Password', 'Sticky notes', 'Whatever you prefer'],
        answer: 1,
      },
      {
        question: 'When MFA fails on a critical login, you should…',
        options: [
          'Reuse a backup code',
          'Disable MFA temporarily',
          'Page IT via #help-it',
          'Skip and try later',
        ],
        answer: 2,
      },
    ],
  },
  {
    title: 'Engineering Tour',
    description: 'Repos, deploys, on-call, and how we ship safely.',
    content:
      'A guided tour of the codebase, the deploy pipeline, our on-call rotation, and the escalation rituals.',
    duration_minutes: 60,
    quiz: [
      {
        question: 'Which branch is auto-deployed to production?',
        options: ['feature/*', 'main', 'staging', 'production'],
        answer: 1,
      },
      {
        question: 'On-call rotations last…',
        options: ['1 day', '1 week', '1 month', '1 quarter'],
        answer: 1,
      },
      {
        question: 'A failing canary should…',
        options: ['Auto-rollback', 'Auto-promote', 'Page the author', 'Send a Slack reaction'],
        answer: 0,
      },
    ],
  },
  {
    title: 'Design System Basics',
    description: 'Tokens, primitives, and review etiquette.',
    content:
      'A walk-through of the design tokens, base primitives, accessibility checks, and how design review actually works in practice.',
    duration_minutes: 30,
    quiz: [
      {
        question: 'Where do typography tokens live?',
        options: ['app/styles', '@design-system/tokens', 'Inline styles', 'Each component'],
        answer: 1,
      },
      {
        question: 'Color contrast minimum for body text?',
        options: ['2:1', '3:1', '4.5:1', '7:1'],
        answer: 2,
      },
    ],
  },
  {
    title: 'Customer Storytelling',
    description: 'How sales talks about us — and why.',
    content: 'Three customer narratives, the deal cycle, the buyer personas we sell to.',
    duration_minutes: 50,
    quiz: [],
  },
  {
    title: 'Feedback & Growth',
    description: 'Giving and receiving real, kind feedback.',
    content:
      'The SBI (Situation-Behavior-Impact) framework, our 1:1 templates, and the calibration cycle.',
    duration_minutes: 25,
    quiz: [],
  },
]

interface SeedDocumentSpec {
  name: string
  category: 'paperwork' | 'reading' | 'reference'
  kind: 'sign' | 'read'
  requires_signature: boolean
  signed: boolean
}

const SEED_DOCUMENTS: SeedDocumentSpec[] = [
  {
    name: 'Offer Letter (Signed).pdf',
    category: 'paperwork',
    kind: 'sign',
    requires_signature: true,
    signed: true,
  },
  {
    name: 'Employee Handbook 2026.pdf',
    category: 'reading',
    kind: 'sign',
    requires_signature: true,
    signed: false,
  },
  {
    name: 'Direct Deposit Form.pdf',
    category: 'paperwork',
    kind: 'sign',
    requires_signature: true,
    signed: false,
  },
  {
    name: 'Benefits Overview.pdf',
    category: 'reading',
    kind: 'read',
    requires_signature: false,
    signed: false,
  },
  {
    name: 'Office Map & Wifi Guide.pdf',
    category: 'reference',
    kind: 'read',
    requires_signature: false,
    signed: false,
  },
  {
    name: 'IT Security Policy.docx',
    category: 'reading',
    kind: 'sign',
    requires_signature: true,
    signed: false,
  },
]

interface SeedNotificationSpec {
  kind: 'task' | 'milestone' | 'document' | 'training' | 'intro'
  title: string
  message: string
  /** Hours-ago for created_at. */
  ageHours: number
  unread: boolean
}

const SEED_NOTIFICATIONS: SeedNotificationSpec[] = [
  {
    kind: 'task',
    title: 'Devon Reeves',
    message: 'reviewed your handbook acknowledgement.',
    ageHours: 0.1,
    unread: true,
  },
  {
    kind: 'milestone',
    title: 'Day 30 milestone',
    message: 'unlocks soon. New training modules will become available.',
    ageHours: 1,
    unread: true,
  },
  {
    kind: 'document',
    title: 'Direct Deposit Form',
    message: 'requires your signature before Friday.',
    ageHours: 6,
    unread: true,
  },
  {
    kind: 'training',
    title: 'Security & Compliance',
    message: 'training assigned by Priya Patel — due in 5 days.',
    ageHours: 28,
    unread: false,
  },
  {
    kind: 'intro',
    title: 'Coffee chat scheduled',
    message: 'with Jamal Carter on Wednesday at 11:00 AM.',
    ageHours: 30,
    unread: false,
  },
]

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * If the user has no onboardings, create one along with starter tasks,
 * milestones, team members, training modules, documents, and notifications.
 *
 * @param userId - Authenticated user id from the session.
 * @returns The user's primary onboarding row, freshly created or existing.
 */
export async function seedDefaultOnboardingIfMissing(
  userId: string,
): Promise<Record<string, unknown> | null> {
  const inflight = inflightSeed.get(userId)
  if (inflight) return inflight
  const promise = seedInner(userId).finally(() => {
    inflightSeed.delete(userId)
  })
  inflightSeed.set(userId, promise)
  return promise
}

async function seedInner(userId: string): Promise<Record<string, unknown> | null> {
  const existingCount = await count('onboardings', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existingCount > 0) {
    return findOne<Record<string, unknown>>('onboardings', [
      { field: 'user_id', operator: '=', value: userId },
    ])
  }

  // Pull user info to personalise where helpful.
  const user = await findOne<SeededUser>('users', [{ field: 'id', operator: '=', value: userId }])

  const now = new Date()
  // Anchor "start of onboarding" 14 days ago so a fresh signup lands on
  // "Day 14 of 90" — matching the dashboard hero copy ("Day 14 of 90").
  const startDate = new Date(now.getTime() - 14 * DAY_MS)

  const onboardingResult = await create('onboardings', {
    user_id: userId,
    employee_id: userId,
    template_id: null,
    manager_id: null,
    buddy_id: null,
    start_date: startDate,
    status: 'active',
    completion_pct: 0,
    started_at: startDate,
    created_at: now,
  })
  const onboarding = onboardingResult.data as Record<string, unknown> | null
  if (!onboarding?.id) {
    logger.error(`seedDefaultOnboarding: failed to create onboarding for user ${userId}`)
    return null
  }
  const onboardingId = String(onboarding.id)

  // Tasks
  for (const spec of SEED_TASKS) {
    const dueDate = new Date(startDate.getTime() + spec.dueDayOffset * DAY_MS)
    const completedAt = spec.status === 'complete' ? new Date(dueDate.getTime() - DAY_MS) : null
    await create('onboarding_tasks', {
      user_id: userId,
      onboarding_id: onboardingId,
      title: spec.title,
      description: spec.description,
      category: spec.category,
      assignee_id: null,
      due_date: dueDate,
      position: spec.position,
      status: spec.status,
      completed_at: completedAt,
      completed_by: completedAt ? userId : null,
      created_at: now,
    })
  }

  // Milestones
  for (const ms of SEED_MILESTONES) {
    const targetAt = new Date(startDate.getTime() + ms.dayOffset * DAY_MS)
    const achievedAt = targetAt < now ? targetAt : null
    await create('timeline_milestones', {
      user_id: userId,
      onboarding_id: onboardingId,
      label: ms.label,
      target_at: targetAt,
      achieved_at: achievedAt,
      created_at: now,
    })
  }

  // Team members
  for (const m of SEED_TEAM_MEMBERS) {
    await create('team_members', {
      user_id: userId,
      person_user_id: null,
      name: m.name,
      role: m.role,
      department: m.department,
      manager_user_id: null,
      bio: m.bio,
      slack_handle: m.slack_handle,
      photo_url: null,
      email: m.email,
      start_date: new Date(now.getTime() - 365 * DAY_MS),
      created_at: now,
    })
  }

  // Training modules
  for (const tm of SEED_TRAINING_MODULES) {
    await create('training_modules', {
      user_id: userId,
      title: tm.title,
      description: tm.description,
      content: tm.content,
      video_url: null,
      duration_minutes: tm.duration_minutes,
      quiz: tm.quiz.length > 0 ? JSON.stringify(tm.quiz) : null,
      created_at: now,
    })
  }

  // Documents
  for (const d of SEED_DOCUMENTS) {
    const signedAt = d.signed ? new Date(now.getTime() - 7 * DAY_MS) : null
    await create('onboarding_documents', {
      user_id: userId,
      onboarding_id: onboardingId,
      name: d.name,
      file_url: null,
      s3_key: null,
      content_type: d.name.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf',
      category: d.category,
      kind: d.kind,
      requires_signature: d.requires_signature,
      signed: d.signed,
      signed_at: signedAt,
      signed_by: d.signed ? userId : null,
      acknowledged_at: null,
      uploaded_by: userId,
      uploaded_at: new Date(now.getTime() - 14 * DAY_MS),
      created_at: now,
    })
  }

  // Notifications
  for (const n of SEED_NOTIFICATIONS) {
    const createdAt = new Date(now.getTime() - n.ageHours * 60 * 60 * 1000)
    await create('notifications', {
      user_id: userId,
      kind: n.kind,
      title: n.title,
      message: n.message,
      payload: null,
      read_at: n.unread ? null : new Date(createdAt.getTime() + 60 * 60 * 1000),
      created_at: createdAt,
    })
  }

  // Suppress unused-var warning for personalisation hook (left for future use).
  void user

  return onboarding
}
