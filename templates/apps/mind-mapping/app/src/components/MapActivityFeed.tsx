import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Vertical activity feed with a connector line that visually echoes mind-map
 * branches — perfect for the Dendrite voice ("organic", "branching"). Each
 * item is a node on the spine.
 *
 * Translated from project-management's Dashboard activity timeline (the
 * `before:` pseudo-line + 11x11 avatar circles with z-10) — repaletted in
 * Dendrite primary/tertiary so it reads as a branching trunk.
 */

export interface MapActivityItem {
  id: string
  actor: string
  action: string
  target?: string
  ago: string
  icon?: string
  type?: 'edit' | 'comment' | 'share' | 'restore' | 'delete'
}

export interface MapActivityFeedProps {
  title?: string
  items: MapActivityItem[]
  emptyHint?: string
}

const ACTION_ICONS: Record<NonNullable<MapActivityItem['type']>, string> = {
  edit: 'edit_note',
  comment: 'forum',
  share: 'share',
  restore: 'restore',
  delete: 'delete',
}

export function MapActivityFeed({ title, items, emptyHint }: MapActivityFeedProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (items.length === 0) {
    return (
      <div
        className={cm.cn(
          cm.sp('p', 8),
          cm.stack(2),
          cm.textCenter,
          'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/50',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('3xl'),
            'material-symbols-outlined text-on-surface-variant/60',
          )}
        >
          history
        </span>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
          {emptyHint ||
            t(
              'mapActivity.empty',
              {},
              { defaultValue: 'No activity yet — start branching to see updates here.' },
            )}
        </p>
      </div>
    )
  }

  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        cm.stack(6),
        'bg-surface-container-lowest rounded-2xl shadow-sm',
      )}
    >
      {title && (
        <div className={cm.flex({ justify: 'between', align: 'center' })}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}>
            {title}
          </h2>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'material-symbols-outlined text-on-surface-variant',
            )}
          >
            history
          </span>
        </div>
      )}
      <ol
        className={cm.cn(
          'relative space-y-6 before:absolute before:left-[1.35rem] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-primary/40 before:via-tertiary/30 before:to-transparent',
        )}
      >
        {items.map((item) => {
          const icon = item.icon || (item.type ? ACTION_ICONS[item.type] : 'circle')
          return (
            <li key={item.id} className={cm.cn(cm.flex({ gap: 'md', align: 'start' }), 'relative')}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(11),
                  cm.h(11),
                  'rounded-full bg-primary-fixed text-primary border-2 border-surface-container-lowest z-10 shrink-0',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {icon}
                </span>
              </span>
              <div className={cm.cn(cm.flex1, cm.stack(1))}>
                <p
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  <span className={cm.cn('text-primary font-bold')}>{item.actor}</span>{' '}
                  <span>{item.action}</span>{' '}
                  {item.target && (
                    <span className={cm.cn('text-tertiary font-bold')}>{item.target}</span>
                  )}
                </p>
                <p
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant/70',
                  )}
                >
                  {item.ago}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default MapActivityFeed
