import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CameraTile {
  id: string
  name: string
  room: string
  status: 'live' | 'recording' | 'offline'
}

interface LockTile {
  id: string
  name: string
  state: 'locked' | 'unlocked'
  lastChange: string
}

interface AlertItem {
  id: string
  icon: string
  title: string
  detail: string
  timeAgo: string
  tone: 'info' | 'warning' | 'error'
}

const CAMERAS: CameraTile[] = [
  { id: 'front', name: 'Front porch', room: 'Outdoor', status: 'live' },
  { id: 'driveway', name: 'Driveway', room: 'Outdoor', status: 'live' },
  { id: 'backyard', name: 'Backyard', room: 'Outdoor', status: 'recording' },
  { id: 'garage', name: 'Garage', room: 'Indoor', status: 'live' },
  { id: 'doorbell', name: 'Doorbell', room: 'Outdoor', status: 'live' },
  { id: 'baby', name: 'Nursery', room: 'Indoor', status: 'offline' },
]

const LOCKS: LockTile[] = [
  { id: 'front-door', name: 'Front door', state: 'locked', lastChange: '6h ago' },
  { id: 'back-door', name: 'Back door', state: 'locked', lastChange: '14h ago' },
  { id: 'garage-door', name: 'Garage', state: 'unlocked', lastChange: '12m ago' },
]

const ALERTS: AlertItem[] = [
  {
    id: '1',
    icon: 'sensors',
    title: 'Motion in driveway',
    detail: 'Driveway camera · 12:42 AM',
    timeAgo: '12m ago',
    tone: 'warning',
  },
  {
    id: '2',
    icon: 'lock_open',
    title: 'Garage door unlocked',
    detail: 'Manual unlock from app',
    timeAgo: '12m ago',
    tone: 'info',
  },
  {
    id: '3',
    icon: 'door_front',
    title: 'Front door opened',
    detail: 'Returned home · 11:18 PM',
    timeAgo: '3h ago',
    tone: 'info',
  },
  {
    id: '4',
    icon: 'warning',
    title: 'Smoke alarm test passed',
    detail: 'Hallway sensor · monthly auto-test',
    timeAgo: '1d ago',
    tone: 'info',
  },
  {
    id: '5',
    icon: 'wifi_off',
    title: 'Nursery camera offline',
    detail: 'Last seen 4h ago',
    timeAgo: '4h ago',
    tone: 'error',
  },
]

const STATUS_TONE: Record<CameraTile['status'], string> = {
  live: 'bg-success/20 text-success',
  recording: 'bg-error/20 text-error',
  offline: 'bg-surface-container text-on-surface-variant',
}

const ALERT_TONE: Record<AlertItem['tone'], string> = {
  info: 'border-l-primary bg-surface-container-lowest',
  warning: 'border-l-warning bg-surface-container-lowest',
  error: 'border-l-error bg-error-container/40',
}

export function Security() {
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
          {t('security.eyebrow', {}, { defaultValue: 'Watch' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.security', {}, { defaultValue: 'Security' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t('security.subheading', {}, { defaultValue: 'Cameras, locks, and recent alerts.' })}
        </p>
      </header>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('security.camerasHeading', {}, { defaultValue: 'Live cameras' })}
        </h2>
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
          {CAMERAS.map((c) => (
            <div
              key={c.id}
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                'rounded-2xl bg-surface-container-lowest overflow-hidden',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-40 bg-gradient-to-br from-on-surface/20 to-on-surface/40 text-on-surface relative',
                )}
              >
                <span className="material-symbols-outlined text-5xl opacity-70" aria-hidden="true">
                  videocam
                </span>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'absolute top-3 left-3 text-[10px] uppercase tracking-widest',
                    STATUS_TONE[c.status],
                  )}
                >
                  {t(`security.status.${c.status}`, {}, { defaultValue: c.status })}
                </span>
              </div>
              <div className={cm.cn(cm.sp('p', 4), cm.flex({ direction: 'col', gap: 'xs' }))}>
                <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>{c.name}</p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{c.room}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('security.locksHeading', {}, { defaultValue: 'Locks' })}
        </h2>
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
          {LOCKS.map((l) => (
            <div
              key={l.id}
              className={cm.cn(
                cm.sp('p', 5),
                cm.flex({ direction: 'col', gap: 'sm' }),
                'bg-surface-container-lowest rounded-2xl border-l-4',
                l.state === 'locked' ? 'border-l-success' : 'border-l-warning',
              )}
            >
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'))}>{l.name}</p>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest',
                    l.state === 'locked'
                      ? 'bg-success-container text-on-success-container'
                      : 'bg-warning-container text-on-warning-container',
                  )}
                >
                  {t(`security.lockState.${l.state}`, {}, { defaultValue: l.state })}
                </span>
              </div>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'security.lastChange',
                  { time: l.lastChange },
                  { defaultValue: 'Last change {{time}}' },
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('security.alertsHeading', {}, { defaultValue: 'Recent alerts' })}
        </h2>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {ALERTS.map((a) => (
            <div
              key={a.id}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('p', 4),
                'rounded-2xl border-l-4',
                ALERT_TONE[a.tone],
              )}
            >
              <div
                className={cm.cn(
                  cm.w(10),
                  cm.h(10),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  'bg-surface-container text-on-surface-variant',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">{a.icon}</span>
              </div>
              <div className={cm.flex({ direction: 'col', gap: 'xs' }) + ' flex-1 min-w-0'}>
                <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>{a.title}</p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{a.detail}</p>
              </div>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {a.timeAgo}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
