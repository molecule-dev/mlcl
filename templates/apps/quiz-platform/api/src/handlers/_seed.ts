/**
 * Demo seed for quiz-platform.
 *
 * Two layers:
 *
 * 1. **Globals** (`seedGlobalCatalogIfEmpty`) — a small library of
 *    published quizzes + questions + a top-of-leaderboard demo player so
 *    /discover, /leaderboard, /quiz/:id render with content on a
 *    fresh DB. Idempotent: skipped if any quiz already exists.
 *
 * 2. **Per-user** (`seedDemoForUser`) — starter notifications so a
 *    freshly signed-up user lands on /notifications with content.
 *    Idempotent on user_id.
 *
 * @module
 */

import { count, create, query } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

interface QuizSeed {
  title: string
  description: string
  category: string
  questions: Array<{
    prompt: string
    type?: 'multiple-choice' | 'true-false' | 'type-answer'
    choices: string[]
    correct_answer: string
    points?: number
    time_limit_s?: number
    explanation?: string
  }>
}

const PUBLIC_QUIZZES: QuizSeed[] = [
  {
    title: 'World Capitals: Sprint Edition',
    description: 'A medium-pace tour through capital cities — perfect for a 5-minute warm-up.',
    category: 'geography',
    questions: [
      {
        prompt: 'What is the capital of Australia?',
        choices: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
        correct_answer: 'Canberra',
        explanation: 'Canberra was purpose-built as the capital in 1908.',
      },
      {
        prompt: 'What is the capital of Iceland?',
        choices: ['Oslo', 'Reykjavík', 'Helsinki', 'Stockholm'],
        correct_answer: 'Reykjavík',
      },
      {
        prompt: 'What is the capital of South Korea?',
        choices: ['Tokyo', 'Beijing', 'Seoul', 'Pyongyang'],
        correct_answer: 'Seoul',
      },
      {
        prompt: 'What is the capital of Egypt?',
        choices: ['Cairo', 'Alexandria', 'Giza', 'Luxor'],
        correct_answer: 'Cairo',
      },
      {
        prompt: 'What is the capital of Canada?',
        choices: ['Toronto', 'Vancouver', 'Ottawa', 'Montreal'],
        correct_answer: 'Ottawa',
      },
    ],
  },
  {
    title: 'Cosmic Calamity: Black Holes & Beyond',
    description:
      'Event horizons, singularities, and the bending of space itself — astrophysics speed run.',
    category: 'science',
    questions: [
      {
        prompt: 'What is the boundary around a black hole called?',
        choices: ['Photosphere', 'Event horizon', 'Heliosphere', 'Magnetosphere'],
        correct_answer: 'Event horizon',
      },
      {
        prompt: 'Which star type usually collapses into a black hole?',
        choices: ['Yellow dwarf', 'Red giant', 'Massive blue giant', 'Brown dwarf'],
        correct_answer: 'Massive blue giant',
      },
      {
        prompt: 'Which planet has the most moons in our solar system?',
        choices: ['Mars', 'Jupiter', 'Saturn', 'Neptune'],
        correct_answer: 'Saturn',
      },
      {
        prompt: 'The black hole at the centre of the Milky Way is named?',
        choices: ['Sagittarius A*', 'Cygnus X-1', 'Cetus Y', 'Vela P'],
        correct_answer: 'Sagittarius A*',
      },
    ],
  },
  {
    title: 'Renaissance Art: Masterpieces',
    description: 'A short, friendly run through the painters that defined the Renaissance.',
    category: 'arts',
    questions: [
      {
        prompt: 'Who painted "The Starry Night"?',
        choices: ['Claude Monet', 'Vincent van Gogh', 'Pablo Picasso', 'Salvador Dalí'],
        correct_answer: 'Vincent van Gogh',
      },
      {
        prompt: 'Who painted the Sistine Chapel ceiling?',
        choices: ['Raphael', 'Michelangelo', 'Donatello', 'Botticelli'],
        correct_answer: 'Michelangelo',
      },
      {
        prompt: 'The Mona Lisa is held in which museum today?',
        choices: ['Uffizi', 'Prado', 'Louvre', 'Met'],
        correct_answer: 'Louvre',
      },
    ],
  },
]

/**
 * Idempotent: if any quiz already exists in the DB, this is a no-op so
 * we don't double-seed across server restarts. Returns counts so callers
 * can log them.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  quizzesCreated: number
  questionsCreated: number
  demoUserId: string | null
}> {
  const existing = await count('quizzes', [])
  if (existing > 0) {
    return { quizzesCreated: 0, questionsCreated: 0, demoUserId: null }
  }

  // Demo user: never gets a JWT, just owns the public seed quizzes so
  // they show up in /discover (which filters status='published').
  const demoUserResult = await query<{ id: string }>(
    `INSERT INTO public.users (id, "createdAt", "updatedAt", name, email, username, "planKey")
     VALUES (gen_random_uuid(), now(), now(), 'Sparq Demo', 'demo@sparq.example', 'sparq.demo', 'free')
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [],
  )
  const demoUserId = demoUserResult.rows[0]?.id ?? null
  if (!demoUserId) {
    logger.warn('seedGlobalCatalogIfEmpty: failed to create demo user')
    return { quizzesCreated: 0, questionsCreated: 0, demoUserId: null }
  }

  let quizzesCreated = 0
  let questionsCreated = 0
  const firstQuizIdRef: { value: string | null } = { value: null }
  for (const seed of PUBLIC_QUIZZES) {
    const quizResult = await create<Record<string, unknown>>('quizzes', {
      creator_id: demoUserId,
      title: seed.title,
      description: seed.description,
      category: seed.category,
      status: 'published',
      time_per_question_s: 20,
      scoring_mode: 'speed',
      play_count: Math.floor(500 + Math.random() * 5000),
      published_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    })
    const quiz = quizResult.data as Record<string, unknown> | null
    if (!quiz) continue
    quizzesCreated++
    if (!firstQuizIdRef.value) firstQuizIdRef.value = String(quiz.id)
    for (let i = 0; i < seed.questions.length; i++) {
      const q = seed.questions[i]
      await create('questions', {
        quiz_id: quiz.id,
        position: i,
        type: q.type ?? 'multiple-choice',
        prompt: q.prompt,
        // pg driver requires JSONB columns receive a stringified JSON value
        choices: JSON.stringify(q.choices),
        correct_answer: q.correct_answer,
        points: q.points ?? 1000,
        time_limit_s: q.time_limit_s ?? 20,
        explanation: q.explanation ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      questionsCreated++
    }
  }

  // Seed a finished demo session + ≥4 ranked participants so /leaderboard
  // renders both the podium (≥1 entry) and the "Full ranking" section
  // (≥4 entries) on a fresh DB. Aggregated by /api/leaderboard/global.
  if (firstQuizIdRef.value) {
    const PODIUM_PLAYERS: Array<{
      email: string
      username: string
      name: string
      nickname: string
      score: number
    }> = [
      {
        email: 'ada@sparq.example',
        username: 'sparq.ada',
        name: 'Ada Lovelace',
        nickname: 'Ada',
        score: 9800,
      },
      {
        email: 'grace@sparq.example',
        username: 'sparq.grace',
        name: 'Grace Hopper',
        nickname: 'Grace',
        score: 8400,
      },
      {
        email: 'alan@sparq.example',
        username: 'sparq.alan',
        name: 'Alan Turing',
        nickname: 'Alan',
        score: 7600,
      },
      {
        email: 'kat@sparq.example',
        username: 'sparq.kat',
        name: 'Katherine Johnson',
        nickname: 'Kat',
        score: 6500,
      },
      {
        email: 'lin@sparq.example',
        username: 'sparq.lin',
        name: 'Lin Manuel',
        nickname: 'Lin',
        score: 5200,
      },
    ]
    const sessionResult = await query<{ id: string }>(
      `INSERT INTO public.quiz_sessions (id, quiz_id, host_id, join_code, status, current_question, started_at, finished_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'finished', 0, now() - interval '2 hours', now() - interval '1 hour', now(), now())
       RETURNING id`,
      [firstQuizIdRef.value, demoUserId, 'SPARQ1'],
    )
    const sessionId = sessionResult.rows[0]?.id ?? null
    if (sessionId) {
      for (const player of PODIUM_PLAYERS) {
        const playerResult = await query<{ id: string }>(
          `INSERT INTO public.users (id, "createdAt", "updatedAt", name, email, username, "planKey")
           VALUES (gen_random_uuid(), now(), now(), $1, $2, $3, 'free')
           ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [player.name, player.email, player.username],
        )
        const playerId = playerResult.rows[0]?.id
        if (!playerId) continue
        await create('session_participants', {
          session_id: sessionId,
          user_id: playerId,
          nickname: player.nickname,
          score: player.score,
          joined_at: new Date(),
          created_at: new Date(),
        })
      }
    }
  }

  return { quizzesCreated, questionsCreated, demoUserId }
}

/**
 * Seed a freshly signed-up user with a few notifications so the
 * Notifications page actually has content. Idempotent: returns early
 * if the user already has any notification rows.
 */
export async function seedDemoForUser(userId: string): Promise<{ notificationsCreated: number }> {
  if (!userId) return { notificationsCreated: 0 }
  const existing = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing > 0) return { notificationsCreated: 0 }

  const notifications = [
    {
      type: 'achievement',
      title: 'Welcome to Sparq!',
      body: 'Build your first quiz, host a live game, or jump into Discover to play one.',
      href: '/my-quizzes',
      created_at: new Date(),
    },
    {
      type: 'tip',
      title: 'Tip: streak multipliers',
      body: 'Three correct answers in a row trigger a +20% streak boost on every following answer.',
      href: '/discover',
      created_at: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
      type: 'leaderboard',
      title: 'New on the leaderboard',
      body: 'A fresh week is starting — be the first to climb the rankings.',
      href: '/leaderboard',
      created_at: new Date(Date.now() - 20 * 60 * 1000),
    },
  ]

  let notificationsCreated = 0
  for (const n of notifications) {
    await create('notifications', {
      user_id: userId,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      read: false,
      created_at: n.created_at,
    })
    notificationsCreated++
  }
  return { notificationsCreated }
}

/**
 * Best-effort wrapper used by the public quizzes handler so the catalog
 * seeds on first read after a fresh DB without coupling the seed to the
 * server-boot path. Errors are swallowed so a failed seed doesn't break
 * the read.
 */
export async function ensureSeed(): Promise<void> {
  try {
    await seedGlobalCatalogIfEmpty()
  } catch (err) {
    logger.warn(err)
  }
}

/** Convenience for /api/users (signup) — runs after JWT issuance. */
export async function seedDemoOnSignup(userId: string): Promise<void> {
  try {
    await seedDemoForUser(userId)
  } catch (err) {
    logger.warn(err)
  }
}
