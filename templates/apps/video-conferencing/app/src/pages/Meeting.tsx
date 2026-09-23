import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import { getRealtimeConnection } from '../lib/realtime.js'

interface Participant {
  id: string
  user_name: string
  audio_enabled?: boolean
  video_enabled?: boolean
  hand_raised?: boolean
  is_speaking?: boolean
  is_pinned?: boolean
  role?: string
}

interface ChatMessage {
  id: string
  user_name: string
  content: string
  created_at_label?: string
  is_own?: boolean
}

const FALLBACK_PARTICIPANTS: Participant[] = [
  {
    id: 'me',
    user_name: 'You',
    audio_enabled: true,
    video_enabled: true,
    role: 'Host',
    is_speaking: true,
  },
  { id: 'p1', user_name: 'Sarah Kim', audio_enabled: true, video_enabled: true },
  { id: 'p2', user_name: 'David Park', audio_enabled: false, video_enabled: true },
  {
    id: 'p3',
    user_name: 'Maya Reyes',
    audio_enabled: true,
    video_enabled: false,
    hand_raised: true,
  },
  { id: 'p4', user_name: 'Jose Lopez', audio_enabled: true, video_enabled: true, is_pinned: true },
  { id: 'p5', user_name: 'Asha Bose', audio_enabled: true, video_enabled: true },
]

const FALLBACK_CHAT: ChatMessage[] = [
  {
    id: 'c1',
    user_name: 'Sarah Kim',
    content: 'Hey everyone — kicking us off.',
    created_at_label: '2:01 PM',
  },
  {
    id: 'c2',
    user_name: 'David Park',
    content: 'Quick agenda check: pricing, retention, then ML roadmap?',
    created_at_label: '2:01 PM',
  },
  {
    id: 'c3',
    user_name: 'You',
    content: 'Works for me — I have notes on retention.',
    created_at_label: '2:02 PM',
    is_own: true,
  },
]

export function Meeting() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id = 'instant' } = useParams<{ id: string }>()
  const [participants, setParticipants] = useState<Participant[]>(FALLBACK_PARTICIPANTS)
  const [chat, setChat] = useState<ChatMessage[]>(FALLBACK_CHAT)
  const [newChat, setNewChat] = useState('')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [recording, setRecording] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  // The chat rail is a full-screen overlay on phones — start closed there so
  // the video grid is the first thing a mobile joiner sees.
  const [showChat, setShowChat] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 640,
  )
  const [showParticipants, setShowParticipants] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const reload = useCallback(async () => {
    const [pRes, cRes] = await Promise.allSettled([
      http.get<{ data: Participant[] }>(`/api/participants/${id}`),
      http.get<{ data: ChatMessage[] }>(`/api/chat/${id}`),
    ])
    if (pRes.status === 'fulfilled') {
      const data = pRes.value?.data
      if (Array.isArray(data) && data.length > 0) setParticipants(data)
    }
    if (cRes.status === 'fulfilled') {
      const data = cRes.value?.data
      if (Array.isArray(data) && data.length > 0) setChat(data)
    }
  }, [http, id])

  useEffect(() => {
    void reload()
  }, [reload])

  // Live meeting — the API broadcasts participant:joined/left/updated + meeting:chat
  // (and meeting:started/ended) to the `meeting:<id>` room (api/src/handlers). Join it
  // and re-fetch on each event so the roster and chat update without a reload — the
  // whole point of a conference. Room + event names MUST match the server exactly, a
  // mismatch is a silent no-op. The room is participant-guarded, so the socket carries
  // the auth token (see lib/realtime.ts). Realtime is an enhancement: if the socket
  // can't connect, the page still shows the initial fetch.
  useEffect(() => {
    if (!id) return
    const room = `meeting:${id}`
    const events = [
      'participant:joined',
      'participant:left',
      'participant:updated',
      'meeting:chat',
      'meeting:started',
      'meeting:ended',
    ]
    let active = true
    let connection: RealtimeConnection | null = null
    const onEvent = () => {
      void reload()
    }
    getRealtimeConnection()
      .then((conn) => {
        if (!active) return
        connection = conn
        for (const e of events) conn.on(e, onEvent)
        return conn.joinRoom(room)
      })
      .catch(() => {
        // Socket unavailable — the page still works from the initial fetch.
      })
    return () => {
      active = false
      if (connection) {
        for (const e of events) connection.off(e, onEvent)
        connection.leaveRoom(room).catch(() => {})
      }
    }
  }, [id, reload])

  useEffect(() => {
    const interval = window.setInterval(() => setElapsed((v) => v + 1), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const sendChat = useCallback(async () => {
    if (!newChat.trim()) return
    const message: ChatMessage = {
      id: `local-${Date.now()}`,
      user_name: 'You',
      content: newChat.trim(),
      created_at_label: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_own: true,
    }
    setChat((prev) => [...prev, message])
    setNewChat('')
    track({ name: 'meeting.chat_sent', properties: { meeting_id: id } })
    try {
      await http.post(`/api/chat/${id}`, { content: message.content })
    } catch (_error) {
      // optimistic — message already added locally, server failure is non-fatal
    }
  }, [newChat, http, id])

  const leaveMeeting = useCallback(async () => {
    track({ name: 'meeting.left', properties: { meeting_id: id } })
    try {
      await http.post(`/api/participants/${id}/leave`, {})
    } catch (_error) {
      // leave signal is best-effort — navigate away regardless
    }
    navigate('/dashboard')
  }, [http, id, navigate])

  const elapsedLabel = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-[var(--color-video-grid)] text-white relative overflow-hidden',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          'h-12 bg-foreground/40 backdrop-blur-md border-b border-surface/10 z-30',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          {recording && (
            <span
              className={
                'flex items-center gap-2 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full bg-error/90'
              }
            >
              <span className={'w-1.5 h-1.5 rounded-full bg-surface animate-pulse'} />
              REC {elapsedLabel}
            </span>
          )}
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t('meeting.inMeeting', {}, { defaultValue: 'In meeting' })} · {id}
          </span>
        </div>
        <div className={cm.cn(cm.textSize('xs'), 'tabular-nums text-white/70')}>{elapsedLabel}</div>
      </header>

      <div className={cm.cn(cm.flex({ gap: 0 }), cm.flex1, 'min-h-0')}>
        <main className={cm.cn(cm.flex1, cm.sp('p', 2), 'sm:p-4 overflow-y-auto')}>
          {/* 2-up on phones (Meet-style, no pinched 3rd column), 3-up from lg.
              The gallery scrolls instead of clipping when rows overflow. */}
          <div className={cm.cn(cm.grid({ cols: 2, gap: 'sm' }), 'lg:grid-cols-3 auto-rows-fr')}>
            {participants.map((p) => (
              <ParticipantTile key={p.id} participant={p} />
            ))}
          </div>
        </main>

        {(showChat || showParticipants) && (
          <aside
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'fixed top-12 bottom-[72px] right-0 z-40 w-full shadow-2xl sm:static sm:top-auto sm:bottom-auto sm:w-[320px] sm:shadow-none bg-participant-tile border-l border-surface/10',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('p', 4),
                'border-b border-surface/10',
              )}
            >
              <div className={cm.flex({ gap: 2 })}>
                <button
                  type="button"
                  onClick={() => {
                    setShowChat(true)
                    setShowParticipants(false)
                  }}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'rounded-full uppercase tracking-widest transition-colors',
                    showChat
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface/5 text-white/60 hover:text-white',
                  )}
                >
                  {t('meeting.chat', {}, { defaultValue: 'Chat' })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChat(false)
                    setShowParticipants(true)
                  }}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'rounded-full uppercase tracking-widest transition-colors',
                    showParticipants
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface/5 text-white/60 hover:text-white',
                  )}
                >
                  {t(
                    'meeting.participants',
                    { count: participants.length },
                    { defaultValue: 'Participants ({{count}})' },
                  )}
                </button>
              </div>
            </div>

            {showChat && (
              <>
                <div className={cm.cn(cm.flex1, cm.sp('p', 4), cm.stack(3), 'overflow-y-auto')}>
                  {chat.map((msg) => (
                    <div
                      key={msg.id}
                      className={cm.cn(
                        cm.flex({ direction: 'col', gap: 1 }),
                        msg.is_own ? 'items-end' : 'items-start',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'text-white/60',
                        )}
                      >
                        {msg.user_name} · {msg.created_at_label}
                      </span>
                      <div
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          'rounded-2xl max-w-[85%]',
                          msg.is_own ? 'bg-primary text-on-primary' : 'bg-surface/10',
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ gap: 2 }),
                    cm.sp('p', 4),
                    'border-t border-surface/10',
                  )}
                >
                  <input
                    type="text"
                    value={newChat}
                    onChange={(e) => setNewChat(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                    aria-label={t(
                      'meeting.chatPlaceholder',
                      {},
                      { defaultValue: 'Type a message…' },
                    )}
                    placeholder={t(
                      'meeting.chatPlaceholder',
                      {},
                      { defaultValue: 'Type a message…' },
                    )}
                    className={cm.cn(
                      cm.flex1,
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'rounded-lg bg-surface/10 placeholder:text-white/40 focus:bg-surface/15 focus:outline-none',
                    )}
                  />
                  <button
                    type="button"
                    onClick={sendChat}
                    aria-label={t('common.send', {}, { defaultValue: 'Send' })}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-10 h-10 rounded-lg bg-primary hover:bg-primary-dark transition-colors',
                    )}
                  >
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </div>
              </>
            )}

            {showParticipants && (
              <ul className={cm.cn(cm.flex1, cm.sp('p', 2), cm.stack(1), 'overflow-y-auto')}>
                {participants.map((p) => (
                  <li
                    key={p.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-lg hover:bg-surface/5',
                    )}
                  >
                    <div className={cm.flex({ align: 'center', gap: 3 })}>
                      <div
                        className={
                          'w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold'
                        }
                      >
                        {p.user_name.charAt(0)}
                      </div>
                      <div>
                        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                          {p.user_name}
                        </p>
                        {p.role && (
                          <p className={cm.cn(cm.textSize('xs'), 'text-primary')}>{p.role}</p>
                        )}
                      </div>
                    </div>
                    <div className={cm.flex({ align: 'center', gap: 2 })}>
                      {p.hand_raised && (
                        <span className={'material-symbols-outlined text-warning text-base'}>
                          pan_tool
                        </span>
                      )}
                      {!p.audio_enabled && (
                        <span className={'material-symbols-outlined text-error text-base'}>
                          mic_off
                        </span>
                      )}
                      {!p.video_enabled && (
                        <span className={'material-symbols-outlined text-white/40 text-base'}>
                          videocam_off
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 2 }),
          cm.sp('px', 3),
          'sm:px-6 h-[72px] shrink-0 bg-foreground/60 backdrop-blur-xl border-t border-surface/10 z-30',
        )}
      >
        <div className={cm.cn(cm.textSize('xs'), 'hidden sm:block tabular-nums text-white/60')}>
          {elapsedLabel}
        </div>
        {/* The seven in-call controls need ~430px — on phones they live in a
            horizontally scrollable strip instead of overflowing the bar. */}
        <div className={cm.cn(cm.flex1, cm.flex({ align: 'center' }), 'min-w-0')}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'overflow-x-auto py-2')}>
            <ControlButton
              icon={audioEnabled ? 'mic' : 'mic_off'}
              label={
                audioEnabled
                  ? t('meeting.mute', {}, { defaultValue: 'Mute' })
                  : t('meeting.unmute', {}, { defaultValue: 'Unmute' })
              }
              active={!audioEnabled}
              onClick={() => {
                const next = !audioEnabled
                setAudioEnabled(next)
                track({
                  name: next ? 'participant.unmuted' : 'participant.muted',
                  properties: { meeting_id: id },
                })
              }}
            />
            <ControlButton
              icon={videoEnabled ? 'videocam' : 'videocam_off'}
              label={
                videoEnabled
                  ? t('meeting.stopVideo', {}, { defaultValue: 'Stop video' })
                  : t('meeting.startVideo', {}, { defaultValue: 'Start video' })
              }
              active={!videoEnabled}
              onClick={() => {
                const next = !videoEnabled
                setVideoEnabled(next)
                track({
                  name: next ? 'participant.video_on' : 'participant.video_off',
                  properties: { meeting_id: id },
                })
              }}
            />
            <ControlButton
              icon="screen_share"
              label={
                screenSharing
                  ? t('meeting.stopShare', {}, { defaultValue: 'Stop sharing' })
                  : t('meeting.shareScreen', {}, { defaultValue: 'Share screen' })
              }
              active={screenSharing}
              onClick={() => {
                const next = !screenSharing
                setScreenSharing(next)
                track({
                  name: next ? 'meeting.screen_share_started' : 'meeting.screen_share_stopped',
                  properties: { meeting_id: id },
                })
              }}
            />
            <ControlButton
              icon="pan_tool"
              label={
                handRaised
                  ? t('meeting.lowerHand', {}, { defaultValue: 'Lower hand' })
                  : t('meeting.raiseHand', {}, { defaultValue: 'Raise hand' })
              }
              active={handRaised}
              onClick={() => {
                const next = !handRaised
                setHandRaised(next)
                if (next) {
                  track({
                    name: 'meeting.hand_raised',
                    properties: { meeting_id: id },
                  })
                }
              }}
            />
            <ControlButton
              icon="fiber_manual_record"
              label={
                recording
                  ? t('meeting.stopRecording', {}, { defaultValue: 'Stop recording' })
                  : t('meeting.record', {}, { defaultValue: 'Record' })
              }
              active={recording}
              tone={recording ? 'recording' : undefined}
              onClick={() => {
                const next = !recording
                setRecording(next)
                track({
                  name: next ? 'meeting.recording_started' : 'meeting.recording_stopped',
                  properties: { meeting_id: id },
                })
              }}
            />
            <ControlButton
              icon="chat"
              label={t('meeting.chat', {}, { defaultValue: 'Chat' })}
              active={showChat}
              onClick={() => {
                setShowChat((v) => !v)
                setShowParticipants(false)
              }}
            />
            <ControlButton
              icon="people"
              label={t('meeting.participantsList', {}, { defaultValue: 'Participants' })}
              active={showParticipants}
              onClick={() => {
                setShowParticipants((v) => !v)
                setShowChat(false)
              }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={leaveMeeting}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 4),
            'sm:px-6',
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.roundedFull,
            'h-10 shrink-0 bg-error text-on-error hover:bg-error-active transition-colors shadow-lg shadow-error/40',
          )}
        >
          <span className="material-symbols-outlined">call_end</span>
          <span className="hidden sm:inline">
            {t('meeting.leave', {}, { defaultValue: 'Leave' })}
          </span>
        </button>
      </footer>
    </div>
  )
}

function ParticipantTile({ participant }: { participant: Participant }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        'relative aspect-video rounded-xl overflow-hidden bg-participant-tile',
        participant.is_speaking
          ? 'ring-[3px] ring-success'
          : participant.is_pinned
            ? 'ring-[3px] ring-primary'
            : '',
      )}
    >
      {participant.video_enabled ? (
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'absolute inset-0 bg-gradient-to-br from-primary/30 via-primary-dark/40 to-secondary/30',
          )}
        >
          <div
            className={
              'w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-surface/15 backdrop-blur-md flex items-center justify-center text-2xl sm:text-3xl font-bold'
            }
          >
            {participant.user_name.charAt(0)}
          </div>
        </div>
      ) : (
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'absolute inset-0')}>
          <div
            className={
              'w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-primary flex items-center justify-center text-2xl sm:text-3xl font-bold text-on-primary'
            }
          >
            {participant.user_name.charAt(0)}
          </div>
        </div>
      )}
      <div
        className={
          'absolute bottom-2 left-2 px-2 py-1 text-xs font-semibold rounded bg-foreground/60 backdrop-blur-md flex items-center gap-2'
        }
      >
        {!participant.audio_enabled && (
          <span className={'material-symbols-outlined text-sm text-error'}>mic_off</span>
        )}
        {participant.user_name}
      </div>
      {participant.hand_raised && (
        <div
          className={
            'absolute top-2 right-2 w-7 h-7 rounded-full bg-warning text-foreground flex items-center justify-center shadow-lg'
          }
        >
          <span className={'material-symbols-outlined text-base'}>pan_tool</span>
        </div>
      )}
    </div>
  )
}

function ControlButton({
  icon,
  label,
  active,
  tone,
  onClick,
}: {
  icon: string
  label: string
  active: boolean
  tone?: 'recording'
  onClick: () => void
}) {
  const cm = getClassMap()
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        'w-12 h-12 shrink-0 rounded-full transition-all',
        tone === 'recording' && active
          ? 'bg-error text-on-error shadow-lg shadow-error/40'
          : active
            ? 'bg-surface/25 text-white'
            : 'bg-surface/10 text-white hover:bg-surface/20',
      )}
    >
      <span className={cm.cn('material-symbols-outlined text-xl')}>{icon}</span>
    </button>
  )
}
