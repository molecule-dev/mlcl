import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface MasterySegments {
  mastered: number
  reviewing: number
  learning: number
  notStarted?: number
}

interface MasteryRingProps extends Partial<MasterySegments> {
  /** Optional segments object (alternative to flat props). */
  segments?: MasterySegments
  /** Inner-circle radius in pixels (controls overall size). Default 96. */
  size?: number
  /** Show the breakdown legend below the ring. */
  showLegend?: boolean
}

const COLORS = {
  mastered: 'var(--color-mastery-mastered)',
  reviewing: 'var(--color-mastery-reviewing)',
  learning: 'var(--color-mastery-learning)',
  notStarted: 'var(--color-mastery-not-started)',
} as const

/**
 * Segmented progress ring showing mastery breakdown — mastered (green),
 * reviewing (teal), learning (indigo), not-started (gray). Drawn as
 * proportional SVG arcs around a single shared circle.
 */
export function MasteryRing(props: MasteryRingProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const seg = props.segments ?? {
    mastered: props.mastered ?? 0,
    reviewing: props.reviewing ?? 0,
    learning: props.learning ?? 0,
    notStarted: props.notStarted ?? 0,
  }
  const { size = 192, showLegend = false } = props
  const mastered = Math.max(0, seg.mastered)
  const reviewing = Math.max(0, seg.reviewing)
  const learning = Math.max(0, seg.learning)
  const notStarted = Math.max(0, seg.notStarted ?? 0)
  const total = mastered + reviewing + learning + notStarted || 1
  const pctMastered = Math.round((mastered / total) * 100)

  const C = 2 * Math.PI * 40

  const arcs: Array<{ color: string; len: number }> = []
  if (mastered) {
    arcs.push({ color: COLORS.mastered, len: (mastered / total) * C })
  }
  if (reviewing) {
    arcs.push({ color: COLORS.reviewing, len: (reviewing / total) * C })
  }
  if (learning) {
    arcs.push({ color: COLORS.learning, len: (learning / total) * C })
  }

  // Build per-arc dasharray + offsets (drawn back-to-front)
  let runningOffset = 0
  const arcElements = arcs.map((arc, i) => {
    const offset = runningOffset
    runningOffset += arc.len
    return (
      <circle
        key={i}
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        stroke={arc.color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${arc.len} ${C - arc.len}`}
        strokeDashoffset={-offset}
        className="transition-all duration-1000 ease-out"
      />
    )
  })

  return (
    <div className={cm.flex({ direction: 'col', align: 'center', gap: 'md' })}>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'relative')}
        style={{ width: size, height: size }}
      >
        <svg
          className={'w-full h-full -rotate-90 transform'}
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            className="text-surface-container-high"
          />
          {arcElements}
        </svg>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            'absolute inset-0',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('4xl'),
              'font-extrabold tracking-tighter tabular-nums text-on-surface',
            )}
          >
            {pctMastered}
            <span className={cm.cn(cm.textSize('xl'), 'text-on-surface-variant')}>%</span>
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'mt-1 text-on-surface-variant',
            )}
          >
            {t('masteryRing.label', {}, { defaultValue: 'Mastered' })}
          </span>
        </div>
      </div>

      {showLegend ? (
        <ul className={cm.cn(cm.w('full'), cm.flex({ direction: 'col', gap: 'sm' }))}>
          <LegendRow
            color={COLORS.mastered}
            count={mastered}
            label={t('masteryRing.mastered', {}, { defaultValue: 'Mastered' })}
          />
          <LegendRow
            color={COLORS.reviewing}
            count={reviewing}
            label={t('masteryRing.reviewing', {}, { defaultValue: 'Reviewing' })}
          />
          <LegendRow
            color={COLORS.learning}
            count={learning}
            label={t('masteryRing.learning', {}, { defaultValue: 'Learning' })}
          />
          {notStarted ? (
            <LegendRow
              color={COLORS.notStarted}
              count={notStarted}
              label={t('masteryRing.notStarted', {}, { defaultValue: 'Not started' })}
            />
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}

function LegendRow({ color, count, label }: { color: string; count: number; label: string }) {
  const cm = getClassMap()
  return (
    <li className={cm.flex({ align: 'center', justify: 'between' })}>
      <span className={cm.flex({ align: 'center', gap: 'xs' })}>
        <span
          className={'w-3 h-3 rounded-full'}
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
        >
          {label}
        </span>
      </span>
      <span
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'tabular-nums text-on-surface',
        )}
      >
        {count.toLocaleString()}
      </span>
    </li>
  )
}
