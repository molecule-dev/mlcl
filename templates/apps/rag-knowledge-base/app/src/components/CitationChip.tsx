import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CitationChipProps {
  /** Numeric badge shown inside the chip (1-based by convention). */
  index: number
  /** Source document title \u2014 shown in the hover preview header. */
  title: string
  /** Section / page reference, e.g. "Section 3, \u00b62". */
  reference?: string
  /** Excerpt revealed on hover. */
  excerpt: string
  /** Optional click target (e.g. document detail link). */
  onClick?: () => void
}

/**
 * Inline citation chip \u2014 numbered pill that reveals the source title and
 * matched excerpt on hover. The badge uses cited-purple per DESIGN.md
 * "Citation pill" spec; the hover panel is a frosted-glass tooltip with a
 * subtle drop shadow.
 *
 * Translated from ai-document-processor's DocumentTypeBadge + Parcela hover-panel
 * pattern, adapted for Engram's inline-citation interaction.
 */
export function CitationChip({ index, title, reference, excerpt, onClick }: CitationChipProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <span className={cm.cn('relative inline-block')}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={t(
          'citationChip.aria',
          { index, title },
          { defaultValue: `Citation ${index}: ${title}` },
        )}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'inline-flex align-baseline tabular-nums rounded-full font-bold transition-colors',
        )}
        style={{
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary-dark)',
          minWidth: 22,
          height: 20,
          fontSize: 11,
          padding: '0 7px',
          marginLeft: 2,
          marginRight: 2,
        }}
      >
        {index}
      </button>
      {open ? (
        <span
          role="tooltip"
          className={cm.cn(
            cm.sp('p', 4),
            cm.flex({ direction: 'col', gap: 'xs' }),
            'absolute z-30 w-72 rounded-xl bg-surface-container-lowest shadow-2xl shadow-primary/20 border border-outline-variant/40 left-0 top-6 text-left pointer-events-none',
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              'font-bold uppercase tracking-widest text-primary',
            )}
            style={{ fontSize: 10 }}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontSize: 14 }}
              aria-hidden="true"
            >
              format_quote
            </span>
            {t('citationChip.label', { index }, { defaultValue: `Source ${index}` })}
          </span>
          <span className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface line-clamp-1')}>
            {title}
          </span>
          {reference ? (
            <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
              {reference}
            </span>
          ) : null}
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant leading-relaxed line-clamp-3',
            )}
          >
            {excerpt}
          </span>
        </span>
      ) : null}
    </span>
  )
}
