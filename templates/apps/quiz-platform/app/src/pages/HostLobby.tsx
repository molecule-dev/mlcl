import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { JoinCodeHero, type LobbyPlayer } from '../components/JoinCodeHero.js'
import { SparqLogo } from '../components/SparqLogo.js'
import { getRealtimeConnection } from '../lib/realtime.js'

interface SessionRow {
  id: string
  quiz_id: string
  host_id: string
  join_code: string
  status: string
}

interface ParticipantRow {
  id: string
  user_id: string
  nickname: string
}

const RULES = [
  {
    glyph: 'speed',
    title: 'Faster = more points',
    body: 'Answer in the first 5 seconds for a 2x time bonus.',
  },
  {
    glyph: 'local_fire_department',
    title: 'Streak multiplier',
    body: 'Three correct in a row triggers a +20% streak boost.',
  },
  {
    glyph: 'flag',
    title: 'No skips',
    body: 'Once a question starts, the timer ticks for everyone.',
  },
]

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

export function HostLobby() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id: quizId } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [session, setSession] = useState<SessionRow | null>(null)
  const [players, setPlayers] = useState<LobbyPlayer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(true)
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchPlayers = useCallback(
    async (sessionId: string) => {
      try {
        const res = await http.get(`/api/leaderboard/session/${sessionId}`)
        const list = unwrap<ParticipantRow[]>(res) ?? []
        setPlayers(
          (Array.isArray(list) ? list : []).map((p) => ({
            id: p.id,
            name: p.nickname,
            avatarSeed: p.user_id,
          })),
        )
      } catch (_error) {
        // Polling failure is silent; next tick will retry
      }
    },
    [http],
  )

  const setup = useCallback(async () => {
    if (!quizId) return
    setCreating(true)
    setError(null)
    try {
      const res = await http.post('/api/sessions', { quiz_id: quizId })
      const created = unwrap<SessionRow>(res)
      if (!created?.id) {
        setError(t('hostLobby.error', {}, { defaultValue: 'Could not create the lobby.' }))
        return
      }
      try {
        await http.post(`/api/sessions/${created.id}/join`, { nickname: 'Host' })
      } catch (_error) {
        // Host may already be in another session — join failure is safe to ignore
      }
      setSession(created)
      await fetchPlayers(created.id)
    } catch (err) {
      setError(t('hostLobby.error', {}, { defaultValue: 'Could not create the lobby.' }))
      console.error(err)
    } finally {
      setCreating(false)
    }
  }, [http, quizId, fetchPlayers, t])

  useEffect(() => {
    void setup()
  }, [setup])

  // Live lobby: a joining player appears instantly via the session room's
  // `player-joined` event (was a 2.5 s poll). The refetch stays the handler so
  // the player list shape matches the initial load. A SLOW 20 s poll remains as a
  // reconnect safety net if the socket drops. Server: api/src/handlers/sessions.ts.
  useEffect(() => {
    if (!session) return
    const sessionId = session.id
    let active = true
    let connection: RealtimeConnection | null = null
    const onPlayerJoined = () => {
      void fetchPlayers(sessionId)
    }

    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        conn.on('player-joined', onPlayerJoined)
        return conn.joinRoom(`session:${sessionId}`)
      })
      .catch(() => {
        // Realtime is best-effort; the slow poll below still refreshes the lobby.
      })

    pollingRef.current = setInterval(() => {
      void fetchPlayers(sessionId)
    }, 20000)

    return () => {
      active = false
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (connection) {
        connection.off('player-joined', onPlayerJoined)
        connection.leaveRoom(`session:${sessionId}`).catch(() => {})
      }
    }
  }, [session, fetchPlayers])

  async function handleStart() {
    if (!session) return
    setStarting(true)
    try {
      await http.post(`/api/sessions/${session.id}/start`, {})
      navigate(`/quiz/${quizId}/play?sessionId=${session.id}`)
    } catch (_error) {
      // Start failed; error shown in UI via setError below
      setStarting(false)
      setError(t('hostLobby.startError', {}, { defaultValue: 'Could not start the game.' }))
    }
  }

  async function handleCopy() {
    if (!session) return
    try {
      await navigator.clipboard.writeText(session.join_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_error) {
      // Clipboard write may be denied by the browser; silently ignore
    }
  }

  if (creating || !session) {
    return (
      <div
        className={cm.cn(
          cm.minH('screen'),
          'bg-[var(--quiz-gradient-from)] text-white antialiased',
          cm.flex({ align: 'center', justify: 'center' }),
        )}
      >
        <div className={cm.cn(cm.textCenter)}>
          {error ? (
            <div>
              <p className={cm.cn('text-base font-bold mb-4')}>{error}</p>
              <button
                type="button"
                onClick={() => navigate(`/quiz/${quizId}`)}
                className={cm.cn(
                  'px-5 py-2 rounded-xl bg-amber-400 text-amber-950 text-xs font-extrabold uppercase tracking-widest',
                )}
              >
                {t('hostLobby.back', {}, { defaultValue: 'Back to quiz' })}
              </button>
            </div>
          ) : (
            <p className={cm.cn('text-sm font-bold uppercase tracking-widest opacity-80')}>
              {t('hostLobby.creating', {}, { defaultValue: 'Spinning up your lobby…' })}
            </p>
          )}
        </div>
      </div>
    )
  }

  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : 'sparq.live'}/play?code=${session.join_code}`

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'bg-[var(--quiz-gradient-from)] text-white antialiased')}
      data-testid="host-lobby"
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
        )}
      >
        <SparqLogo size="sm" variant="onPrimary" />
        <button
          type="button"
          onClick={() => navigate(`/quiz/${quizId}`)}
          className={cm.cn('text-xs font-semibold text-white/80 hover:text-white')}
        >
          {t('hostLobby.exit', {}, { defaultValue: 'Cancel lobby' })}
        </button>
      </header>

      <main
        className={cm.cn(cm.maxW('2xl'), 'mx-auto', cm.sp('px', 8), cm.sp('py', 6), cm.stack(8))}
      >
        <JoinCodeHero
          joinCode={session.join_code}
          joinUrl={joinUrl}
          players={players}
          maxPlayers={20}
          onStart={() => void handleStart()}
          onCopy={() => void handleCopy()}
        />

        {copied ? (
          <p className={cm.cn('text-amber-200 text-xs font-bold')} data-testid="copied">
            {t('hostLobby.copied', {}, { defaultValue: 'Join code copied to clipboard.' })}
          </p>
        ) : null}
        {starting ? (
          <p className={cm.cn('text-amber-200 text-xs font-bold')}>
            {t('hostLobby.starting', {}, { defaultValue: 'Starting the spark…' })}
          </p>
        ) : null}

        <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-3')}>
          <div
            className={cm.cn(
              'lg:col-span-2 rounded-3xl bg-surface/5 border border-surface/10',
              cm.sp('p', 6),
            )}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
            >
              <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
                {t('hostLobby.players.title', {}, { defaultValue: 'Players in the lobby' })}
              </h2>
              <span
                className={cm.cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-300/30 text-[10px] font-black uppercase tracking-widest',
                )}
                data-testid="player-count"
              >
                <span className={cm.cn('w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse')} />
                {t(
                  'hostLobby.players.count',
                  { count: players.length },
                  { defaultValue: '{{count}} live' },
                )}
              </span>
            </div>
            {players.length === 0 ? (
              <p className={cm.cn('text-sm text-white/70')}>
                {t(
                  'hostLobby.players.waiting',
                  { code: session.join_code },
                  {
                    defaultValue: 'Waiting for players. Share code {{code}} so they can join.',
                  },
                )}
              </p>
            ) : (
              <ul
                className={cm.cn(cm.grid({ cols: 2, gap: 'sm' }), 'sm:grid-cols-3')}
                data-testid="player-list"
              >
                {players.map((p) => (
                  <li
                    key={p.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 3 }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-xl bg-surface/10 border border-surface/10',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'w-9 h-9 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-sm',
                      )}
                      aria-hidden="true"
                    >
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className={cm.cn('text-sm font-bold')}>{p.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside
            className={cm.cn('rounded-3xl bg-surface/5 border border-surface/10', cm.sp('p', 6))}
          >
            <h2 className={cm.cn('text-lg font-extrabold tracking-tight mb-4')}>
              {t('hostLobby.rules.title', {}, { defaultValue: 'House rules' })}
            </h2>
            <ul className={cm.cn('space-y-4')}>
              {RULES.map((rule) => (
                <li key={rule.glyph} className={cm.cn(cm.flex({ align: 'start', gap: 3 }))}>
                  <span
                    className={cm.cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center bg-amber-400/20 text-amber-200 flex-shrink-0',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">{rule.glyph}</span>
                  </span>
                  <div>
                    <p className={cm.cn('font-bold text-sm')}>
                      {t(`hostLobby.rules.${rule.glyph}.title`, {}, { defaultValue: rule.title })}
                    </p>
                    <p className={cm.cn('text-xs text-white/70 mt-0.5')}>
                      {t(`hostLobby.rules.${rule.glyph}.body`, {}, { defaultValue: rule.body })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </section>
      </main>
    </div>
  )
}

export default HostLobby
