import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface RoomSummary {
  id: string
  name: string
  /** Free-text room kind (kitchen, living-room, bedroom, …) — drives the icon. */
  kind: 'living' | 'kitchen' | 'bedroom' | 'bath' | 'office' | 'outdoor'
  devicesOn: number
  devicesTotal: number
  temperatureF: number
}

interface RoomTriadProps {
  rooms: ReadonlyArray<RoomSummary>
}

const KIND_ICON: Record<RoomSummary['kind'], string> = {
  living: 'living',
  kitchen: 'kitchen',
  bedroom: 'bed',
  bath: 'bathtub',
  office: 'desk',
  outdoor: 'deck',
}

const KIND_TINT: Record<RoomSummary['kind'], string> = {
  living: 'text-primary',
  kitchen: 'text-secondary',
  bedroom: 'text-tertiary',
  bath: 'text-info',
  office: 'text-primary',
  outdoor: 'text-success',
}

/**
 * Three-up room-card section — surface-container-low cards with a tinted
 * material-symbol chip in a white-shadow square, uppercase 10px label,
 * 3xl extrabold device-on count, and a quiet temperature footer.
 *
 * Translated from banking-dashboard's AccountsTriad pattern (group-hover
 * scale on the icon chip + caps tracking-widest label + 3xl extrabold
 * value). Falls back to fewer-than-3 cards if the input list is short.
 */
export function RoomTriad({ rooms }: RoomTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const featured = rooms.slice(0, 3)

  if (featured.length === 0) return null

  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
      {featured.map((r) => (
        <Link
          key={r.id}
          to={`/rooms/${r.id}`}
          className={cm.cn(
            cm.sp('p', 6),
            cm.cursorPointer,
            'block bg-surface-container-low rounded-2xl hover:bg-surface-container-lowest transition-all group',
          )}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
            <div
              className={cm.cn(
                cm.sp('p', 3),
                KIND_TINT[r.kind],
                'bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {KIND_ICON[r.kind]}
              </span>
            </div>
            <span
              className={cm.cn(
                'font-bold text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'roomTriad.tempBadge',
                { degrees: Math.round(r.temperatureF) },
                { defaultValue: '{{degrees}}°F' },
              )}
            </span>
          </div>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              cm.sp('mb', 1),
              'text-on-surface-variant',
            )}
          >
            {r.name}
          </p>
          <p className={cm.cn(cm.textSize('3xl'), 'font-extrabold tabular-nums')}>
            {t(
              'roomTriad.devicesOn',
              { on: r.devicesOn, total: r.devicesTotal },
              { defaultValue: '{{on}}/{{total}}' },
            )}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t('roomTriad.devicesLabel', {}, { defaultValue: 'devices on' })}
          </p>
        </Link>
      ))}
    </section>
  )
}
