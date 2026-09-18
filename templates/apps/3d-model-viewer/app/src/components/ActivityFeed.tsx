import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ActivityRow {
  id: string
  action: string
  model_id?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

interface ModelRow {
  id: string
  name?: string
}

const ICON_BY_ACTION: Record<string, { icon: string; tone: string }> = {
  uploaded: { icon: 'cloud_upload', tone: 'bg-primary/10 text-primary' },
  rendered: { icon: 'visibility', tone: 'bg-secondary/10 text-secondary' },
  shared: { icon: 'share', tone: 'bg-secondary/10 text-secondary' },
  commented: { icon: 'chat_bubble', tone: 'bg-tertiary/10 text-tertiary' },
  updated: { icon: 'edit', tone: 'bg-tertiary/10 text-tertiary' },
  published: { icon: 'public', tone: 'bg-primary/10 text-primary' },
  deleted: { icon: 'delete', tone: 'bg-error/10 text-error' },
}

function relativeTime(
  iso: string,
  t: (
    k: string,
    v?: Record<string, string | number | boolean | Date>,
    o?: { defaultValue: string },
  ) => string,
): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return t('common.justNow', {}, { defaultValue: 'just now' })
  if (minutes < 60)
    return t('activityFeed.minutesAgo', { minutes }, { defaultValue: '{{minutes}} minutes ago' })
  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return t('activityFeed.hoursAgo', { hours }, { defaultValue: '{{hours}} hours ago' })
  const days = Math.floor(hours / 24)
  if (days === 1) return t('activityFeed.yesterday', {}, { defaultValue: 'Yesterday' })
  return t('activityFeed.daysAgo', { days }, { defaultValue: '{{days}} days ago' })
}

function actionPhrase(
  action: string,
  t: (
    k: string,
    v?: Record<string, string | number | boolean | Date>,
    o?: { defaultValue: string },
  ) => string,
): string {
  switch (action) {
    case 'uploaded':
      return t('activityFeed.uploadedModel', {}, { defaultValue: 'uploaded a new model' })
    case 'rendered':
      return t('activityFeed.renderedModel', {}, { defaultValue: 'rendered' })
    case 'shared':
      return t('activityFeed.sharedModel', {}, { defaultValue: 'shared' })
    case 'commented':
      return t('activityFeed.commentedModel', {}, { defaultValue: 'commented on' })
    case 'updated':
      return t('activityFeed.updatedModel', {}, { defaultValue: 'updated' })
    case 'published':
      return t('activityFeed.publishedModel', {}, { defaultValue: 'published' })
    case 'deleted':
      return t('activityFeed.deletedModel', {}, { defaultValue: 'deleted' })
    default:
      return action
  }
}

function ActivityFeed() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [modelsById, setModelsById] = useState<Record<string, ModelRow>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/activity').catch(() => []),
      http.get('/api/models').catch(() => []),
    ])
      .then(([act, models]: [unknown, unknown]) => {
        if (cancelled) return
        const list = Array.isArray(act)
          ? act
          : Array.isArray((act as { data?: unknown[] })?.data)
            ? (act as { data: ActivityRow[] }).data
            : []
        setRows(list as ActivityRow[])
        const modelsList = Array.isArray(models)
          ? models
          : Array.isArray((models as { data?: unknown[] })?.data)
            ? (models as { data: ModelRow[] }).data
            : []
        const byId: Record<string, ModelRow> = {}
        for (const m of modelsList as ModelRow[]) byId[m.id] = m
        setModelsById(byId)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      data-mol-id="activity-feed"
      className={cm.cn(cm.sp('p', 8), 'lg:col-span-2 bg-surface-container-low rounded-xl')}
    >
      <h3 className={cm.cn(cm.textSize('lg'), cm.sp('mb', 6), 'font-headline text-on-surface')}>
        {t('activityFeed.heading', {}, { defaultValue: 'Recent Activity' })}
      </h3>
      {loading ? (
        <div role="status" className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : rows.length === 0 ? (
        <div
          data-mol-id="activity-feed-empty"
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
        >
          {t(
            'activityFeed.empty',
            {},
            { defaultValue: 'No activity yet — upload a model to get started.' },
          )}
        </div>
      ) : (
        <div className={cm.stack(6)}>
          {rows.slice(0, 8).map((row) => {
            const cfg = ICON_BY_ACTION[row.action] ?? ICON_BY_ACTION.updated
            const modelName = row.model_id && modelsById[row.model_id]?.name
            return (
              <div
                key={row.id}
                className={cm.flex({ gap: 4 })}
                data-mol-id={`activity-row-${row.id}`}
              >
                <div
                  className={cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.shrink0,
                    cm.sp('mt', 1),
                    cfg.tone,
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">{cfg.icon}</span>
                </div>
                <div>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                    <span className={cm.fontWeight('medium')}>
                      {t('nav.you', {}, { defaultValue: 'You' })}
                    </span>{' '}
                    {actionPhrase(row.action, t)}
                    {modelName ? (
                      <>
                        {' '}
                        <span className={cm.fontWeight('medium')}>{modelName}</span>
                      </>
                    ) : null}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {relativeTime(row.created_at, t)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ActivityFeed
export { ActivityFeed }
