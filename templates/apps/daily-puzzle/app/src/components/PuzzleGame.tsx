import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { GuessDistribution } from './GuessDistribution.js'
import { LexletLogo } from './LexletLogo.js'
import { type BoardGuess, type LetterFeedback, PuzzleBoard, WORD_LENGTH } from './PuzzleBoard.js'
import { deriveLetterStates, PuzzleKeyboard } from './PuzzleKeyboard.js'

/** GET /api/puzzles/:date shape (also /today). */
interface PuzzleState {
  date: string
  puzzleNumber: number
  practice: boolean
  guesses: Array<{ word: string; feedback: LetterFeedback[] }>
  status: 'playing' | 'won' | 'lost'
  attempts: number
  answer?: string
}

/** POST .../guess response — extends the state with the fold's stats. */
interface GuessResponse extends PuzzleState {
  stats?: {
    played: number
    wins: number
    winRate: number
    currentStreak: number
    maxStreak: number
    distribution: Record<string, number>
  }
}

interface PuzzleGameProps {
  /** undefined = today's ranked daily; a 'YYYY-MM-DD' string = archive practice. */
  date?: string
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

/** Streak lengths worth a dedicated analytics event (ranked wins only). */
const STREAK_MILESTONES = [3, 5, 7, 10, 14, 21, 30, 50, 100]

/** Fire-and-forget domain event — analytics is a silent no-op without a key. */
function trackEvent(name: string, properties: Record<string, unknown>): void {
  void track({ name, properties }).catch(() => undefined)
}

/**
 * Client-side twin of api/src/lib/puzzle-engine.ts buildShareText — emoji
 * grid + streak line for the clipboard. The exact mapping (🟩🟨⬛) is pinned
 * server-side by api/src/__tests__/puzzle-engine.test.ts; keep the two in
 * lockstep when changing the card format.
 */
function buildShareText(
  puzzleNumber: number,
  guesses: BoardGuess[],
  solved: boolean,
  streak?: number,
): string {
  const tile = (state: LetterFeedback) =>
    state === 'correct' ? '🟩' : state === 'present' ? '🟨' : '⬛'
  const lines = [
    `Daily Puzzle #${puzzleNumber} ${solved ? '✅' : '❌'} ${guesses.length}/6`,
    ...guesses.map((g) => g.feedback.map(tile).join('')),
  ]
  if (streak !== undefined) lines.push(`🔥 ${streak}`)
  return lines.join('\n')
}

/**
 * The game engine shared by /play (today, ranked) and /archive/:date
 * (practice). Loads the server-owned state, feeds both input paths (physical
 * keyboard + on-screen keys) through one handler, and renders the board,
 * toast, and post-game panel. All game truth lives server-side — reloading
 * this page always resumes the exact game state.
 */
export function PuzzleGame({ date }: PuzzleGameProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [state, setState] = useState<PuzzleState | null>(null)
  const [input, setInput] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [finalStats, setFinalStats] = useState<GuessResponse['stats']>(undefined)
  const [copied, setCopied] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const path = date ? `/api/puzzles/${date}` : '/api/puzzles/today'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get(path)
      .then((res) => {
        if (!cancelled) setState(unwrap<PuzzleState>(res))
      })
      .catch(() => {
        if (!cancelled)
          setLoadError(
            t('play.loadError', {}, { defaultValue: 'Could not load the puzzle. Try again.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, path, t])

  const showToast = useCallback((message: string) => {
    setToast(message)
    setCopied(false)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }, [])

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    },
    [],
  )

  const finished = state?.status === 'won' || state?.status === 'lost'

  const submitGuess = useCallback(
    async (word: string) => {
      if (!state || submitting || finished) return
      setSubmitting(true)
      try {
        const res = await http.post(`/api/puzzles/${state.date}/guess`, { word })
        const body = unwrap<GuessResponse>(res)
        setState((prev) =>
          prev
            ? {
                ...prev,
                guesses: body.guesses.map((g) => ({ word: g.word, feedback: g.feedback })),
                status: body.status,
                attempts: body.attempts,
                answer: body.answer ?? prev.answer,
              }
            : prev,
        )
        if (body.stats) setFinalStats(body.stats)
        setInput('')

        // Domain events — fire-and-forget, never block or fail the game.
        const gameProps = {
          puzzleNumber: state.puzzleNumber,
          attempts: body.attempts,
          practice: state.practice,
        }
        trackEvent('guess.submitted', gameProps)
        if (body.status === 'won' || body.status === 'lost') {
          trackEvent('puzzle.completed', { ...gameProps, status: body.status })
          if (!state.practice && body.stats && body.status === 'won') {
            const streak = body.stats.currentStreak
            if (STREAK_MILESTONES.includes(streak)) {
              trackEvent('streak.milestone', { streak, ...gameProps })
            }
          }
        }
      } catch (err) {
        const status = (err as { status?: number }).status ?? 0
        if (status === 422) {
          showToast(t('play.notInWordList', {}, { defaultValue: 'Not in the word list' }))
          setShake(true)
          setTimeout(() => setShake(false), 450)
        } else if (status === 400) {
          showToast(t('play.tooShort', {}, { defaultValue: 'Not enough letters' }))
          setShake(true)
          setTimeout(() => setShake(false), 450)
        } else if (status === 409) {
          const body = (err as { response?: { data?: PuzzleState } }).response?.data
          if (body) setState(body)
          showToast(
            t('play.alreadyFinished', {}, { defaultValue: 'You already finished this puzzle' }),
          )
        } else {
          showToast(t('play.submitError', {}, { defaultValue: 'Something went wrong — try again' }))
        }
      } finally {
        setSubmitting(false)
      }
    },
    [finished, http, showToast, state, submitting, t],
  )

  const handleKey = useCallback(
    (key: string) => {
      if (!state || finished || submitting || loading) return
      if (key === 'enter') {
        if (input.length === WORD_LENGTH) void submitGuess(input)
        else showToast(t('play.tooShort', {}, { defaultValue: 'Not enough letters' }))
        return
      }
      if (key === 'backspace') {
        setInput((value) => value.slice(0, -1))
        return
      }
      if (/^[a-z]$/.test(key)) {
        setInput((value) => (value.length < WORD_LENGTH ? value + key : value))
      }
    },
    [finished, input, loading, showToast, state, submitGuess, submitting, t],
  )

  // Physical keyboard — one listener, routed through the same handler as the
  // on-screen keys. Ignored while a modal-ish element has focus? There are
  // none on this screen; the disabled guards cover load/finish/submit states.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'Enter') {
        event.preventDefault()
        handleKey('enter')
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        handleKey('backspace')
      } else if (/^[a-zA-Z]$/.test(event.key)) {
        handleKey(event.key.toLowerCase())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey])

  const letterStates = useMemo(() => deriveLetterStates(state?.guesses ?? []), [state?.guesses])

  const handleShare = useCallback(async () => {
    if (!state) return
    trackEvent('puzzle.shared', {
      puzzleNumber: state.puzzleNumber,
      status: state.status,
      practice: state.practice,
    })
    const text = buildShareText(
      state.puzzleNumber,
      state.guesses,
      state.status === 'won',
      finalStats?.currentStreak,
    )
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      showToast(t('play.shareCopied', {}, { defaultValue: 'Copied to clipboard' }))
    } catch (_error) {
      // Clipboard unavailable (permissions, non-secure context) — surface the
      // card in the toast so the user can still read/transcribe it.
      showToast(text)
    }
  }, [finalStats?.currentStreak, showToast, state, t])

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 4 }),
          cm.minH('screen'),
          'bg-surface text-on-surface',
        )}
      >
        <span
          className={cm.spinner()}
          aria-label={t('common.loading', {}, { defaultValue: 'Loading' })}
        />
      </div>
    )
  }

  if (loadError || !state) {
    return (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 4 }),
          cm.minH('screen'),
          'bg-surface text-on-surface',
        )}
      >
        <p className={cm.cn(cm.textSize('lg'))}>{loadError}</p>
        <Link to="/" className={cm.cn(cm.button({ variant: 'solid', color: 'primary' }))}>
          {t('play.backHome', {}, { defaultValue: 'Back to home' })}
        </Link>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', gap: 4 }),
        cm.minH('screen'),
        'bg-surface text-on-surface antialiased',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          'w-full max-w-2xl px-4 py-3 border-b border-outline-variant/30',
        )}
      >
        <Link to="/" aria-label="Lexlet home">
          <LexletLogo size="sm" />
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          {state.practice && (
            <span
              className={cm.cn(cm.badge({ variant: 'warning' }), 'font-semibold')}
              data-mol-id="practice-badge"
            >
              {t('play.practiceBadge', {}, { defaultValue: 'Practice — no streak effect' })}
            </span>
          )}
          <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant font-semibold')}>
            {t(
              'play.puzzleNumber',
              { number: state.puzzleNumber },
              { defaultValue: `#${state.puzzleNumber}` },
            )}
          </span>
          <Link
            to="/stats"
            className={cm.cn(
              cm.textSize('sm'),
              // p-2/-m-2 grows the ~20px text link to a ~36px touch target
              // with zero visual shift — this is the only tap control on the
              // game screen besides the keyboard.
              'p-2 -m-2 font-semibold text-on-surface-variant hover:text-primary transition-colors',
            )}
            data-mol-id="play-stats-link"
          >
            {t('nav.stats', {}, { defaultValue: 'Stats' })}
          </Link>
        </div>
      </header>

      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 4 }),
          'w-full max-w-2xl px-4 pb-8',
        )}
      >
        <h1 className={cm.cn('sr-only')}>
          {state.practice
            ? t('play.titlePractice', {}, { defaultValue: 'Practice puzzle' })
            : t('play.title', {}, { defaultValue: "Today's puzzle" })}
        </h1>

        <PuzzleBoard guesses={state.guesses} currentInput={input} shake={shake} />

        {finished ? (
          <section
            className={cm.cn(cm.card(), 'w-full max-w-md text-center')}
            data-mol-id="game-result"
          >
            <p className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {state.status === 'won'
                ? t('play.won', {}, { defaultValue: 'Solved it!' })
                : t('play.lost', {}, { defaultValue: 'Out of guesses' })}
            </p>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
              {t('play.answerWas', {}, { defaultValue: 'The word was' })}{' '}
              <span className={cm.cn(cm.fontWeight('bold'), 'text-primary tracking-widest')}>
                {state.answer}
              </span>
            </p>
            {finalStats && (
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 4 }),
                  'text-on-surface-variant',
                )}
              >
                <span>
                  {t('stats.currentStreak', {}, { defaultValue: 'Streak' })}:{' '}
                  <strong className="text-on-surface">🔥 {finalStats.currentStreak}</strong>
                </span>
                <span>
                  {t('stats.winRate', {}, { defaultValue: 'Win rate' })}:{' '}
                  <strong className="text-on-surface">{finalStats.winRate}%</strong>
                </span>
              </div>
            )}
            {!state.practice && finalStats && (
              <GuessDistribution
                distribution={finalStats.distribution}
                highlight={state.status === 'won' ? state.attempts : undefined}
              />
            )}
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 2, wrap: 'wrap' }),
              )}
            >
              <button
                type="button"
                className={cm.button({ variant: 'solid', color: 'primary', size: 'md' })}
                onClick={() => void handleShare()}
                data-mol-id="share-button"
              >
                {copied
                  ? t('play.shareCopied', {}, { defaultValue: 'Copied to clipboard' })
                  : t('play.share', {}, { defaultValue: 'Share' })}
              </button>
              <Link
                to="/stats"
                className={cm.button({ variant: 'outline', color: 'secondary', size: 'md' })}
                data-mol-id="result-stats-link"
              >
                {t('nav.stats', {}, { defaultValue: 'Stats' })}
              </Link>
              <Link
                to="/archive"
                className={cm.button({ variant: 'outline', color: 'secondary', size: 'md' })}
                data-mol-id="result-archive-link"
              >
                {t('nav.archive', {}, { defaultValue: 'Archive' })}
              </Link>
              <Link
                to="/leaderboard"
                className={cm.button({ variant: 'ghost', color: 'secondary', size: 'md' })}
                data-mol-id="result-leaderboard-link"
              >
                {t('nav.leaderboard', {}, { defaultValue: 'Leaderboard' })}
              </Link>
            </div>
          </section>
        ) : (
          <PuzzleKeyboard
            letterStates={letterStates}
            onKey={handleKey}
            disabled={submitting || finished || loading}
          />
        )}
      </main>

      {toast && (
        <div
          role="status"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'fixed bottom-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-inverse-surface text-inverse-on-surface text-sm font-semibold shadow-lg',
          )}
          data-mol-id="game-toast"
        >
          {toast}
        </div>
      )}
    </div>
  )
}

export default PuzzleGame
