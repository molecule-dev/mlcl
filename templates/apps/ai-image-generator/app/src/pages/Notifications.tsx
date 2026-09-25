import { useCallback, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AiImageGeneratorLayout } from '../components/AiImageGeneratorLayout.js'
import { AiImageGeneratorTopBar } from '../components/AiImageGeneratorTopBar.js'
import { EmptyState } from '../components/EmptyState.js'
import { adaptActivity } from '../lib/api-adapters.js'
import { useFetchList } from '../lib/use-fetch-list.js'

const ICONS: Record<string, string> = {
  completed: 'check_circle',
  failed: 'error',
  upscaled: 'high_quality',
  queued: 'schedule',
  shared: 'share',
}

const TONES: Record<string, string> = {
  completed: 'bg-success-container/30 text-success',
  failed: 'bg-error-container/30 text-error',
  upscaled: 'bg-info-container/30 text-info',
  queued: 'bg-on-surface/10 text-on-surface-variant',
  shared: 'bg-primary-container/40 text-primary',
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [marking, setMarking] = useState(false)

  const activityState = useFetchList(
    '/api/notifications',
    useCallback((row: Record<string, unknown>) => adaptActivity(row), []),
  )

  const markAllRead = useCallback(async () => {
    setMarking(true)
    try {
      await http.post('/api/notifications/mark-all-read', {})
      await activityState.refetch()
    } catch (error) {
      logError('notifications.markAllRead', error)
    } finally {
      setMarking(false)
    }
  }, [http, activityState])

  const events = activityState.data ?? []
  const grouped = events.reduce<Record<string, typeof events>>((map, event) => {
    map[event.groupKey] = map[event.groupKey] ?? []
    map[event.groupKey].push(event)
    return map
  }, {})

  const groupKeys = Object.keys(grouped)

  return (
    <AiImageGeneratorLayout>
      <AiImageGeneratorTopBar
        title={t('nav.activity', {}, { defaultValue: 'Activity' })}
        subtitle={t(
          'notifications.subtitle',
          {},
          { defaultValue: 'Generation events grouped by day' },
        )}
        actions={
          <button
            type="button"
            disabled={marking || events.length === 0}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-xl bg-surface-container text-on-surface hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50',
            )}
            onClick={markAllRead}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              done_all
            </span>
            {marking
              ? t('common.markingEllipsis', {}, { defaultValue: 'Marking…' })
              : t('common.markAllRead', {}, { defaultValue: 'Mark all read' })}
          </button>
        }
      />

      <div className={cm.cn(cm.sp('p', 8))}>
        {activityState.loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('nav.loadingActivity', {}, { defaultValue: 'Loading activity…' })}
          </p>
        ) : groupKeys.length === 0 ? (
          <EmptyState
            icon="notifications_off"
            title={t('notifications.empty.title', {}, { defaultValue: 'Nothing to report' })}
            description={t(
              'notifications.empty.body',
              {},
              {
                defaultValue: 'Generation activity, sharing and credit alerts will appear here.',
              },
            )}
          />
        ) : (
          <div className={cm.flex({ direction: 'col', gap: 'lg' })}>
            {groupKeys.map((key) => (
              <section key={key} className={cm.flex({ direction: 'col', gap: 'sm' })}>
                <h2
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(`notifications.groups.${key}`, {}, { defaultValue: key })}
                </h2>
                <ol
                  className={cm.cn(
                    cm.flex({ direction: 'col' }),
                    'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 divide-y divide-outline-variant/10',
                  )}
                >
                  {grouped[key].map((event) => (
                    <li
                      key={event.id}
                      className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 4))}
                    >
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          'h-10 w-10 rounded-full',
                          TONES[event.type] ?? 'bg-primary-container/30 text-primary',
                        )}
                        aria-hidden="true"
                      >
                        <span className="material-symbols-outlined">
                          {ICONS[event.type] ?? 'auto_awesome'}
                        </span>
                      </span>
                      <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1 min-w-0')}>
                        <p
                          className={cm.cn(
                            cm.fontWeight('semibold'),
                            cm.textSize('sm'),
                            'text-on-surface line-clamp-1',
                          )}
                        >
                          {t(
                            `notifications.events.${event.type}`,
                            { prompt: event.prompt },
                            { defaultValue: '{{prompt}}' },
                          )}
                        </p>
                        <span
                          className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}
                        >
                          {event.when}
                        </span>
                      </div>
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.textSize('xs'),
                          cm.sp('px', 2),
                          'rounded-full uppercase tracking-widest',
                          TONES[event.type] ?? 'bg-primary-container/30 text-primary',
                        )}
                      >
                        {event.type}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </AiImageGeneratorLayout>
  )
}

export default Notifications
