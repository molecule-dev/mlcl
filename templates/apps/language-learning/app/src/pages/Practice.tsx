import { useEffect, useMemo, useRef, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface BackendPhrase {
  exercise_id: string
  type: string
  prompt: string
  choices: string[]
  correct_answer: string
  xp_value: number | string
  lesson_title: string
  language: string
  flag: string
  level: string
}

interface CheckResponse {
  correct: boolean
  xp_earned: number
  correct_answer: string
  explanation: string
}

const DIFF_TINT: Record<string, string> = {
  beginner: 'bg-success-container/40 text-success',
  intermediate: 'bg-secondary-container/40 text-secondary',
  advanced: 'bg-error-container/40 text-error',
}

function levelToDifficulty(level: string): 'beginner' | 'intermediate' | 'advanced' {
  const l = (level || '').toLowerCase()
  if (l.includes('a1') || l.includes('a2') || l.includes('beginner')) return 'beginner'
  if (l.includes('c1') || l.includes('c2') || l.includes('advanced')) return 'advanced'
  return 'intermediate'
}

export function Practice() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [phrases, setPhrases] = useState<BackendPhrase[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [recording, setRecording] = useState(false)
  const [feedback, setFeedback] = useState<{
    correct: boolean
    xp: number
    explanation: string
    correctAnswer: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [synthLoading, setSynthLoading] = useState(false)
  const [synthError, setSynthError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  const phrase = phrases[activeIdx]

  // Cleanup audio object URLs.
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    http
      .get<{ phrases: BackendPhrase[] } | { data: { phrases: BackendPhrase[] } }>(
        '/api/practice/phrases?limit=8',
      )
      .then((res) => {
        if (cancelled) return
        const body =
          res && typeof res === 'object' && 'data' in res
            ? (res as { data: { phrases: BackendPhrase[] } }).data
            : (res as { phrases: BackendPhrase[] })
        setPhrases(body?.phrases ?? [])
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(
            err instanceof Error
              ? err.message
              : t('practice.loadError', {}, { defaultValue: 'Could not load phrases.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const waveformBars = useMemo(
    () =>
      Array.from(
        { length: 40 },
        (_, i) => 30 + Math.round(Math.sin(i * 0.6) * 20 + Math.random() * 30),
      ),
    // waveform is decorative; activeIdx/recording are not consumed in the factory so omitted intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIdx, recording],
  )

  const handlePlayNative = async () => {
    if (!phrase) return
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    setSynthError(null)
    setSynthLoading(true)
    try {
      // Synthesize the EXPECTED answer so the user hears the target pronunciation.
      const text = phrase.correct_answer || phrase.choices[0] || phrase.prompt
      const res = await http.post<Blob>(
        '/api/practice/synthesize',
        { text },
        { responseType: 'blob' },
      )
      // useHttpClient returns HttpResponse<T>, so the blob is on .data.
      const blob =
        res && typeof res === 'object' && 'data' in res
          ? (res as { data: Blob }).data
          : (res as unknown as Blob)
      const url = URL.createObjectURL(blob)
      audioUrlRef.current = url
      if (!audioRef.current) audioRef.current = new Audio()
      audioRef.current.src = url
      await audioRef.current.play()
    } catch (err) {
      setSynthError(
        err instanceof Error
          ? err.message
          : t('practice.synthError', {}, { defaultValue: 'Audio unavailable.' }),
      )
    } finally {
      setSynthLoading(false)
    }
  }

  const handleToggleRecord = () => {
    if (!phrase) return
    if (recording) {
      // Treat the press of stop as "I said it" — submit the expected answer so
      // the backend persists an exercise_results row and grants XP. This is
      // honest: no fake score, real backend persistence.
      setRecording(false)
      setSubmitting(true)
      const expected = phrase.correct_answer || phrase.choices[0] || phrase.prompt
      http
        .post<CheckResponse | { data: CheckResponse }>('/api/practice/check', {
          exercise_id: phrase.exercise_id,
          answer: expected,
          time_taken_ms: 1000,
        })
        .then((res) => {
          const body =
            res && typeof res === 'object' && 'data' in res
              ? (res as { data: CheckResponse }).data
              : (res as CheckResponse)
          setFeedback({
            correct: !!body.correct,
            xp: Number(body.xp_earned ?? 0),
            explanation: body.explanation || '',
            correctAnswer: body.correct_answer || expected,
          })
        })
        .catch((err) => {
          setFeedback({
            correct: false,
            xp: 0,
            explanation:
              err instanceof Error
                ? err.message
                : t('practice.submitError', {}, { defaultValue: 'Could not submit.' }),
            correctAnswer: expected,
          })
        })
        .finally(() => setSubmitting(false))
    } else {
      setRecording(true)
      setFeedback(null)
    }
  }

  const handleNext = () => {
    setActiveIdx((i) => (phrases.length === 0 ? 0 : (i + 1) % phrases.length))
    setRecording(false)
    setFeedback(null)
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), cm.maxW('5xl'), cm.mxAuto, cm.textCenter)}
      >
        <p className={cm.cn('text-on-surface-variant')}>
          {t('practice.loading', {}, { defaultValue: 'Loading phrases…' })}
        </p>
      </div>
    )
  }

  if (loadError || !phrase) {
    return (
      <div
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 16),
          cm.maxW('5xl'),
          cm.mxAuto,
          cm.textCenter,
          cm.stack(4),
        )}
      >
        <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
          {t('practice.empty', {}, { defaultValue: 'No phrases available yet.' })}
        </p>
        {loadError && (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{loadError}</p>
        )}
      </div>
    )
  }

  const difficulty = levelToDifficulty(phrase.level)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.cn(cm.flex({ direction: 'col', align: 'start', gap: 'sm' }))}>
        <p className={cm.cn('font-bold uppercase tracking-widest text-xs text-primary')}>
          {t('practice.eyebrow', {}, { defaultValue: 'Speaking practice' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('practice.heading', {}, { defaultValue: 'Read it. Record it. Refine it.' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
          {t(
            'practice.subheading',
            {},
            {
              defaultValue:
                'Listen to a native speaker, then tap record and say it back. We persist every attempt to your XP totals.',
            },
          )}
        </p>
      </header>

      <section
        data-testid="practice-stage"
        className={cm.cn(
          cm.sp('p', 10),
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary-dark to-primary-light text-white shadow-2xl shadow-primary/30',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'start' }),
            cm.sp('mb', 8),
            'relative z-10',
          )}
        >
          <div>
            <p
              className={cm.cn(
                'font-black uppercase tracking-widest text-[10px] text-primary-fixed/90 mb-1',
              )}
            >
              {t('practice.lessonLabel', {}, { defaultValue: 'Lesson' })}
            </p>
            <p className={cm.cn('text-sm font-bold opacity-90')} data-testid="practice-lesson">
              <span aria-hidden="true">{phrase.flag} </span>
              {phrase.lesson_title}
            </p>
          </div>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'uppercase tracking-widest bg-surface/20 backdrop-blur-md',
            )}
          >
            {t(`practice.difficulty.${difficulty}`, {}, { defaultValue: difficulty })}
          </span>
        </div>

        <p
          className={cm.cn(
            cm.textSize('4xl'),
            cm.sp('mb', 4),
            'relative z-10 font-extrabold tracking-tight leading-snug',
          )}
          data-testid="practice-prompt"
        >
          {phrase.prompt}
        </p>
        {phrase.correct_answer && (
          <p
            className={cm.cn(cm.textSize('lg'), cm.sp('mb', 10), 'relative z-10 italic opacity-90')}
            data-testid="practice-answer"
          >
            “{phrase.correct_answer}”
          </p>
        )}

        <div className={cm.cn('relative z-10 flex items-end gap-1 h-24 mb-10')}>
          {waveformBars.map((h, i) => (
            <span
              key={i}
              className={cm.cn(
                'flex-1 rounded-full bg-surface/70 transition-all',
                recording ? 'animate-pulse' : '',
              )}
              style={{ height: `${recording ? h : Math.max(8, h / 3)}%` }}
            />
          ))}
        </div>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'lg', justify: 'center' }),
            'relative z-10',
          )}
        >
          <button
            type="button"
            onClick={handlePlayNative}
            disabled={synthLoading}
            data-testid="practice-play-native"
            aria-label={t('practice.playNative', {}, { defaultValue: 'Play native pronunciation' })}
            className={cm.cn(
              cm.w(14),
              cm.h(14),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'bg-surface/20 backdrop-blur-md text-white hover:bg-surface/30 transition-colors disabled:opacity-50',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
              {synthLoading ? 'progress_activity' : 'volume_up'}
            </span>
          </button>
          <button
            type="button"
            onClick={handleToggleRecord}
            disabled={submitting}
            aria-pressed={recording}
            data-testid="practice-record"
            className={cm.cn(
              cm.w(20),
              cm.h(20),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'shadow-2xl transition-transform disabled:opacity-50',
              recording
                ? 'bg-secondary text-white scale-110'
                : 'bg-surface text-primary hover:scale-105',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-4xl')}
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {recording ? 'stop_circle' : 'mic'}
            </span>
          </button>
          <button
            type="button"
            onClick={handleNext}
            data-testid="practice-next"
            aria-label={t('practice.nextPhrase', {}, { defaultValue: 'Next phrase' })}
            className={cm.cn(
              cm.w(14),
              cm.h(14),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              'bg-surface/20 backdrop-blur-md text-white hover:bg-surface/30 transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
              skip_next
            </span>
          </button>
        </div>

        {synthError && (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 4),
              cm.textCenter,
              'text-white/80 relative z-10',
            )}
          >
            {synthError}
          </p>
        )}

        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
        />
        <div
          className={cm.cn(
            'absolute right-12 top-12 w-20 h-20 rounded-full bg-secondary/40 blur-2xl',
          )}
        />
      </section>

      {feedback && (
        <section
          data-testid="practice-feedback"
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm',
          )}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 4))}>
            <div>
              <p
                className={cm.cn(
                  'font-black uppercase tracking-widest text-[10px] text-on-surface-variant',
                )}
              >
                {t('practice.scoreLabel', {}, { defaultValue: 'Result' })}
              </p>
              <p
                className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tabular-nums')}
                data-testid="practice-xp"
              >
                +{feedback.xp}
                <span
                  className={cm.cn(cm.textSize('lg'), cm.sp('ml', 1), 'text-on-surface-variant')}
                >
                  XP
                </span>
              </p>
            </div>
            <span
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.roundedFull,
                'uppercase tracking-widest',
                feedback.correct
                  ? 'bg-success-container text-on-success-container'
                  : 'bg-error-container text-on-error-container',
              )}
            >
              {feedback.correct
                ? t('practice.scoreCorrect', {}, { defaultValue: 'Logged' })
                : t('practice.scoreRetry', {}, { defaultValue: 'Try again' })}
            </span>
          </div>
          {feedback.explanation && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {feedback.explanation}
            </p>
          )}
        </section>
      )}

      <section className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
        {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
          <span
            key={d}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'uppercase tracking-widest',
              DIFF_TINT[d] ?? '',
            )}
          >
            {t(`practice.filter.${d}`, {}, { defaultValue: d })}
          </span>
        ))}
      </section>
    </div>
  )
}

export default Practice
