import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card — surfaces the most-recent deck with a frosted-glass
 * collaborator pill, decorative blurred orbs, and a stylised stage SVG
 * (deep-navy slide on a violet gradient with title slide + thumbnail rail
 * + a presenter timer pill). Echoes the slide canvas / stage metaphor.
 *
 * Translated from design-canvas's ProjectHeroCard.tsx and
 * personal-finance's NetWorthCard.tsx chrome — retuned to Overture's
 * violet→magenta stage gradient and a slide-deck decoration instead of
 * vector tools.
 */
export interface DeckHeroCardProps {
  deck: {
    id: string
    title: string
    /** Number of slides in the deck. */
    slideCount: number
    /** Number of teammates currently editing this deck. */
    activeCollaborators: number
    /** Human-readable label (e.g. "Edited 12 min ago"). */
    updatedLabel: string
    /** Brand-domain eyebrow (e.g. "Q4 PITCH · v3"). */
    deckCode?: string
    /** Currently selected theme name shown as a pill. */
    activeTheme?: string
  }
}

export function DeckHeroCard({ deck }: DeckHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <Link
      to={`/decks/${deck.id}/edit`}
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] lg:col-span-8 bg-gradient-to-br from-primary via-primary-hover to-secondary rounded-[2rem] text-white relative overflow-hidden hover:scale-[1.005] transition-transform',
      )}
    >
      <div className={cm.cn('relative z-10', cm.stack(3))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-white/70',
            )}
          >
            {deck.deckCode ?? t('deckHeroCard.eyebrow', {}, { defaultValue: 'Most recent deck' })}
          </span>
          <span className={cm.cn('h-px w-8 bg-surface/30')}></span>
          <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('xs'), 'text-white/70')}>
            {deck.updatedLabel}
          </span>
        </div>
        <h2
          className={cm.cn('text-5xl md:text-6xl font-extrabold tracking-tighter leading-[0.95]')}
        >
          {deck.title}
        </h2>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 2), 'flex-wrap')}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>group</span>
            {t(
              'deckHeroCard.activeCollaborators',
              { count: deck.activeCollaborators },
              { defaultValue: '{{count}} editing now' },
            )}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/15 backdrop-blur-md text-white/90',
            )}
          >
            <span
              className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              filter_none
            </span>
            {t(
              'deckHeroCard.slideCount',
              { count: deck.slideCount },
              { defaultValue: '{{count}} slides' },
            )}
          </span>
          {deck.activeTheme && (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'bg-surface/10 backdrop-blur-md text-white/80',
              )}
            >
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>palette</span>
              {deck.activeTheme}
            </span>
          )}
        </div>
      </div>

      <div className={cm.cn('relative z-10', cm.sp('mt', 8), cm.h(28), cm.w('full'))}>
        <svg
          viewBox="0 0 400 110"
          preserveAspectRatio="none"
          className={cm.cn(cm.w('full'), cm.h('full'), 'opacity-95')}
        >
          <defs>
            <pattern
              id="hero-stage-grid"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1.2" fill="white" fillOpacity="0.3" />
            </pattern>
          </defs>
          <rect width="400" height="110" fill="url(#hero-stage-grid)" />
          {/* deep-navy stage with active slide */}
          <rect
            x="40"
            y="14"
            width="180"
            height="92"
            rx="6"
            style={{ fill: 'var(--color-slide-canvas)' }}
            stroke="white"
            strokeOpacity="0.3"
            strokeWidth="1.5"
          />
          {/* slide title bar */}
          <rect
            x="56"
            y="34"
            width="120"
            height="10"
            rx="3"
            style={{ fill: 'var(--mol-color-primary-light)' }}
          />
          {/* slide subtitle */}
          <rect x="56" y="50" width="80" height="5" rx="2" fill="white" fillOpacity="0.6" />
          {/* slide chart */}
          <path
            d="M56 80 L80 70 L104 76 L128 60 L152 64 L176 50"
            stroke="var(--mol-color-secondary)"
            strokeWidth="2.5"
            fill="none"
          />
          <circle cx="176" cy="50" r="3" style={{ fill: 'var(--mol-color-secondary)' }} />
          {/* slide thumbnail rail (right) */}
          <rect
            x="240"
            y="14"
            width="50"
            height="28"
            rx="3"
            fill="white"
            fillOpacity="0.95"
            stroke="white"
            strokeWidth="1.5"
          />
          <rect
            x="246"
            y="20"
            width="32"
            height="3"
            rx="1"
            style={{ fill: 'var(--mol-color-primary)' }}
          />
          <rect
            x="246"
            y="26"
            width="20"
            height="2"
            rx="1"
            style={{ fill: 'var(--color-slide-canvas-deep)' }}
            fillOpacity="0.4"
          />
          <rect
            x="240"
            y="46"
            width="50"
            height="28"
            rx="3"
            fill="white"
            fillOpacity="0.7"
            stroke="white"
            strokeOpacity="0.6"
            strokeWidth="1.5"
          />
          <rect
            x="246"
            y="52"
            width="32"
            height="3"
            rx="1"
            style={{ fill: 'var(--color-slide-canvas-deep)' }}
            fillOpacity="0.4"
          />
          <rect
            x="240"
            y="78"
            width="50"
            height="28"
            rx="3"
            fill="white"
            fillOpacity="0.55"
            stroke="white"
            strokeOpacity="0.4"
            strokeWidth="1.5"
          />
          {/* presenter timer pill */}
          <rect
            x="304"
            y="14"
            width="80"
            height="22"
            rx="11"
            style={{ fill: 'var(--mol-color-success)' }}
          />
          <text
            x="344"
            y="29"
            fill="#fff"
            fontFamily="Inter"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
          >
            12:34
          </text>
          {/* presenter notes pill */}
          <rect x="304" y="44" width="80" height="14" rx="3" fill="white" fillOpacity="0.18" />
          <rect x="312" y="48" width="60" height="2" rx="1" fill="white" fillOpacity="0.7" />
          <rect x="312" y="53" width="40" height="2" rx="1" fill="white" fillOpacity="0.5" />
          {/* keyframe diamonds (timeline) */}
          <g transform="translate(304,68)">
            <rect x="0" y="0" width="80" height="16" rx="3" fill="white" fillOpacity="0.12" />
            <rect
              x="10"
              y="6"
              width="6"
              height="6"
              transform="rotate(45 13 9)"
              style={{ fill: 'var(--mol-color-secondary)' }}
            />
            <rect
              x="32"
              y="6"
              width="6"
              height="6"
              transform="rotate(45 35 9)"
              style={{ fill: 'var(--mol-color-secondary)' }}
            />
            <rect
              x="58"
              y="6"
              width="6"
              height="6"
              transform="rotate(45 61 9)"
              style={{ fill: 'var(--mol-color-secondary)' }}
            />
          </g>
        </svg>
      </div>

      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-24 bg-surface/10 blur-3xl',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.w(40),
          cm.h(40),
          cm.roundedFull,
          'absolute -left-10 top-12 bg-tertiary/30 blur-3xl',
        )}
      ></div>
    </Link>
  )
}

export default DeckHeroCard
