import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { unwrapSingle } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface MidiNote {
  id: string
  pitch: number
  velocity: number
  start: number | string
  duration: number | string
}

const KEY_LABELS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const TOTAL_OCTAVES = 3
const START_OCTAVE = 3
const STEPS_PER_BAR = 16
const BARS = 4
const LANE_COLOR = '#8b5cf6'

export function PianoRoll() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id, clipId } = useParams<{ id: string; clipId: string }>()
  const http = useHttpClient()
  const [clipMissing, setClipMissing] = useState(false)
  const [notes, setNotes] = useState<MidiNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const totalKeys = TOTAL_OCTAVES * 12
  const minPitch = START_OCTAVE * 12
  const maxPitch = minPitch + totalKeys
  const totalSteps = BARS * STEPS_PER_BAR

  const keyHeight = 24
  const stepWidth = 100 / totalSteps

  useEffect(() => {
    if (!clipId) return
    let cancelled = false
    setLoading(true)
    setClipMissing(false)
    http
      .get<unknown>(`/api/clips/${clipId}`)
      .then((res) => {
        if (cancelled) return
        const clip = unwrapSingle<{ midi_notes?: MidiNote[] }>(res.data)
        const list = clip?.midi_notes ?? []
        setNotes(
          list.map((n) => ({
            ...n,
            start: typeof n.start === 'string' ? parseFloat(n.start) : n.start,
            duration: typeof n.duration === 'string' ? parseFloat(n.duration) : n.duration,
          })),
        )
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setClipMissing(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [http, clipId])

  const handleAddNote = async (pitch: number, startBeat: number) => {
    if (!clipId || busy || clipMissing) return
    setBusy(true)
    setError(null)
    try {
      const res = await http.post<unknown>('/api/midi-notes', {
        clip_id: clipId,
        pitch,
        velocity: 100,
        start: startBeat,
        duration: 0.5,
      })
      const created = unwrapSingle<MidiNote>(res.data)
      if (created && created.id) {
        setNotes((prev) => [
          ...prev,
          {
            ...created,
            start: typeof created.start === 'string' ? parseFloat(created.start) : created.start,
            duration:
              typeof created.duration === 'string'
                ? parseFloat(created.duration)
                : created.duration,
          },
        ])
      }
    } catch (error) {
      setError(t('pianoRoll.addFailed', {}, { defaultValue: 'Failed to add note.' }))
      logError('pianoRoll.addNote', error)
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await http.delete(`/api/midi-notes/${noteId}`)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch (error) {
      setError(t('pianoRoll.deleteFailed', {}, { defaultValue: 'Failed to delete note.' }))
      logError('pianoRoll.deleteNote', error)
    } finally {
      setBusy(false)
    }
  }

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clipId || busy || clipMissing) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const col = Math.floor((x / rect.width) * totalSteps)
    const row = Math.floor(y / keyHeight)
    if (col < 0 || col >= totalSteps || row < 0 || row >= totalKeys) return
    const pitch = maxPitch - 1 - row
    const startBeat = (col / totalSteps) * BARS
    void handleAddNote(pitch, startBeat)
  }

  if (clipMissing && !loading) {
    return (
      <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), 'space-y-4')}>
        <Link
          to={`/projects/${id ?? ''}`}
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('pianoRoll.backLink', {}, { defaultValue: 'Arrangement' })}
        </Link>
        <p
          role="alert"
          className={cm.cn(
            'text-sm text-on-error-container bg-error-container px-3 py-2 rounded-lg',
          )}
        >
          {t(
            'pianoRoll.clipMissing',
            {},
            {
              defaultValue:
                'No MIDI clip found at this location. Open the arrangement and create a MIDI clip first.',
            },
          )}
        </p>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 6), 'space-y-6')}>
      <header className={cm.cn('flex items-center gap-4 flex-wrap')}>
        <Link
          to={`/projects/${id ?? ''}`}
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface flex items-center gap-1',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('pianoRoll.backLink', {}, { defaultValue: 'Arrangement' })}
        </Link>
        <h1
          className={cm.cn(
            'text-2xl font-extrabold tracking-tight text-on-surface flex-1 min-w-0 truncate',
          )}
        >
          {t(
            'pianoRoll.title',
            { count: notes.length },
            { defaultValue: 'Piano roll · {{count}} notes' },
          )}
        </h1>
        <div
          className={cm.cn(
            'flex items-center gap-2 text-[12px] font-mono tabular-nums text-on-surface-variant',
          )}
        >
          <span>
            {t('pianoRoll.barsLabel', { count: BARS }, { defaultValue: '{{count}} bars' })}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {t('pianoRoll.stepsLabel', { count: totalSteps }, { defaultValue: '{{count}} steps' })}
          </span>
          <span aria-hidden="true">·</span>
          <span>{t('pianoRoll.gridLabel', {}, { defaultValue: '1/16 grid' })}</span>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className={cm.cn(
            'text-sm text-on-error-container bg-error-container px-3 py-2 rounded-lg',
          )}
        >
          {error}
        </p>
      )}

      <div
        className={cm.cn('rounded-2xl border border-outline-variant overflow-hidden')}
        style={{ background: 'var(--daw-arrangement-bg)' }}
      >
        <div className={cm.cn('flex')} style={{ minHeight: `${totalKeys * keyHeight + 100}px` }}>
          <div className={cm.cn('w-12 shrink-0 border-r border-outline-variant/60')}>
            {Array.from({ length: totalKeys }, (_, i) => {
              const pitch = maxPitch - 1 - i
              const noteName = KEY_LABELS[pitch % 12]
              const isBlack = noteName.includes('#')
              const isC = noteName === 'C'
              return (
                <div
                  key={i}
                  className={cm.cn(
                    'flex items-center justify-end pr-2 text-[9px] font-mono tabular-nums border-b',
                  )}
                  style={{
                    height: `${keyHeight}px`,
                    backgroundColor: isBlack ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.04)',
                    color: isC ? LANE_COLOR : 'rgba(255,255,255,0.45)',
                    borderColor: 'rgba(255,255,255,0.05)',
                    fontWeight: isC ? 700 : 400,
                  }}
                >
                  {noteName}
                  {Math.floor(pitch / 12)}
                </div>
              )
            })}
          </div>

          <div
            className={cm.cn('flex-1 relative')}
            style={{ minHeight: `${totalKeys * keyHeight}px` }}
          >
            <div
              className={cm.cn('absolute inset-0 cursor-crosshair')}
              onClick={handleGridClick}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                if (!clipId || busy || clipMissing) return
                // Keyboard activation has no pointer position — drop a note at the middle pitch, beat 0.
                void handleAddNote(maxPitch - 1 - Math.floor(totalKeys / 2), 0)
              }}
              role="button"
              aria-label={t(
                'pianoRoll.gridAria',
                {},
                { defaultValue: 'Click to add a note at this position' },
              )}
              tabIndex={0}
            >
              {Array.from({ length: totalKeys }, (_, row) => {
                const pitch = maxPitch - 1 - row
                const isBlack = KEY_LABELS[pitch % 12].includes('#')
                return (
                  <div
                    key={row}
                    className={cm.cn('border-b')}
                    style={{
                      height: `${keyHeight}px`,
                      backgroundColor: isBlack ? 'rgba(255,255,255,0.025)' : 'transparent',
                      borderColor: 'rgba(255,255,255,0.04)',
                    }}
                    aria-hidden="true"
                  />
                )
              })}
            </div>
            <div className={cm.cn('absolute inset-0 pointer-events-none')}>
              {Array.from({ length: totalSteps + 1 }, (_, step) => (
                <span
                  key={step}
                  className={cm.cn('absolute top-0 bottom-0 w-px')}
                  style={{
                    left: `${step * stepWidth}%`,
                    backgroundColor:
                      step % STEPS_PER_BAR === 0
                        ? 'rgba(139,92,246,0.35)'
                        : step % 4 === 0
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(255,255,255,0.04)',
                  }}
                  aria-hidden="true"
                />
              ))}
            </div>
            {loading
              ? null
              : notes.map((note) => {
                  if (note.pitch < minPitch || note.pitch >= maxPitch) return null
                  const start = Number(note.start)
                  const dur = Math.max(0.05, Number(note.duration))
                  const top = (maxPitch - 1 - note.pitch) * keyHeight
                  const left = (start / BARS) * 100
                  const width = (dur / BARS) * 100
                  const v = (note.velocity ?? 100) / 127
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleDeleteNote(note.id)
                      }}
                      className={cm.cn('absolute rounded-sm border')}
                      style={{
                        top: `${top + 2}px`,
                        left: `${left}%`,
                        width: `${width}%`,
                        height: `${keyHeight - 4}px`,
                        backgroundColor: `${LANE_COLOR}${Math.round(v * 255)
                          .toString(16)
                          .padStart(2, '0')}`,
                        borderColor: 'rgba(255,255,255,0.6)',
                      }}
                      aria-label={t(
                        'pianoRoll.noteLabel',
                        { pitch: note.pitch, velocity: note.velocity },
                        {
                          defaultValue:
                            'Note pitch {{pitch}}, velocity {{velocity}} — click to delete.',
                        },
                      )}
                      title={t(
                        'pianoRoll.deleteHint',
                        {},
                        { defaultValue: 'Click to delete note' },
                      )}
                    />
                  )
                })}
          </div>
        </div>

        <div
          className={cm.cn('border-t border-outline-variant/60 px-3 py-2 relative')}
          style={{ height: '100px', background: 'rgba(0,0,0,0.4)' }}
        >
          <p
            className={cm.cn(
              'text-[9px] font-black uppercase tracking-widest text-on-surface-variant absolute top-1 left-3',
            )}
          >
            {t('pianoRoll.velocityLane', {}, { defaultValue: 'Velocity' })}
          </p>
          <div className={cm.cn('absolute inset-x-3 bottom-2 top-6 flex items-end gap-px')}>
            {notes.map((note) => (
              <div
                key={note.id}
                className={cm.cn('w-1 rounded-t-sm')}
                style={{
                  height: `${(Math.max(0, Math.min(127, note.velocity ?? 100)) / 127) * 100}%`,
                  backgroundColor: LANE_COLOR,
                  marginLeft: `${(Number(note.start) / BARS) * 100}%`,
                  position: 'absolute',
                  bottom: 0,
                }}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </div>

      <p className={cm.cn('text-[11px] text-on-surface-variant')}>
        {t(
          'pianoRoll.tip',
          {},
          {
            defaultValue:
              'Click anywhere on the grid to drop a 1/8-beat note. Click an existing note to delete it.',
          },
        )}
      </p>
    </div>
  )
}
