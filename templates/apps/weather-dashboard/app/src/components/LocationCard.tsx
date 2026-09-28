import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatTemperature, getUnitPreferences } from '../lib/units.js'

export interface LocationSummary {
  id: string
  /** Location display name (city). */
  name: string
  /** Sub-region (state, country, or coordinates). */
  region?: string | null
  /** Latest current temperature for the location. */
  temperature?: number | null
  /** Free-text condition. */
  condition?: string | null
  /** Material symbol for the condition. */
  icon?: string | null
  /** Active alert count — drives the badge. */
  alertCount?: number
  /** Default-location flag — drives the primary tinted accent. */
  is_default?: boolean
}

interface LocationCardProps {
  location: LocationSummary
  /** When set, navigate to /location/:id; otherwise render as a static card. */
  to?: string
  /** Optional remove handler; when present, renders a trailing menu pip. */
  onRemove?: (id: string) => void
  /** Optional set-default handler; renders a star pip when the location isn't already default. */
  onSetDefault?: (id: string) => void
}

/**
 * Saved-location card for the sidebar / Locations grid — sky-tinted
 * Material Symbols glyph in a glass square, two-line city + region,
 * tabular thin-Inter temperature on the right, and an alert pip when
 * active warnings exist.
 *
 * Translated from smart-home-dashboard's RoomTriad single-card layout
 * + DESIGN.md's "Location Card (Sidebar)" recipe (active state =
 * primary left border, mini condition icon beside temperature).
 */
export function LocationCard({ location, to, onRemove, onSetDefault }: LocationCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tempPref = getUnitPreferences().temperature
  // Two-step inline confirm for the destructive remove: the first click
  // arms the pip (error tint + "confirm" label), the second click within
  // the arm window commits. Clicking elsewhere or waiting disarms.
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  }, [])
  const armRemove = () => {
    setConfirmingRemove(true)
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    confirmTimer.current = setTimeout(() => setConfirmingRemove(false), 4000)
  }
  const handleRemoveClick = () => {
    if (!confirmingRemove) {
      armRemove()
      return
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    setConfirmingRemove(false)
    onRemove?.(location.id)
  }
  // The default location carries the inset accent bar (transparent otherwise,
  // so every row keeps the same left padding).
  const accent = location.is_default ? 'bg-primary/8' : ''
  const accentStyle = {
    ['--mol-accent' as string]: location.is_default ? 'var(--color-primary)' : 'transparent',
  }
  const alertCount = location.alertCount ?? 0
  const wrapperClassName = cm.cn(
    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
    cm.sp('p', 4),
    'rounded-xl',
    'bg-surface-container-lowest hover:bg-surface-container-low transition-all group',
    cm.accentCard({ tone: 'custom' }),
    accent,
  )

  const inner = (
    <>
      <div className={cm.flex({ align: 'center', gap: 'md' })} style={{ flex: 1, minWidth: 0 }}>
        <div
          className={cm.cn(
            cm.w(11),
            cm.h(11),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-xl',
            'bg-gradient-to-br from-primary/15 to-tertiary/15 text-primary group-hover:scale-105 transition-transform',
          )}
          aria-hidden="true"
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('2xl'))}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {location.icon || 'location_on'}
          </span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'truncate')}>
              {location.name}
            </p>
            {location.is_default ? (
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-primary',
                )}
              >
                {t('locationCard.default', {}, { defaultValue: 'Default' })}
              </span>
            ) : null}
            {alertCount > 0 ? (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 2),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  'text-[10px] py-0.5 uppercase tracking-widest bg-error/15 text-error',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
                  aria-hidden="true"
                >
                  warning
                </span>
                {t('locationCard.alerts', { count: alertCount }, { defaultValue: '{{count}}' })}
              </span>
            ) : null}
          </div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 1),
              'font-mono uppercase tracking-widest text-on-surface-variant truncate',
            )}
          >
            {location.region || (location.condition ?? '—')}
          </p>
        </div>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
        {location.temperature != null ? (
          <span
            className={cm.cn('tabular-nums text-on-surface')}
            style={{ fontSize: '1.5rem', fontWeight: 300, letterSpacing: '-0.02em' }}
          >
            {t(
              'locationCard.temperature',
              {
                degrees: formatTemperature(location.temperature, tempPref).value,
                unit: formatTemperature(location.temperature, tempPref).unit,
              },
              { defaultValue: '{{degrees}}{{unit}}' },
            )}
          </span>
        ) : null}
        {onSetDefault && !location.is_default ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onSetDefault(location.id)
            }}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'bg-surface-container hover:bg-primary/20 text-on-surface-variant hover:text-primary transition-colors',
            )}
            aria-label={t(
              'locationCard.setDefaultAria',
              { name: location.name },
              { defaultValue: 'Set {{name}} as default' },
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
              aria-hidden="true"
            >
              star
            </span>
          </button>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              handleRemoveClick()
            }}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              confirmingRemove ? cm.sp('px', 3) : cm.w(8),
              cm.h(8),
              cm.roundedFull,
              confirmingRemove
                ? 'bg-error text-on-error font-bold hover:opacity-90'
                : 'bg-surface-container hover:bg-error/20 text-on-surface-variant hover:text-error transition-colors',
            )}
            aria-label={
              confirmingRemove
                ? t(
                    'locationCard.confirmRemoveAria',
                    { name: location.name },
                    { defaultValue: 'Confirm removing {{name}}' },
                  )
                : t(
                    'locationCard.removeAria',
                    { name: location.name },
                    { defaultValue: 'Remove {{name}}' },
                  )
            }
          >
            <span
              className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
              aria-hidden="true"
            >
              {confirmingRemove ? 'delete' : 'close'}
            </span>
            {confirmingRemove
              ? t('locationCard.confirmRemove', {}, { defaultValue: 'Sure?' })
              : null}
          </button>
        ) : null}
      </div>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={wrapperClassName} style={accentStyle}>
        {inner}
      </Link>
    )
  }
  return (
    <div className={wrapperClassName} style={accentStyle}>
      {inner}
    </div>
  )
}
