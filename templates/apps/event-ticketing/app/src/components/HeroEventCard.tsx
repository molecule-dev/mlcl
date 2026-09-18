import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Featured event hero card — gradient violet/indigo glow halo, rotated
 * "Selling fast" rose ribbon, oversized event title, frosted-glass date
 * pill, primary CTA. Used on the Landing hero (logged-out preview) and
 * as Dashboard's spotlight.
 *
 * Translated from auction-platform's HeroAuctionCard.tsx — same anatomy
 * (image-first card with ribbon + bottom dark band + gradient body) with
 * Turnstile's violet/rose palette and a date badge in place of the bid
 * counter.
 */
interface HeroEventCardProps {
  id: string
  title: string
  category: string
  imageAlt: string
  imageUrl?: string
  startDateIso: string
  startTime?: string
  venueName: string
  city: string
  fromPriceCents?: number
  isFree?: boolean
  ribbonLabel?: string
  ctaLabel?: string
}

function fmt(cents?: number): string {
  if (typeof cents !== 'number') return '$—'
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function dateParts(iso: string): { month: string; day: string; weekday: string } {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { month: '—', day: '—', weekday: '' }
  return {
    month: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: String(d.getDate()).padStart(2, '0'),
    weekday: d.toLocaleDateString(undefined, { weekday: 'long' }),
  }
}

export function HeroEventCard({
  id,
  title,
  category,
  imageAlt,
  imageUrl,
  startDateIso,
  startTime,
  venueName,
  city,
  fromPriceCents,
  isFree,
  ribbonLabel,
  ctaLabel,
}: HeroEventCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { month, day, weekday } = dateParts(startDateIso)
  const placeholder = !imageUrl

  return (
    <div className={cm.cn('relative w-full max-w-lg')}>
      <div
        className={cm.cn('absolute -inset-1 rounded-[2rem] blur-2xl opacity-40')}
        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}
        aria-hidden="true"
      />
      <article
        className={cm.cn(
          'relative bg-surface rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/30 border border-outline-variant/40',
        )}
      >
        <div className={cm.cn('relative aspect-[4/3] bg-surface-container overflow-hidden')}>
          {placeholder ? (
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'w-full h-full')}
              aria-hidden="true"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-white/80')}
                style={{ fontSize: '7rem', fontVariationSettings: "'FILL' 1" }}
              >
                festival
              </span>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={imageAlt}
              className={cm.cn('absolute inset-0 w-full h-full object-cover')}
            />
          )}

          {/* Stacked rose date badge */}
          <div
            className={cm.cn('absolute top-4 left-4 px-4 py-3 rounded-2xl text-white text-center')}
            style={{
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))',
              boxShadow:
                '0 14px 30px -10px color-mix(in srgb, var(--color-accent) 55%, transparent)',
            }}
          >
            <div
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest leading-none opacity-90',
              )}
            >
              {month}
            </div>
            <div className={cm.cn('text-3xl font-extrabold tabular-nums leading-none mt-1')}>
              {day}
            </div>
          </div>

          {/* Category chip */}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md',
            )}
            style={{ background: 'rgba(0,0,0,0.45)' }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              music_note
            </span>
            {category}
          </div>

          {/* Rotated rose ribbon */}
          <div
            className={cm.cn(
              'absolute top-12 right-[-32px] w-36 text-center transform rotate-45 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-md',
            )}
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {ribbonLabel ?? t('heroEventCard.sellingFast', {}, { defaultValue: 'Selling fast' })}
          </div>

          {/* Bottom dark band — when + where */}
          <div
            className={cm.cn(
              'absolute inset-x-0 bottom-0 px-4 py-3 bg-foreground/85 backdrop-blur-sm border-t border-surface/10 text-white',
            )}
          >
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest opacity-70')}>
              {weekday} {startTime ? `· ${startTime}` : ''}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'font-medium')}>
              <span
                className={cm.cn('material-symbols-outlined text-sm align-text-bottom')}
                aria-hidden="true"
              >
                place
              </span>{' '}
              {venueName} · {city}
            </p>
          </div>
        </div>

        <div
          className={cm.cn(cm.sp('p', 6), cm.stack(4))}
          style={{
            background: 'linear-gradient(135deg, var(--color-background), var(--color-surface))',
          }}
        >
          <div className={cm.stack(1)}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-primary',
              )}
            >
              {t('heroEventCard.featured', {}, { defaultValue: 'Featured event' })}
            </p>
            <h3
              className={cm.cn(
                'text-2xl font-extrabold tracking-tight text-on-surface line-clamp-2',
              )}
            >
              {title}
            </h3>
          </div>
          <div className={cm.flex({ align: 'end', justify: 'between' })}>
            <div className={cm.stack(1)}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('heroEventCard.priceFrom', {}, { defaultValue: 'From' })}
              </span>
              <span
                className={cm.cn('text-4xl font-extrabold tabular-nums tracking-tight')}
                style={{ color: 'var(--color-primary)' }}
              >
                {isFree
                  ? t('heroEventCard.free', {}, { defaultValue: 'Free' })
                  : fmt(fromPriceCents)}
              </span>
            </div>
            <Link
              to={`/events/${id}`}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-full text-white shadow-md shadow-primary/30 hover:shadow-lg active:scale-95 transition-all',
              )}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              }}
            >
              {ctaLabel ?? t('heroEventCard.getTickets', {}, { defaultValue: 'Get tickets' })}
            </Link>
          </div>
        </div>
      </article>
    </div>
  )
}

export default HeroEventCard
