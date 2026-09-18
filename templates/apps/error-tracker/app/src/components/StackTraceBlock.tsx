import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Stack trace block — mono-13px / line-height 1.6 dark code surface with
 * collapsible vendor frames, highlightable app frames, line-number gutter,
 * and a "raw" toggle. Shape mirrors DESIGN.md "Stack Trace Block" exactly:
 * code-block bg, border-primary, gutter, app-vs-vendor frame distinction,
 * primary-tinted highlight on the focused frame.
 *
 * Translated from api-documentation's NotFound mono code-block JSON look
 * (mono pre + frame chrome) and scaled up to a multi-frame trace renderer.
 */

export type FrameKind = 'app' | 'vendor'

export interface StackFrame {
  filename: string
  function: string
  lineno: number
  colno?: number
  kind: FrameKind
  /** Inline pre-context for the highlighted frame, oldest first. */
  context_pre?: string[]
  /** Source line at lineno (the highlighted line). */
  context_line?: string
  /** Inline post-context, newest last. */
  context_post?: string[]
}

interface StackTraceBlockProps {
  frames: StackFrame[]
  /** Index of the frame to highlight (defaults to the deepest app frame). */
  highlightIndex?: number
  /** Optional exception type/message rendered above the frames. */
  exceptionType?: string
  exceptionValue?: string
}

export function StackTraceBlock({
  frames,
  highlightIndex,
  exceptionType,
  exceptionValue,
}: StackTraceBlockProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [showVendor, setShowVendor] = useState(false)

  const defaultHighlight = (() => {
    if (typeof highlightIndex === 'number') return highlightIndex
    const deepestApp = [...frames].reverse().findIndex((f) => f.kind === 'app')
    if (deepestApp === -1) return frames.length - 1
    return frames.length - 1 - deepestApp
  })()

  const visibleFrames = frames
    .map((f, idx) => ({ frame: f, idx }))
    .filter(({ frame, idx }) => showVendor || frame.kind === 'app' || idx === defaultHighlight)

  const hiddenVendorCount = frames.filter((f) => f.kind === 'vendor').length
  const showToggle = hiddenVendorCount > 0

  return (
    <div
      className={cm.cn('rounded-xl overflow-hidden')}
      style={{
        backgroundColor: 'var(--color-code-block)',
        border: '1px solid var(--color-border)',
      }}
      data-mol-id="stack-trace-block"
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'px-4 py-2.5 border-b',
        )}
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
      >
        <div className={cm.cn('flex items-center gap-2 min-w-0')}>
          <span
            className={cm.cn('material-symbols-outlined text-base shrink-0')}
            style={{ color: 'var(--color-text-code)' }}
            aria-hidden="true"
          >
            stacks
          </span>
          {exceptionType ? (
            <p
              className={cm.cn('font-mono text-xs font-bold truncate')}
              style={{ color: 'var(--color-severity-critical)' }}
            >
              {exceptionType}
              {exceptionValue ? (
                <>
                  <span className={cm.cn('mx-1.5 opacity-50')}>·</span>
                  <span className={cm.cn('font-medium')} style={{ color: 'var(--color-text)' }}>
                    {exceptionValue}
                  </span>
                </>
              ) : null}
            </p>
          ) : (
            <p
              className={cm.cn('font-mono text-xs font-bold')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('stackTrace.title', {}, { defaultValue: 'Stack trace' })}
            </p>
          )}
        </div>
        {showToggle ? (
          <button
            type="button"
            onClick={() => setShowVendor((v) => !v)}
            className={cm.cn(
              'font-mono text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-colors hover:opacity-80',
            )}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-info) 10%, transparent)',
              color: 'var(--color-text-code)',
              border: '1px solid color-mix(in srgb, var(--color-info) 30%, transparent)',
            }}
          >
            {showVendor
              ? t('stackTrace.hideVendor', {}, { defaultValue: 'Hide vendor' })
              : t(
                  'stackTrace.showVendor',
                  { count: hiddenVendorCount },
                  { defaultValue: 'Show {{count}} vendor' },
                )}
          </button>
        ) : null}
      </header>

      <ol className={cm.cn('divide-y')} style={{ borderColor: 'var(--color-border-subtle)' }}>
        {visibleFrames.map(({ frame, idx }) => {
          const highlighted = idx === defaultHighlight
          const isApp = frame.kind === 'app'
          return (
            <li
              key={idx}
              className={cm.cn('relative')}
              style={{
                backgroundColor: highlighted
                  ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
                  : 'transparent',
                borderLeft: highlighted
                  ? '2px solid var(--color-primary)'
                  : '2px solid transparent',
              }}
            >
              <div className={cm.cn('flex items-baseline gap-3 px-4 py-2.5')}>
                <span
                  className={cm.cn(
                    'font-mono text-[11px] font-medium tabular-nums shrink-0 w-12 text-right',
                  )}
                  style={{ color: 'var(--color-severity-muted)' }}
                  aria-hidden="true"
                >
                  {frame.lineno}
                </span>
                <div className={cm.cn('flex-1 min-w-0 font-mono text-[13px] leading-[1.6]')}>
                  <p
                    className={cm.cn('truncate')}
                    style={{ color: isApp ? 'var(--color-text)' : 'var(--color-severity-muted)' }}
                  >
                    <span
                      style={{
                        color: isApp ? 'var(--color-text-code)' : 'var(--color-text-tertiary)',
                      }}
                    >
                      in{' '}
                    </span>
                    <span className={cm.cn('font-semibold')}>{frame.function}</span>
                    <span className={cm.cn('mx-1.5 opacity-50')}>·</span>
                    <span
                      style={{
                        color: isApp ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
                      }}
                    >
                      {frame.filename}
                    </span>
                  </p>
                </div>
                {!isApp ? (
                  <span
                    className={cm.cn(
                      'font-mono text-[9px] font-black uppercase tracking-widest shrink-0 px-1.5 py-0.5 rounded',
                    )}
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--color-on-surface-variant) 12%, transparent)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {t('stackTrace.vendorBadge', {}, { defaultValue: 'vendor' })}
                  </span>
                ) : null}
              </div>

              {highlighted &&
              (frame.context_pre?.length || frame.context_line || frame.context_post?.length) ? (
                <pre
                  className={cm.cn(
                    'overflow-x-auto px-4 pb-3 pt-1 font-mono text-[12px] leading-[1.7]',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {frame.context_pre?.map((line, i) => {
                    const num = frame.lineno - frame.context_pre!.length + i
                    return (
                      <div key={`pre-${i}`} className={cm.cn('flex')}>
                        <span
                          className={cm.cn('w-12 text-right pr-3 shrink-0 tabular-nums')}
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {num}
                        </span>
                        <span className={cm.cn('opacity-70')}>{line}</span>
                      </div>
                    )
                  })}
                  {frame.context_line ? (
                    <div
                      className={cm.cn('flex')}
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
                      }}
                    >
                      <span
                        className={cm.cn('w-12 text-right pr-3 shrink-0 tabular-nums font-bold')}
                        style={{ color: 'var(--color-primary)' }}
                      >
                        {frame.lineno}
                      </span>
                      <span style={{ color: 'var(--color-text)' }}>{frame.context_line}</span>
                    </div>
                  ) : null}
                  {frame.context_post?.map((line, i) => (
                    <div key={`post-${i}`} className={cm.cn('flex')}>
                      <span
                        className={cm.cn('w-12 text-right pr-3 shrink-0 tabular-nums')}
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {frame.lineno + i + 1}
                      </span>
                      <span className={cm.cn('opacity-70')}>{line}</span>
                    </div>
                  ))}
                </pre>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
