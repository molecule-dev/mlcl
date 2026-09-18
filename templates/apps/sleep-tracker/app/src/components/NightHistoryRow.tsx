import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { SleepQuality } from './SleepScoreHeroCard.js'

/**
 * Editorial night-history row — quality-coloured leading stripe, tabular
 * date eyebrow, large duration in the middle, mini stage-share bar on the
 * right. Hover lift.
 *
 * Translated from mental-health-journal/JournalEntryCard.tsx (eyebrow +
 * leading stripe + tag pills) and personal-finance/AccountRecentTransactions
 * row pattern. Stage-share visual encodes deep/light/rem/awake proportions
 * per DESIGN.md "Sleep Stage Bar" mini variant.
 */

const QUALITY_PALETTE: Record<
  SleepQuality,
  { dot: string; border: string; pill: string; pillText: string; label: string }
> = {
  excellent: {
    dot: 'var(--color-quality-excellent-dot)',
    border: 'var(--color-quality-excellent-dot)',
    pill: 'var(--color-quality-excellent-pill)',
    pillText: 'var(--color-quality-excellent-text)',
    label: 'Excellent',
  },
  good: {
    dot: 'var(--color-quality-good-dot)',
    border: 'var(--color-quality-good-dot)',
    pill: 'var(--color-quality-good-pill)',
    pillText: 'var(--color-quality-good-text)',
    label: 'Good',
  },
  fair: {
    dot: 'var(--color-quality-fair-dot)',
    border: 'var(--color-quality-fair-dot)',
    pill: 'var(--color-quality-fair-pill)',
    pillText: 'var(--color-quality-fair-text)',
    label: 'Fair',
  },
  poor: {
    dot: 'var(--color-quality-poor-dot)',
    border: 'var(--color-quality-poor-dot)',
    pill: 'var(--color-quality-poor-pill)',
    pillText: 'var(--color-quality-poor-text)',
    label: 'Poor',
  },
}

interface NightHistoryRowProps {
  id: string
  date: string
  bedtime: string
  wakeTime: string
  durationMinutes: number
  score: number
  quality: SleepQuality
  stageShares: { deep: number; light: number; rem: number; awake: number }
  notes?: string
}

function formatDuration(minutes: number): { hours: number; mins: number } {
  return { hours: Math.floor(minutes / 60), mins: minutes % 60 }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (_error) {
    // invalid date string — return raw value as fallback
    return iso
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  } catch (_error) {
    // invalid date string — return raw value as fallback
    return iso
  }
}

const STAGE_COLORS = {
  deep: 'var(--color-stage-deep)',
  light: 'var(--color-stage-light)',
  rem: 'var(--color-stage-rem)',
  awake: 'var(--color-stage-awake)',
}

export function NightHistoryRow({
  id,
  date,
  bedtime,
  wakeTime,
  durationMinutes,
  score,
  quality,
  stageShares,
  notes,
}: NightHistoryRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const palette = QUALITY_PALETTE[quality]
  const { hours, mins } = formatDuration(durationMinutes)

  const total = Math.max(
    0.0001,
    stageShares.deep + stageShares.light + stageShares.rem + stageShares.awake,
  )
  const widths = {
    deep: (stageShares.deep / total) * 100,
    light: (stageShares.light / total) * 100,
    rem: (stageShares.rem / total) * 100,
    awake: (stageShares.awake / total) * 100,
  }

  return (
    <Link
      to={`/night/${encodeURIComponent(date)}`}
      aria-label={t('nightHistoryRow.aria', { date, id }, { defaultValue: 'Night of {{date}}' })}
      className={cm.cn(
        cm.sp('p', 5),
        'block bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border-l-4 group',
      )}
      style={{ borderLeftColor: palette.border }}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('mb', 3),
          'flex-wrap gap-3',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
          <span
            className={cm.cn('rounded-full')}
            aria-hidden="true"
            style={{ width: 10, height: 10, backgroundColor: palette.dot }}
          />
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {formatDate(date)}
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'text-on-surface-variant whitespace-nowrap',
            )}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatTime(bedtime)} → {formatTime(wakeTime)}
          </span>
        </div>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.fontWeight('bold'),
            'text-[10px] py-1 rounded-full uppercase tracking-widest whitespace-nowrap',
          )}
          style={{ backgroundColor: palette.pill, color: palette.pillText }}
        >
          {t(`nightHistoryRow.quality.${quality}`, {}, { defaultValue: palette.label })}
        </span>
      </div>

      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }), 'min-w-[140px]')}>
          <span
            className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface')}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {hours}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
            )}
          >
            {t('nightHistoryRow.hourSuffix', {}, { defaultValue: 'hr' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'text-on-surface',
              cm.sp('ml', 1),
            )}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {mins}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
            )}
          >
            {t('nightHistoryRow.minSuffix', {}, { defaultValue: 'min' })}
          </span>
        </div>

        <div className={cm.cn(cm.flex1, 'min-w-[200px] max-w-[480px]')}>
          <div
            className={cm.cn('flex h-2.5 w-full overflow-hidden rounded-full')}
            style={{ backgroundColor: 'var(--color-surface-container)' }}
          >
            <div style={{ width: `${widths.deep}%`, backgroundColor: STAGE_COLORS.deep }} />
            <div style={{ width: `${widths.light}%`, backgroundColor: STAGE_COLORS.light }} />
            <div style={{ width: `${widths.rem}%`, backgroundColor: STAGE_COLORS.rem }} />
            <div style={{ width: `${widths.awake}%`, backgroundColor: STAGE_COLORS.awake }} />
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('mt', 2),
              cm.textSize('xs'),
              'flex-wrap text-on-surface-variant',
            )}
          >
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span
                className={cm.cn('rounded-sm')}
                style={{ width: 8, height: 8, backgroundColor: STAGE_COLORS.deep }}
              />
              {t(
                'nightHistoryRow.deep',
                { pct: widths.deep.toFixed(0) },
                { defaultValue: '{{pct}}% deep' },
              )}
            </span>
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span
                className={cm.cn('rounded-sm')}
                style={{ width: 8, height: 8, backgroundColor: STAGE_COLORS.rem }}
              />
              {t(
                'nightHistoryRow.rem',
                { pct: widths.rem.toFixed(0) },
                { defaultValue: '{{pct}}% REM' },
              )}
            </span>
          </div>
        </div>

        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.h(14),
            cm.w(14),
            'shrink-0 rounded-full bg-primary text-on-primary',
          )}
          aria-label={t(
            'nightHistoryRow.scoreAria',
            { score },
            { defaultValue: 'Score {{score}}' },
          )}
        >
          <span
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'))}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {score}
          </span>
        </div>
      </div>

      {notes ? (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 3),
            'text-on-surface-variant italic line-clamp-1',
          )}
        >
          “{notes}”
        </p>
      ) : null}
    </Link>
  )
}
