import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type Intent = {
  id: string
  name?: string
  intent?: string
  requestCount?: number
  count?: number
  percentage?: number
}

function BotAnalyticsTopIntentsPanel() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id: botId } = useParams<{ id?: string }>()
  const [intents, setIntents] = useState<Intent[]>([])
  const cm = getClassMap()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!botId) return
    let active = true
    http
      .get<Intent[] | { data: Intent[] }>(`/api/intents/bot/${botId}`)
      .then((res) => {
        if (!active) return
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
        if (list.some((i) => (i.requestCount ?? i.count ?? 0) > 0)) setIntents(list)
      })
      .catch(() => {})
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId])

  const displayIntents = intents
  const maxCount = Math.max(...displayIntents.map((i) => i.requestCount ?? i.count ?? 0), 1)
  const visibleIntents = expanded ? displayIntents : displayIntents.slice(0, 5)

  return (
    <div
      className={cm.cn(cm.sp('p', 8), 'glass-card rounded-[2rem] border border-surface shadow-sm')}
      data-mol-id="intents-section"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), cm.sp('mb', 8))}>
        <div>
          <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t('botAnalyticsTopIntentsPanel.title', {}, { defaultValue: 'Top Intents' })}
          </h4>
          <p className={cm.cn(cm.textSize('sm'), 'text-outline')}>
            {t(
              'botAnalyticsTopIntentsPanel.subtitle',
              {},
              { defaultValue: 'Primary user needs identified by AI' },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="intents-detailed-breakdown"
          onClick={() => {
            if (botId) {
              navigate(`/bots/${botId}/editor`)
            } else {
              setExpanded((prev) => !prev)
            }
          }}
          className={cm.cn(
            cm.textPrimary,
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center' }),
            'gap-1 hover:underline',
          )}
        >
          {t(
            'botAnalyticsTopIntentsPanel.detailedBreakdown',
            {},
            { defaultValue: 'Detailed Breakdown' },
          )}
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            aria-hidden="true"
          >
            arrow_forward
          </span>
        </button>
      </div>
      <div className={cm.stack(6)}>
        {displayIntents.length === 0 && (
          <p
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            data-mol-id="intents-empty"
          >
            {t(
              'botAnalyticsTopIntentsPanel.empty',
              {},
              { defaultValue: 'No intents have been recorded yet for this bot.' },
            )}
          </p>
        )}
        {visibleIntents.map((intent) => {
          const name = intent.name ?? intent.intent ?? ''
          const count = intent.requestCount ?? intent.count ?? 0
          const pct =
            intent.percentage != null ? intent.percentage : Math.round((count / maxCount) * 100)
          return (
            <div key={intent.id} className={cm.stack(2)}>
              <div
                className={cm.cn(
                  cm.flex({ justify: 'between' }),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                )}
              >
                <span className={cm.cn('text-on-surface')}>{name}</span>
                <span className={cm.cn('text-outline')}>
                  {t(
                    'botAnalyticsTopIntentsPanel.requestCount',
                    { count: count.toLocaleString() },
                    { defaultValue: '{{count}} requests' },
                  )}
                </span>
              </div>
              <div
                className={cm.cn(
                  cm.h(3),
                  cm.w('full'),
                  cm.roundedFull,
                  'bg-surface-container-highest overflow-hidden',
                )}
              >
                <div
                  className={cm.cn(
                    cm.h('full'),
                    cm.roundedFull,
                    'bg-gradient-to-r from-primary to-primary-container',
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BotAnalyticsTopIntentsPanel
export { BotAnalyticsTopIntentsPanel }
