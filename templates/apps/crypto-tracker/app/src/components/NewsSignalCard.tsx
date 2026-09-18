/**
 * Editorial news card — uppercase source/timestamp eyebrow, lg-bold headline,
 * muted summary, signal pill (`bullish` gold-green, `bearish` rose, `neutral`
 * outline) with the matching Material Symbol on the left, and a row of
 * related-symbol chips along the bottom.
 *
 * Translated from blog/ArticleListItem.tsx (editorial typography stack) and
 * personal-finance/ActivityRow.tsx (left-icon + label + meta line).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type NewsSignal = 'bullish' | 'bearish' | 'neutral'

export interface NewsSignalCardData {
  id: string
  title: string
  source: string
  url: string
  summary: string
  published_at: string
  related_symbols: string[]
  signal: NewsSignal
}

const SIGNAL_PILL: Record<NewsSignal, { bg: string; icon: string }> = {
  bullish: { bg: 'bg-success/15 text-success', icon: 'trending_up' },
  bearish: { bg: 'bg-error/15 text-error', icon: 'trending_down' },
  neutral: { bg: 'bg-surface-container text-on-surface-variant', icon: 'radio_button_unchecked' },
}

const SIGNAL_LABEL_FALLBACK: Record<NewsSignal, string> = {
  bullish: 'Bullish',
  bearish: 'Bearish',
  neutral: 'Neutral',
}

function fmtAge(iso: string, t: ReturnType<typeof useTranslation>['t']): string {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3_600_000)
  if (h < 1) return t('newsSignalCard.age.justNow', {}, { defaultValue: 'just now' })
  if (h < 24)
    return t('newsSignalCard.age.hoursAgo', { hours: h }, { defaultValue: '{{hours}}h ago' })
  const d = Math.floor(h / 24)
  if (d < 7) return t('newsSignalCard.age.daysAgo', { days: d }, { defaultValue: '{{days}}d ago' })
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function NewsSignalCard({ item }: { item: NewsSignalCardData }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pill = SIGNAL_PILL[item.signal]
  return (
    <article
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
      )}
      data-mol-id={`news-card-${item.id}`}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.sp('mb', 3),
          'flex-wrap',
        )}
      >
        <span
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {item.source}
          <span className={cm.cn(cm.sp('mx', 2), 'opacity-60')}>·</span>
          {fmtAge(item.published_at, t)}
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            cm.roundedFull,
            'py-0.5 text-[10px] font-black uppercase tracking-widest',
            pill.bg,
          )}
          data-mol-id={`news-signal-${item.signal}`}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>{pill.icon}</span>
          {t(
            `newsSignalCard.signal.${item.signal}`,
            {},
            { defaultValue: SIGNAL_LABEL_FALLBACK[item.signal] },
          )}
        </span>
      </header>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          'leading-snug text-on-surface hover:text-primary transition-colors',
        )}
      >
        {item.title}
      </a>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.sp('mt', 2),
          'leading-relaxed text-on-surface-variant',
        )}
      >
        {item.summary}
      </p>
      {item.related_symbols.length > 0 ? (
        <div className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mt', 4), 'flex-wrap')}>
          {item.related_symbols.map((sym) => (
            <span
              key={sym}
              className={cm.cn(
                cm.sp('px', 2),
                cm.roundedFull,
                'py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest bg-primary-container text-on-primary-container',
              )}
            >
              {sym}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}
