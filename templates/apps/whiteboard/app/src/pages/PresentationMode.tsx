import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WhiteboardLayout } from '../components/WhiteboardLayout.js'

interface BoardRow {
  id: string
  title?: string
  background?: string | null
}

interface FrameRow {
  id: string
  board_id: string
  name?: string
  viewport?: unknown
  order_index?: number
}

interface FrameViewport {
  body?: string
  callout?: string
  background?: string
}

const PALETTES = ['#5b5bf7', '#00c4a8', '#a855f7', '#1e1e2e', '#f97316', '#ec4899', '#06b6d4']

function parseViewport(v: unknown): FrameViewport {
  if (!v) return {}
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as FrameViewport
    } catch (_error) {
      // invalid JSON falls back to an empty viewport
      return {}
    }
  }
  return v as FrameViewport
}

export function PresentationMode() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id = '' } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [board, setBoard] = useState<BoardRow | null>(null)
  const [frames, setFrames] = useState<FrameRow[]>([])
  const [frameIdx, setFrameIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBody, setNewBody] = useState('')

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [b, f] = await Promise.all([
        http.get<BoardRow>(`/api/boards/${id}`),
        http.get<FrameRow[]>(`/api/frames/${id}`),
      ])
      setBoard(b.data ?? null)
      setFrames(Array.isArray(f.data) ? f.data : [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [http, id])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleAddFrame = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!id || !newName.trim()) return
      setCreating(true)
      try {
        const accent = PALETTES[frames.length % PALETTES.length]!
        const res = await http.post<FrameRow>(`/api/frames/${id}`, {
          name: newName.trim(),
          viewport: { body: newBody.trim(), background: accent },
          order_index: frames.length,
        })
        if (res.data?.id) {
          setFrames((prev) => [...prev, res.data])
          setNewName('')
          setNewBody('')
          setShowAdd(false)
          setFrameIdx(frames.length)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setCreating(false)
      }
    },
    [frames.length, http, id, newBody, newName],
  )

  const current = frames[frameIdx] ?? null
  const vp = current ? parseViewport(current.viewport) : {}
  const accent = vp.background ?? PALETTES[frameIdx % PALETTES.length]!

  if (frames.length === 0) {
    return (
      <WhiteboardLayout
        eyebrow={
          board?.title
            ? t(
                'present.boardEyebrow',
                { title: board.title },
                { defaultValue: '{{title}} · presentation' },
              )
            : t('present.eyebrow', {}, { defaultValue: 'Presentation mode' })
        }
        title={t('present.title', {}, { defaultValue: 'Run your story' })}
        actions={
          <Link
            to={`/board/${id}`}
            data-mol-id="present-back"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'bg-surface-container text-on-surface rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors',
            )}
          >
            {t('present.exitToBoard', {}, { defaultValue: 'Back to canvas' })}
          </Link>
        }
      >
        <div className={cm.stack(4)}>
          {error && (
            <div
              role="alert"
              data-mol-id="present-error"
              className={cm.cn(
                cm.sp('p', 3),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-xl bg-error-container/40 text-on-error-container',
              )}
            >
              {error}
            </div>
          )}
          <div
            data-mol-id="present-empty"
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              cm.stack(3),
              'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40 text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[40px] text-primary')}>
              slideshow
            </span>
            <p className={cm.cn(cm.fontWeight('semibold'))}>
              {t('present.empty.title', {}, { defaultValue: 'No frames yet' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'))}>
              {t(
                'present.empty.body',
                {},
                {
                  defaultValue:
                    'Add presentation frames to walk your team through this board step by step.',
                },
              )}
            </p>
            <button
              type="button"
              data-mol-id="present-add-first"
              onClick={() => setShowAdd(true)}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                'self-center bg-primary text-white rounded-xl text-sm',
              )}
            >
              {t('present.addFirst', {}, { defaultValue: 'Add first frame' })}
            </button>
          </div>
          {showAdd && (
            <form
              onSubmit={handleAddFrame}
              data-mol-id="present-add-form"
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30',
              )}
            >
              <input
                required
                type="text"
                placeholder={
                  t('present.frameName', {}, { defaultValue: 'Frame name' }) ?? 'Frame name'
                }
                data-mol-id="present-frame-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-low',
                )}
              />
              <textarea
                rows={3}
                placeholder={
                  t('present.frameBody', {}, { defaultValue: 'Talking points' }) ?? 'Talking points'
                }
                data-mol-id="present-frame-body"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-xl border border-outline-variant/40 bg-surface-container-low',
                )}
              />
              <button
                type="submit"
                disabled={creating}
                data-mol-id="present-frame-submit"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  'bg-primary text-white rounded-xl disabled:opacity-60',
                )}
              >
                {creating
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('present.save', {}, { defaultValue: 'Save frame' })}
              </button>
            </form>
          )}
        </div>
      </WhiteboardLayout>
    )
  }

  return (
    <WhiteboardLayout variant="fullscreen">
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'min-h-screen text-white relative overflow-hidden',
        )}
        style={{ background: `linear-gradient(135deg, ${accent} 0%, #0c0c1d 110%)` }}
      >
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 8),
            cm.sp('py', 5),
            'relative z-10',
          )}
        >
          <Link
            to={`/board/${id}`}
            data-mol-id="present-exit"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-white/80 hover:text-white transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_back</span>
            {t('present.exit', {}, { defaultValue: 'Exit presentation' })}
          </Link>
          <span
            data-mol-id="present-status"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest bg-surface/15 backdrop-blur-md',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')}>
              radio_button_checked
            </span>
            {board?.title ??
              t('present.recordingFallback', {}, { defaultValue: 'Live presenting' })}
          </span>
          <button
            type="button"
            data-mol-id="present-add-toggle"
            onClick={() => setShowAdd((s) => !s)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'rounded-full bg-surface/15 backdrop-blur-md',
            )}
          >
            {t('present.addFrame', {}, { defaultValue: '+ Add frame' })}
          </button>
        </header>

        <section
          data-mol-id="present-frame"
          className={cm.cn(
            cm.flex1,
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.sp('px', 12),
            cm.sp('py', 16),
            cm.stack(8),
            'relative z-10 text-center',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest bg-surface/15 backdrop-blur-md',
            )}
          >
            {t(
              'present.frameOf',
              { current: frameIdx + 1, total: frames.length },
              { defaultValue: 'Frame {{current}} of {{total}}' },
            )}
          </span>
          <h1
            className={cm.cn(
              'text-6xl md:text-7xl font-extrabold tracking-tighter leading-[0.95] max-w-4xl',
            )}
          >
            {current?.name ?? t('present.unnamed', {}, { defaultValue: 'Untitled frame' })}
          </h1>
          {vp.body && (
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('medium'),
                cm.maxW('xl'),
                'text-white/85 leading-relaxed',
              )}
            >
              {vp.body}
            </p>
          )}
          {vp.callout && (
            <span
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'text-base uppercase tracking-widest rounded-full bg-surface/15 backdrop-blur-md border border-surface/20',
              )}
            >
              {vp.callout}
            </span>
          )}
        </section>

        {showAdd && (
          <form
            onSubmit={handleAddFrame}
            data-mol-id="present-add-form"
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(3),
              'relative z-10 max-w-xl mx-auto bg-surface/10 backdrop-blur-md rounded-2xl border border-surface/20 mb-6',
            )}
          >
            <input
              required
              type="text"
              placeholder={
                t('present.frameName', {}, { defaultValue: 'Frame name' }) ?? 'Frame name'
              }
              data-mol-id="present-frame-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-surface/90 text-on-surface',
              )}
            />
            <textarea
              rows={3}
              placeholder={
                t('present.frameBody', {}, { defaultValue: 'Talking points' }) ?? 'Talking points'
              }
              data-mol-id="present-frame-body"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-surface/90 text-on-surface',
              )}
            />
            <button
              type="submit"
              disabled={creating}
              data-mol-id="present-frame-submit"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'bg-surface text-on-surface rounded-xl disabled:opacity-60',
              )}
            >
              {creating
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('present.save', {}, { defaultValue: 'Save frame' })}
            </button>
          </form>
        )}

        <footer
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 8),
            cm.sp('py', 6),
            'relative z-10 border-t border-surface/15 bg-foreground/20 backdrop-blur-md',
          )}
        >
          <button
            type="button"
            data-mol-id="present-prev"
            onClick={() => setFrameIdx((f) => Math.max(0, f - 1))}
            disabled={frameIdx === 0}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-xl bg-surface/10 backdrop-blur-md disabled:opacity-40',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_back</span>
            {t('present.prev', {}, { defaultValue: 'Previous' })}
          </button>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            {frames.map((f, idx) => (
              <button
                key={f.id}
                type="button"
                data-mol-id={`present-dot-${idx}`}
                onClick={() => setFrameIdx(idx)}
                aria-label={
                  t(
                    'present.gotoFrame',
                    { idx: idx + 1 },
                    { defaultValue: 'Go to frame {{idx}}' },
                  ) ?? `Go to frame ${idx + 1}`
                }
                className={cm.cn(
                  cm.h(2),
                  'rounded-full',
                  idx === frameIdx ? 'w-10 bg-surface' : 'w-3 bg-surface/30',
                )}
              ></button>
            ))}
          </div>
          <button
            type="button"
            data-mol-id="present-next"
            onClick={() => setFrameIdx((f) => Math.min(frames.length - 1, f + 1))}
            disabled={frameIdx === frames.length - 1}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-xl bg-surface text-on-surface disabled:opacity-40 hover:scale-[1.02] transition-transform',
            )}
          >
            {t('present.next', {}, { defaultValue: 'Next frame' })}
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_forward</span>
          </button>
        </footer>
        {loading && null}
      </div>
    </WhiteboardLayout>
  )
}

export default PresentationMode
