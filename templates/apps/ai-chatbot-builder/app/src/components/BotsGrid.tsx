import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import BotCard from './BotCard.js'

export type BotsGridBot = {
  id: string
  name?: string
  description?: string
  status?: string
  conversations?: number
  lastActive?: string
  avatarUrl?: string
}

function BotsGrid({
  bots = [],
  loading = false,
}: { bots?: BotsGridBot[]; loading?: boolean } = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2')}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            data-mol-id="bots-grid-skeleton"
            className={cm.cn(cm.h(48), 'bg-surface-container-lowest rounded-xl animate-pulse')}
          />
        ))}
      </div>
    )
  }

  if (bots.length > 0) {
    return (
      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2')}>
        {bots.map((bot) => (
          <BotCard
            key={bot.id}
            id={bot.id}
            name={bot.name ?? bot.id}
            description={bot.description}
            status={bot.status ?? 'Online'}
            conversations={bot.conversations}
            lastActive={bot.lastActive}
            avatarUrl={bot.avatarUrl}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      data-mol-id="bots-grid-empty"
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 12),
        cm.stack(4),
        'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/30 text-center',
      )}
    >
      <span
        aria-hidden="true"
        className={cm.cn('material-symbols-outlined text-primary')}
        style={{ fontSize: '3rem', fontVariationSettings: "'FILL' 1" }}
      >
        smart_toy
      </span>
      <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
        {t('botsGrid.emptyTitle', {}, { defaultValue: 'No bots yet' })}
      </h3>
      <p className={cm.cn(cm.textSize('sm'), 'max-w-sm text-on-surface-variant leading-relaxed')}>
        {t(
          'botsGrid.emptyBody',
          {},
          {
            defaultValue:
              'Create your first chatbot to start handling conversations and automating support.',
          },
        )}
      </p>
      <Link
        to="/bots/new"
        data-mol-id="bots-grid-create-cta"
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 3),
          cm.fontWeight('bold'),
          'bg-primary text-on-primary rounded-xl hover:opacity-90 transition-opacity',
        )}
      >
        {t('botsGrid.createCta', {}, { defaultValue: 'Create your first bot' })}
      </Link>
    </div>
  )
}

export default BotsGrid
export { BotsGrid }
