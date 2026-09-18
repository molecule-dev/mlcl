import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type VersoEditorBlock =
  | { kind: 'h1'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'callout'; tone: 'info' | 'success' | 'warning'; icon: string; text: string }
  | { kind: 'list'; items: ReadonlyArray<string> }
  | { kind: 'todo'; items: ReadonlyArray<{ text: string; done: boolean }> }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; lang: string; text: string }

interface VersoEditorCanvasProps {
  /** Document title — rendered as the page H1. */
  title: string
  /** Cover icon — Material Symbol name. */
  icon?: string
  /** Notebook breadcrumb segments (root → leaf). */
  breadcrumbs?: ReadonlyArray<string>
  /** Tag chips shown under the title. */
  tags?: ReadonlyArray<string>
  /** Last-updated label. */
  updatedAtLabel?: string
  /** Word count. */
  wordCount?: number
  /** Block list rendered as the editor canvas. */
  blocks: ReadonlyArray<VersoEditorBlock>
  /** Right rail content (backlinks, outline). */
  rightRail?: ReactNode
}

/**
 * Verso's signature page — editorial reading column over a soft surface,
 * Georgia headings, breadcrumb above the title, tag chips below, and a
 * polished block renderer (h1/h2/p/callout/list/todo/quote/code).
 *
 * Translated from blog/ArticleHero (editorial column, max-w 720) and
 * the personal-finance/AccountRecentTransactions side-rail. Holds the
 * detail-page typography rhythm so individual notes feel like longform
 * not configuration.
 */
export function VersoEditorCanvas({
  title,
  icon = 'description',
  breadcrumbs = [],
  tags = [],
  updatedAtLabel,
  wordCount,
  blocks,
  rightRail,
}: VersoEditorCanvasProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.flex({ direction: 'row' }), 'min-h-full')}>
      <div className={cm.cn(cm.flex1, 'min-w-0 px-6 py-10 lg:px-12 lg:py-14 bg-background')}>
        <article className={cm.cn('mx-auto w-full max-w-[720px]')}>
          {breadcrumbs.length > 0 ? (
            <nav
              className={cm.cn(
                cm.flex({ align: 'center', wrap: 'wrap' }),
                'gap-1 text-[12px] text-on-surface-variant font-medium mb-6',
              )}
            >
              {breadcrumbs.map((crumb, idx) => (
                <span key={`${crumb}-${idx}`} className={cm.flex({ align: 'center', gap: 'xs' })}>
                  {idx > 0 ? (
                    <span className={cm.cn('text-on-surface-variant/40')} aria-hidden="true">
                      /
                    </span>
                  ) : null}
                  <span
                    className={
                      idx === breadcrumbs.length - 1 ? 'text-on-surface font-semibold' : ''
                    }
                  >
                    {crumb}
                  </span>
                </span>
              ))}
            </nav>
          ) : null}

          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={cm.cn(
                cm.w(12),
                cm.h(12),
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-xl bg-primary/10 text-primary',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[28px]')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                {icon}
              </span>
            </span>
            {updatedAtLabel ? (
              <span
                className={cm.cn(
                  'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant',
                )}
              >
                {t('versoEditorCanvas.updated', {}, { defaultValue: 'Updated' })} · {updatedAtLabel}
              </span>
            ) : null}
          </div>

          <h1
            className={cm.cn(
              'mt-4 text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] text-on-surface',
            )}
            style={{
              fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
            }}
          >
            {title}
          </h1>

          {tags.length > 0 || (wordCount ?? 0) > 0 ? (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', wrap: 'wrap' }),
                'gap-2 mt-4 text-[12px] text-on-surface-variant',
              )}
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={cm.cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary',
                  )}
                >
                  #{tag}
                </span>
              ))}
              {wordCount && wordCount > 0 ? (
                <span className={cm.cn('inline-flex items-center gap-1 font-semibold ml-1')}>
                  <span
                    className={cm.cn('material-symbols-outlined text-[14px]')}
                    aria-hidden="true"
                  >
                    edit_note
                  </span>
                  {t(
                    'common.countWords',
                    { count: wordCount },
                    { defaultValue: '{{count}} words' },
                  )}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className={cm.cn('mt-10 space-y-5')}>
            {blocks.map((block, idx) => (
              <BlockView key={idx} block={block} />
            ))}
          </div>
        </article>
      </div>

      {rightRail ? (
        <aside
          className={cm.cn(
            'hidden xl:block w-80 shrink-0 border-l border-outline-variant/40 px-6 py-10 bg-surface-container-low/30',
          )}
        >
          {rightRail}
        </aside>
      ) : null}
    </div>
  )
}

function BlockView({ block }: { block: VersoEditorBlock }) {
  const cm = getClassMap()
  switch (block.kind) {
    case 'h1':
      return (
        <h2
          className={cm.cn(
            'text-3xl font-extrabold tracking-tight leading-tight text-on-surface mt-8',
          )}
          style={{
            fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
          }}
        >
          {block.text}
        </h2>
      )
    case 'h2':
      return (
        <h3
          className={cm.cn('text-2xl font-bold tracking-tight leading-snug text-on-surface mt-6')}
          style={{
            fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
          }}
        >
          {block.text}
        </h3>
      )
    case 'p':
      return (
        <p
          className={cm.cn('text-[17px] leading-[1.7] text-on-surface')}
          style={{
            fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
          }}
        >
          {block.text}
        </p>
      )
    case 'callout': {
      const tone =
        block.tone === 'success'
          ? 'bg-emerald-500/10 text-success border-emerald-500/30'
          : block.tone === 'warning'
            ? 'bg-amber-500/10 text-warning border-amber-500/30'
            : 'bg-primary/8 text-primary border-primary/30'
      return (
        <div className={cm.cn(cm.sp('p', 4), 'rounded-xl border flex items-start gap-3', tone)}>
          <span
            className={cm.cn('material-symbols-outlined text-[20px] mt-0.5')}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            {block.icon}
          </span>
          <span className={cm.cn('text-[15px] leading-relaxed font-medium')}>{block.text}</span>
        </div>
      )
    }
    case 'list':
      return (
        <ul
          className={cm.cn(
            'list-disc pl-6 space-y-2 text-[16px] text-on-surface marker:text-primary',
          )}
          style={{
            fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
          }}
        >
          {block.items.map((item, idx) => (
            <li key={idx} className={cm.cn('leading-relaxed')}>
              {item}
            </li>
          ))}
        </ul>
      )
    case 'todo':
      return (
        <ul className={cm.cn('space-y-2.5')}>
          {block.items.map((item, idx) => (
            <li key={idx} className={cm.cn('flex items-start gap-3 text-[15px]')}>
              <span
                className={cm.cn(
                  'shrink-0 w-5 h-5 rounded-md border flex items-center justify-center text-[12px]',
                  item.done
                    ? 'bg-primary border-primary text-on-primary'
                    : 'border-outline-variant text-transparent',
                )}
                aria-hidden="true"
              >
                ✓
              </span>
              <span
                className={cm.cn(
                  'leading-relaxed',
                  item.done && 'line-through text-on-surface-variant',
                )}
              >
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      )
    case 'quote':
      return (
        <blockquote
          className={cm.cn(
            'border-l-4 border-primary pl-5 italic text-on-surface-variant leading-relaxed text-[17px]',
          )}
          style={{
            fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
          }}
        >
          {block.text}
        </blockquote>
      )
    case 'code':
      return (
        <pre
          className={cm.cn(
            'p-4 rounded-xl bg-surface-container text-[13px] leading-relaxed overflow-x-auto',
          )}
          style={{
            fontFamily: '"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          <code className={cm.cn('text-on-surface')}>{block.text}</code>
        </pre>
      )
    default:
      return null
  }
}

export default VersoEditorCanvas
