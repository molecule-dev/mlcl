/**
 * Catalog seeding for the language-learning flagship.
 *
 * Public read endpoints (`/api/courses`, `/api/lessons`, `/api/exercises/:id`)
 * are useless against an empty schema, and the frontend's pages were
 * previously falling back to hardcoded sample arrays. To make a fresh
 * scaffold actually demoable AND make per-user `complete-lesson` /
 * `submit-exercise` invariants assertable, we seed a small but realistic
 * set of language courses, units, lessons, and exercises at server
 * startup.
 *
 * Idempotent — keyed on stable string IDs (e.g. `course-spanish`,
 * `unit-spanish-1`, `lesson-spanish-1-1`, `exercise-spanish-1-1-1`),
 * so re-running on every boot does not duplicate rows.
 *
 * @module
 */

import { create, findById } from '@molecule/api-database'

type Lang = {
  id: string
  name: string
  code: string
  flag: string
  level: 'A1' | 'A2' | 'B1' | 'B2'
  tone: 'primary' | 'secondary' | 'tertiary' | 'info'
  icon: string
  description: string
}

type LessonSeed = {
  title: string
  durationMin: number
  exercises: Array<{
    type: 'fill_blank' | 'translation' | 'pronunciation'
    prompt: string
    choices: string[]
    correctAnswer: string
    explanation: string
    xp: number
  }>
}

const LANGUAGES: Lang[] = [
  {
    id: 'course-spanish',
    name: 'Spanish',
    code: 'es',
    flag: '🇪🇸',
    level: 'A2',
    tone: 'primary',
    icon: 'local_cafe',
    description: 'Café, travel & weekend Spanish for absolute beginners → A2.',
  },
  {
    id: 'course-french',
    name: 'French',
    code: 'fr',
    flag: '🇫🇷',
    level: 'B1',
    tone: 'secondary',
    icon: 'history_edu',
    description: 'Grammar-forward French for adults rebuilding intermediate skills.',
  },
  {
    id: 'course-japanese',
    name: 'Japanese',
    code: 'ja',
    flag: '🇯🇵',
    level: 'A1',
    tone: 'tertiary',
    icon: 'restaurant',
    description: 'Hiragana, katakana & the first 200 spoken kanji you will use.',
  },
  {
    id: 'course-german',
    name: 'German',
    code: 'de',
    flag: '🇩🇪',
    level: 'A2',
    tone: 'info',
    icon: 'directions',
    description: 'Conversational German with travel & service industry vocabulary.',
  },
]

const LESSONS_BY_COURSE: Record<string, LessonSeed[]> = {
  'course-spanish': [
    {
      title: 'Ordering coffee in a Madrid café',
      durationMin: 5,
      exercises: [
        {
          type: 'fill_blank',
          prompt: 'Yo ____ un café con leche, por favor.',
          choices: ['quiero', 'quieres', 'quiere', 'queremos'],
          correctAnswer: 'quiero',
          explanation: '"Quiero" is the first-person singular present of "querer".',
          xp: 10,
        },
        {
          type: 'fill_blank',
          prompt: 'La cuenta, ____ favor.',
          choices: ['de', 'por', 'a', 'en'],
          correctAnswer: 'por',
          explanation: 'The set phrase "por favor" means "please".',
          xp: 10,
        },
        {
          type: 'fill_blank',
          prompt: '¿____ está el baño?',
          choices: ['Quién', 'Cómo', 'Dónde', 'Cuándo'],
          correctAnswer: 'Dónde',
          explanation: '"Dónde" asks for a location.',
          xp: 10,
        },
        {
          type: 'translation',
          prompt: 'How much does it cost?',
          choices: ['¿Cuánto cuesta?', '¿Qué hora es?', '¿Dónde está?', '¿Cómo te llamas?'],
          correctAnswer: '¿Cuánto cuesta?',
          explanation: '"Cuesta" is the verb "to cost" in 3rd person singular.',
          xp: 12,
        },
      ],
    },
    {
      title: 'Asking for directions politely',
      durationMin: 6,
      exercises: [
        {
          type: 'fill_blank',
          prompt: '¿Puede ____ dónde está la estación?',
          choices: ['decirme', 'hablarme', 'darme', 'venir'],
          correctAnswer: 'decirme',
          explanation: '"Decirme" = "tell me" (decir + me).',
          xp: 12,
        },
        {
          type: 'fill_blank',
          prompt: 'Siga ____ tres calles.',
          choices: ['recta', 'derecho', 'derecha', 'directo'],
          correctAnswer: 'derecho',
          explanation: '"Recto/derecho" = straight ahead.',
          xp: 10,
        },
        {
          type: 'translation',
          prompt: 'Turn left at the corner.',
          choices: [
            'Gire a la izquierda en la esquina.',
            'Gire a la derecha en el corner.',
            'Vaya derecho por favor.',
            'Está cerca aquí.',
          ],
          correctAnswer: 'Gire a la izquierda en la esquina.',
          explanation: 'A la izquierda = to the left.',
          xp: 12,
        },
      ],
    },
    {
      title: 'Telling the time',
      durationMin: 4,
      exercises: [
        {
          type: 'fill_blank',
          prompt: 'Son las ____ y media.',
          choices: ['tres', 'tres-y', 'trece', 'media'],
          correctAnswer: 'tres',
          explanation: '"Son las tres y media" = "It\'s 3:30".',
          xp: 10,
        },
        {
          type: 'translation',
          prompt: "It is one o'clock.",
          choices: ['Es la una.', 'Son las una.', 'Es las uno.', 'Es a una.'],
          correctAnswer: 'Es la una.',
          explanation:
            '"Una" is feminine because "hora" is feminine; the "1 o\'clock" form is singular.',
          xp: 12,
        },
        {
          type: 'fill_blank',
          prompt: 'A las ocho ____ la mañana.',
          choices: ['en', 'de', 'a', 'por'],
          correctAnswer: 'de',
          explanation:
            '"De la mañana" specifies AM; "por la mañana" is "in the morning" generally.',
          xp: 10,
        },
      ],
    },
  ],
  'course-french': [
    {
      title: 'Past tense of irregular verbs',
      durationMin: 8,
      exercises: [
        {
          type: 'fill_blank',
          prompt: "J'ai ____ au cinéma hier soir.",
          choices: ['allé', 'aller', 'allais', 'irai'],
          correctAnswer: 'allé',
          explanation:
            'Passé composé of "aller" with avoir is incorrect — it actually uses "être" (je suis allé). Trick question: "allé" is the past participle.',
          xp: 12,
        },
        {
          type: 'fill_blank',
          prompt: "Nous ____ vu ce film l'année dernière.",
          choices: ['avons', 'sommes', 'aurons', 'étions'],
          correctAnswer: 'avons',
          explanation: '"Voir" uses avoir as auxiliary in passé composé.',
          xp: 12,
        },
        {
          type: 'translation',
          prompt: 'I drank coffee this morning.',
          choices: [
            "J'ai bu du café ce matin.",
            "J'ai boire café ce matin.",
            'Je bois du café ce matin.',
            "J'ai bu un café ce soir.",
          ],
          correctAnswer: "J'ai bu du café ce matin.",
          explanation: 'Past participle of "boire" is "bu".',
          xp: 14,
        },
      ],
    },
    {
      title: 'Polite restaurant phrases',
      durationMin: 5,
      exercises: [
        {
          type: 'fill_blank',
          prompt: "Je ____ une table pour deux, s'il vous plaît.",
          choices: ['voudrais', 'veux', 'veulent', 'voulais'],
          correctAnswer: 'voudrais',
          explanation: 'Conditional "voudrais" is more polite than "veux".',
          xp: 12,
        },
        {
          type: 'translation',
          prompt: 'The bill, please.',
          choices: [
            "L'addition, s'il vous plaît.",
            "La compte, s'il vous plaît.",
            'Le bill, please.',
            "Le menu, s'il vous plaît.",
          ],
          correctAnswer: "L'addition, s'il vous plaît.",
          explanation: '"Addition" is the French word for restaurant bill.',
          xp: 10,
        },
      ],
    },
    {
      title: 'Numbers, dates & weekdays',
      durationMin: 6,
      exercises: [
        {
          type: 'fill_blank',
          prompt: "Aujourd'hui c'est ____ douze mai.",
          choices: ['le', 'la', "l'", 'les'],
          correctAnswer: 'le',
          explanation: 'Dates use the masculine article "le".',
          xp: 10,
        },
        {
          type: 'translation',
          prompt: 'My birthday is on April 5.',
          choices: [
            'Mon anniversaire est le 5 avril.',
            'Mon anniversaire est en cinq avril.',
            'Le anniversaire le 5 avril.',
            'Mon anniversaire est mai 5.',
          ],
          correctAnswer: 'Mon anniversaire est le 5 avril.',
          explanation: 'French dates put the day before the month, with "le" before the number.',
          xp: 12,
        },
      ],
    },
  ],
  'course-japanese': [
    {
      title: 'Hiragana review — drinks & food',
      durationMin: 6,
      exercises: [
        {
          type: 'fill_blank',
          prompt: 'みず is romanized as…',
          choices: ['mizu', 'mizo', 'mazu', 'mzu'],
          correctAnswer: 'mizu',
          explanation: 'み (mi) + ず (zu) = water.',
          xp: 10,
        },
        {
          type: 'fill_blank',
          prompt: 'おちゃ means…',
          choices: ['water', 'tea', 'rice', 'coffee'],
          correctAnswer: 'tea',
          explanation: 'おちゃ (o-cha) = green tea, with the polite お prefix.',
          xp: 10,
        },
        {
          type: 'translation',
          prompt: 'I would like sushi.',
          choices: ['すしをください。', 'おちゃをください。', 'みずをのみます。', 'すしです。'],
          correctAnswer: 'すしをください。',
          explanation: 'を (object marker) + ください (please give me).',
          xp: 12,
        },
      ],
    },
    {
      title: 'Self-introduction',
      durationMin: 5,
      exercises: [
        {
          type: 'fill_blank',
          prompt: 'はじめまして、わたしは ____ です。',
          choices: ['です', 'たなか', 'はじめ', 'こんにちは'],
          correctAnswer: 'たなか',
          explanation: 'A name goes in the blank — Tanaka in this example.',
          xp: 10,
        },
        {
          type: 'translation',
          prompt: 'Nice to meet you.',
          choices: ['はじめまして。', 'さようなら。', 'いただきます。', 'おはよう。'],
          correctAnswer: 'はじめまして。',
          explanation: 'Standard first-meeting greeting.',
          xp: 10,
        },
      ],
    },
  ],
  'course-german': [
    {
      title: 'Asking for directions politely',
      durationMin: 7,
      exercises: [
        {
          type: 'fill_blank',
          prompt: 'Entschuldigung, wo ____ der Bahnhof?',
          choices: ['ist', 'sind', 'sein', 'bist'],
          correctAnswer: 'ist',
          explanation: '"Bahnhof" is singular masculine, so 3rd-person singular "ist".',
          xp: 10,
        },
        {
          type: 'translation',
          prompt: 'How do I get to the museum?',
          choices: [
            'Wie komme ich zum Museum?',
            'Wo ist der Museum?',
            'Was ist Museum?',
            'Wann gehe ich Museum?',
          ],
          correctAnswer: 'Wie komme ich zum Museum?',
          explanation: '"Wie komme ich zu(m)" = "how do I get to".',
          xp: 12,
        },
      ],
    },
    {
      title: 'At the bakery',
      durationMin: 4,
      exercises: [
        {
          type: 'fill_blank',
          prompt: 'Ich ____ zwei Brötchen, bitte.',
          choices: ['hätte', 'habe', 'haben', 'hatte'],
          correctAnswer: 'hätte',
          explanation: '"Ich hätte gerne" / "Ich hätte" is the polite ordering form.',
          xp: 12,
        },
        {
          type: 'translation',
          prompt: 'How much does the bread cost?',
          choices: [
            'Was kostet das Brot?',
            'Wie viel ist Brot?',
            'Wo kostet Brot?',
            'Wann kostet Brot?',
          ],
          correctAnswer: 'Was kostet das Brot?',
          explanation: '"Was kostet …" is the standard "how much" phrasing.',
          xp: 12,
        },
      ],
    },
  ],
}

let cachedSeedPromise: Promise<void> | null = null

/**
 * Seed the catalog if it hasn't been already. Idempotent. Safe to call
 * multiple times — only the first call does work; subsequent calls reuse
 * the cached promise.
 */
export async function seedCatalogOnce(): Promise<void> {
  if (cachedSeedPromise) return cachedSeedPromise
  cachedSeedPromise = doSeed()
  return cachedSeedPromise
}

async function doSeed(): Promise<void> {
  // Cheap idempotency check: if course-spanish exists, assume the rest do
  // too. Course IDs are stable strings.
  const probe = await findById<Record<string, unknown>>('language_courses', 'course-spanish')
  if (probe) return

  for (const lang of LANGUAGES) {
    const lessons = LESSONS_BY_COURSE[lang.id] ?? []
    await create('language_courses', {
      id: lang.id,
      language_name: lang.name,
      language_code: lang.code,
      flag: lang.flag,
      level: lang.level,
      unit_count: 1,
      lesson_count: lessons.length,
      description: lang.description,
      icon: lang.icon,
      tone: lang.tone,
      progress_percent: 0,
      created_at: new Date(),
    })
    const unitId = `unit-${lang.code}-1`
    await create('units', {
      id: unitId,
      course_id: lang.id,
      position: 0,
      title: 'Foundations',
      description: 'The first stretch of conversation-ready material.',
      created_at: new Date(),
    })

    let lessonPos = 0
    for (const lesson of lessons) {
      const lessonId = `lesson-${lang.code}-${++lessonPos}`
      await create('lessons', {
        id: lessonId,
        unit_id: unitId,
        course_id: lang.id,
        title: lesson.title,
        duration_min: lesson.durationMin,
        lessons_remaining: lessons.length - lessonPos,
        progress_percent: 0,
        level: lang.level,
        language: lang.name,
        flag: lang.flag,
        tone: lang.tone,
        icon: lang.icon,
        position: lessonPos - 1,
        exercise_count: lesson.exercises.length,
        created_at: new Date(),
      })

      let exPos = 0
      for (const exercise of lesson.exercises) {
        const exerciseId = `exercise-${lang.code}-${lessonPos}-${++exPos}`
        await create('exercises', {
          id: exerciseId,
          lesson_id: lessonId,
          type: exercise.type,
          prompt: exercise.prompt,
          choices: JSON.stringify(exercise.choices),
          correct_answer: exercise.correctAnswer,
          explanation: exercise.explanation,
          xp_value: exercise.xp,
          position: exPos - 1,
          created_at: new Date(),
        })
      }
    }
  }
}
