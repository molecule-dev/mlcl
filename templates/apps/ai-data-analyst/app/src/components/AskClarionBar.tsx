/**
 * Signature query bar — gradient frosted shell with a glowing focus ring,
 * sparkle prefix glyph, JetBrains-Mono input, frosted submit pill, and a
 * row of suggestion chips below.
 *
 * Translated from team-chat/ChatInputArea.tsx (frosted bar + gradient
 * border) and ai-chatbot-builder/TestChatInputArea.tsx (sparkle prefix +
 * suggestion chips). Becomes the visual signature of QueryEditor.
 */
import { useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export interface AskClarionBarProps {
  /** Initial input value (controlled when `onChange` is provided). */
  value?: string
  /** Suggested questions rendered as chips below the bar. */
  suggestions?: readonly string[]
  /** Loading state — disables submit + shows shimmer. */
  loading?: boolean
  /** Submit handler. */
  onSubmit: (question: string) => void
}

export function AskClarionBar({
  value = '',
  suggestions = [],
  loading = false,
  onSubmit,
}: AskClarionBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [internal, setInternal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const current = internal

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Prefer the live DOM value so direct .value writes (form-fillers,
    // password managers, the behavioural verifier) submit reliably even
    // before the controlled React state has propagated.
    const rawValue = inputRef.current?.value ?? internal
    const trimmed = rawValue.trim()
    if (!trimmed) return
    setInternal(trimmed)
    onSubmit(trimmed)
  }

  function pickSuggestion(q: string) {
    setInternal(q)
    onSubmit(q)
  }

  return (
    <section className={cm.flex({ direction: 'col', gap: 4 })}>
      <form
        onSubmit={handleSubmit}
        className={
          'relative rounded-2xl p-[2px] bg-gradient-to-br from-primary via-primary-container to-secondary shadow-[0_18px_40px_rgba(53,37,205,0.15)]'
        }
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            'rounded-[14px] bg-surface-container-lowest',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-sm flex-shrink-0',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}>
              auto_awesome
            </span>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={current}
            onChange={(e) => setInternal(e.target.value)}
            placeholder={t(
              'askClarionBar.placeholder',
              {},
              {
                defaultValue:
                  'Ask a question about your data — e.g. “top 10 customers by Q3 revenue”',
              },
            )}
            className={cm.cn(
              cm.textSize('base'),
              'flex-1 bg-transparent border-0 font-mono text-on-surface placeholder:text-on-surface-variant focus:outline-none',
            )}
            aria-label={t(
              'askClarionBar.ariaLabel',
              { appName: APP_NAME },
              { defaultValue: 'Ask {{appName}} a question' },
            )}
          />
          <button
            type="submit"
            disabled={loading}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex-shrink-0',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
              aria-hidden="true"
            >
              {loading ? 'progress_activity' : 'arrow_forward'}
            </span>
            <span className={'hidden sm:inline'}>
              {loading
                ? t('askClarionBar.thinking', {}, { defaultValue: 'Thinking…' })
                : t('askClarionBar.askCta', {}, { defaultValue: 'Ask' })}
            </span>
          </button>
        </div>
      </form>

      {suggestions.length > 0 ? (
        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 2 }), cm.sp('px', 1))}>
          <span
            className={cm.cn(
              'text-[10px] uppercase tracking-widest font-black text-on-surface-variant self-center',
              cm.sp('mr', 2),
            )}
          >
            {t('askClarionBar.suggestionsLabel', {}, { defaultValue: 'Try' })}
          </span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={loading}
              onClick={() => pickSuggestion(s)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                cm.roundedFull,
                'bg-surface-container-low text-on-surface-variant border border-outline-variant/50 hover:bg-surface-container-high hover:text-on-surface hover:border-primary/40 transition-colors disabled:opacity-50',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('xs'), 'text-secondary')}
                aria-hidden="true"
              >
                auto_awesome
              </span>
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default AskClarionBar
