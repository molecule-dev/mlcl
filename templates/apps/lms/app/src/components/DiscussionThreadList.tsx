import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import DiscussionThreadCard from './DiscussionThreadCard.js'

function DiscussionThreadList({
  discussions,
  loading,
  error,
}: {
  discussions: Record<string, unknown>[]
  loading: boolean
  error: string | null
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (loading) {
    return (
      <div className={cm.grid({ cols: 1, gap: 'md' })}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cm.cn(
              cm.sp('p', 6),
              cm.h(32),
              'bg-surface-container-lowest rounded-xl animate-pulse',
            )}
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }
  if (error) {
    return (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('py', 12),
          'text-on-surface-variant',
        )}
      >
        <span className={cm.cn(cm.textSize('5xl'), cm.sp('mb', 4), 'material-symbols-outlined')}>
          error_outline
        </span>
        <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{error}</p>
      </div>
    )
  }
  if (discussions.length === 0) {
    return (
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('py', 16),
          'bg-surface-container-lowest rounded-xl',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('5xl'),
            cm.sp('mb', 4),
            'material-symbols-outlined text-on-surface-variant',
          )}
        >
          forum
        </span>
        <p
          className={cm.cn(
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'text-on-surface',
          )}
        >
          {t('discussionThreadList.emptyTitle', {}, { defaultValue: 'No discussions yet' })}
        </p>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'discussionThreadList.emptySubtitle',
            {},
            { defaultValue: 'Be the first to start a conversation.' },
          )}
        </p>
      </div>
    )
  }
  return (
    <div className={cm.grid({ cols: 1, gap: 'md' })}>
      {discussions.map((d) => (
        <DiscussionThreadCard key={String(d.id ?? Math.random())} discussion={d} />
      ))}
    </div>
  )
}

export default DiscussionThreadList
export { DiscussionThreadList }
