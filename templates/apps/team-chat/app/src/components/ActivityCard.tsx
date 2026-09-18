import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface MessageRow {
  id?: string
  content?: string
  user_id?: string
  reply_count?: number
}

export default function ActivityCard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cm = getClassMap()
  const http = useHttpClient()
  const { user } = useAuth<{ id?: string; name?: string }>()
  const [mentionsCount, setMentionsCount] = useState<number | null>(null)
  const [reactionsCount, setReactionsCount] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    const handle = (user?.name?.split(' ')[0] || '').toLowerCase()
    http
      .get<MessageRow[]>('/api/messages')
      .then((res) => {
        if (!active) return
        const list = Array.isArray(res?.data) ? res.data : []
        const myMentions = handle
          ? list.filter(
              (m) =>
                typeof m.content === 'string' && m.content.toLowerCase().includes(`@${handle}`),
            ).length
          : 0
        // Reactions counter falls back to 0 until a per-user reactions endpoint
        // is wired (current API exposes /reactions/:messageId only).
        setMentionsCount(myMentions)
        setReactionsCount(0)
      })
      .catch(() => {
        if (!active) return
        setMentionsCount(0)
        setReactionsCount(0)
      })
    return () => {
      active = false
    }
  }, [http, user?.name])

  const mentions = mentionsCount ?? 0
  const reactions = reactionsCount ?? 0

  return (
    <div
      data-mol-id="activity-card"
      className={cm.cn(
        cm.sp('p', 8),
        'bg-gradient-to-br from-primary to-primary-container rounded-xl text-on-primary shadow-xl shadow-primary/20 relative overflow-hidden',
      )}
    >
      <div className={cm.cn(cm.sp('p', 4), 'absolute top-0 right-0 opacity-10')}>
        <span className={cm.cn('material-symbols-outlined text-8xl')}>bolt</span>
      </div>
      <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('activityCard.title', {}, { defaultValue: 'Your Activity' })}
      </h3>
      <div className={cm.grid({ cols: 2, gap: 'md' })}>
        <div className={cm.cn('bg-surface/10 backdrop-blur-md p-4 rounded-lg')}>
          <span
            data-mol-id="activity-card-mentions-count"
            className={cm.cn('text-3xl font-extrabold block')}
          >
            {t('activityCard.mentionsCount', { count: mentions }, { defaultValue: '{{count}}' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider opacity-80',
            )}
          >
            {t('activityCard.mentions', {}, { defaultValue: 'Mentions' })}
          </span>
        </div>
        <div className={cm.cn('bg-surface/10 backdrop-blur-md p-4 rounded-lg')}>
          <span
            data-mol-id="activity-card-reactions-count"
            className={cm.cn('text-3xl font-extrabold block')}
          >
            {t('activityCard.reactionsCount', { count: reactions }, { defaultValue: '{{count}}' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-wider opacity-80',
            )}
          >
            {t('activityCard.reactions', {}, { defaultValue: 'Reactions' })}
          </span>
        </div>
      </div>
      <button
        data-mol-id="activity-card-review-mentions"
        onClick={() => navigate('/notifications')}
        className={cm.cn(
          cm.button(),
          cm.sp('mt', 6),
          cm.fontWeight('bold'),
          cm.textSize('sm'),
          cm.textPrimary,
          'w-full py-2.5 bg-surface rounded hover:bg-opacity-90 transition-all',
        )}
      >
        {t('activityCard.reviewMentions', {}, { defaultValue: 'Review Mentions' })}
      </button>
    </div>
  )
}
export { ActivityCard }
