import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import BotCard from './BotCard.js'

interface MyActiveBotsPanelBot {
  id: string
  name?: string
  description?: string
  status?: string
  conversations?: number
}

function MyActiveBotsPanel() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const http = useHttpClient()
  const [bots, setBots] = useState<MyActiveBotsPanelBot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    http
      .get<MyActiveBotsPanelBot[] | { data: MyActiveBotsPanelBot[] }>('/api/bots')
      .then((res) => {
        if (!active) return
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { data?: MyActiveBotsPanelBot[] })?.data)
            ? (res as { data: MyActiveBotsPanelBot[] }).data
            : []
        setBots(list.slice(0, 4))
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={cm.cn(cm.stack(6), 'col-span-12 lg:col-span-8')}>
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
          {t('myActiveBotsPanel.title', {}, { defaultValue: 'My Active Bots' })}
        </h4>
        <Link
          to="/bots"
          data-mol-id="my-bots-view-all"
          className={cm.cn(
            'text-sm font-semibold text-primary flex items-center gap-1 hover:underline',
          )}
        >
          {t('myActiveBotsPanel.viewAll', {}, { defaultValue: 'View All' })}
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
            data-icon="chevron_right"
          >
            chevron_right
          </span>
        </Link>
      </div>
      {loading ? (
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              data-mol-id="my-bots-skeleton"
              className={cm.cn(cm.h(48), 'bg-surface-container-lowest rounded-xl animate-pulse')}
            />
          ))}
        </div>
      ) : bots.length > 0 ? (
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
          {bots.map((bot) => (
            <BotCard
              key={bot.id}
              id={bot.id}
              name={bot.name}
              description={bot.description}
              status={bot.status}
              conversations={bot.conversations}
            />
          ))}
        </div>
      ) : (
        <div
          data-mol-id="my-bots-empty"
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.sp('p', 8),
            cm.stack(3),
            'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/30 text-center',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-primary')}
            style={{ fontSize: '2.5rem', fontVariationSettings: "'FILL' 1" }}
          >
            smart_toy
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'myActiveBotsPanel.empty',
              {},
              { defaultValue: 'You have no bots yet — create one to get started.' },
            )}
          </p>
          <Link
            to="/bots/new"
            data-mol-id="my-bots-create-cta"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'bg-primary text-on-primary rounded-xl hover:opacity-90 transition-opacity',
            )}
          >
            {t('myActiveBotsPanel.createCta', {}, { defaultValue: 'Create a bot' })}
          </Link>
        </div>
      )}
    </div>
  )
}

export default MyActiveBotsPanel
export { MyActiveBotsPanel }
