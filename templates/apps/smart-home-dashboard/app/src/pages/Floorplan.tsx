import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface RoomPin {
  id: string
  name: string
  /** Room rect in percent of viewport (x, y, w, h). */
  rect: { x: number; y: number; w: number; h: number }
  temperatureF: number
  devicesOn: number
}

interface DevicePin {
  id: string
  label: string
  x: number
  y: number
  icon: string
  active: boolean
}

const ROOMS: RoomPin[] = [
  {
    id: 'living',
    name: 'Living',
    rect: { x: 5, y: 10, w: 40, h: 45 },
    temperatureF: 72,
    devicesOn: 4,
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    rect: { x: 50, y: 10, w: 30, h: 30 },
    temperatureF: 70,
    devicesOn: 3,
  },
  {
    id: 'dining',
    name: 'Dining',
    rect: { x: 82, y: 10, w: 13, h: 30 },
    temperatureF: 70,
    devicesOn: 1,
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    rect: { x: 5, y: 60, w: 35, h: 35 },
    temperatureF: 68,
    devicesOn: 2,
  },
  {
    id: 'office',
    name: 'Office',
    rect: { x: 45, y: 45, w: 25, h: 25 },
    temperatureF: 71,
    devicesOn: 5,
  },
  {
    id: 'bath',
    name: 'Bath',
    rect: { x: 75, y: 45, w: 20, h: 20 },
    temperatureF: 73,
    devicesOn: 1,
  },
  {
    id: 'patio',
    name: 'Patio',
    rect: { x: 45, y: 75, w: 50, h: 20 },
    temperatureF: 64,
    devicesOn: 2,
  },
]

const DEVICES: DevicePin[] = [
  { id: 'd1', label: 'Living lamp', x: 18, y: 30, icon: 'light', active: true },
  { id: 'd2', label: 'Couch sensor', x: 28, y: 42, icon: 'sensors', active: true },
  { id: 'd3', label: 'Kitchen oven', x: 60, y: 22, icon: 'kitchen', active: false },
  { id: 'd4', label: 'Bedroom lamp', x: 16, y: 78, icon: 'light', active: true },
  { id: 'd5', label: 'Office desk lamp', x: 55, y: 56, icon: 'desk', active: true },
  { id: 'd6', label: 'Patio lights', x: 70, y: 86, icon: 'flare', active: true },
  { id: 'd7', label: 'Front camera', x: 5, y: 10, icon: 'videocam', active: true },
]

export function Floorplan() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('floorplan.eyebrow', {}, { defaultValue: 'Map' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('floorplan.heading', {}, { defaultValue: 'Floorplan' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'floorplan.subheading',
            {},
            {
              defaultValue: 'Top-down view of every device and room with live temperature overlay.',
            },
          )}
        </p>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 4),
          'bg-surface-container-lowest rounded-3xl relative overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            'relative w-full bg-gradient-to-br from-info/10 via-surface to-warning/10 rounded-2xl',
          )}
          style={{ minHeight: '60vh' }}
        >
          {ROOMS.map((r) => (
            <div
              key={r.id}
              className={cm.cn(
                cm.sp('p', 3),
                cm.flex({ direction: 'col', justify: 'between' }),
                'absolute border-2 border-dashed border-outline-variant/60 rounded-lg bg-surface/40 backdrop-blur-sm',
              )}
              style={{
                left: `${r.rect.x}%`,
                top: `${r.rect.y}%`,
                width: `${r.rect.w}%`,
                height: `${r.rect.h}%`,
              }}
            >
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[11px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {r.name}
                </span>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'text-[10px] py-0.5 bg-surface text-on-surface tabular-nums',
                  )}
                >
                  {t(
                    'floorplan.tempBadge',
                    { degrees: Math.round(r.temperatureF) },
                    { defaultValue: '{{degrees}}°F' },
                  )}
                </span>
              </div>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'floorplan.roomDevices',
                  { count: r.devicesOn },
                  { defaultValue: '{{count}} on' },
                )}
              </span>
            </div>
          ))}

          {DEVICES.map((d) => (
            <div
              key={d.id}
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'absolute -translate-x-1/2 -translate-y-1/2 bg-surface shadow-md text-on-surface',
                d.active ? 'ring-2 ring-primary/60' : 'opacity-50',
              )}
              style={{ left: `${d.x}%`, top: `${d.y}%` }}
              title={d.label}
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                {d.icon}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 5),
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          'bg-surface-container-lowest rounded-2xl',
        )}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'floorplan.legend',
            {},
            {
              defaultValue:
                'Device pins glow when active. Room dashes show their boundary; tap any room to drill in.',
            },
          )}
        </p>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {[
            { tone: 'bg-info/30', label: 'Cool' },
            { tone: 'bg-success/30', label: 'Comfort' },
            { tone: 'bg-warning/30', label: 'Warm' },
            { tone: 'bg-error/30', label: 'Hot' },
          ].map((s) => (
            <div key={s.label} className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span
                className={cm.cn(cm.w(4), cm.h(4), cm.roundedFull, s.tone)}
                aria-hidden="true"
              />
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
