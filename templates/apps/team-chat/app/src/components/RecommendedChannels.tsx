import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ApiChannel {
  id: string
  name: string
}

export default function RecommendedChannels() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [channels, setChannels] = useState<ApiChannel[] | null>(null)

  useEffect(() => {
    let active = true
    http
      .get<ApiChannel[]>('/api/channels')
      .then((res) => {
        if (!active) return
        const list = Array.isArray(res?.data) ? res.data : []
        setChannels(list.slice(0, 4))
      })
      .catch(() => {
        if (active) setChannels([])
      })
    return () => {
      active = false
    }
  }, [http])

  return (
    <div
      data-mol-id="recommended-channels"
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-low rounded-2xl border border-outline-variant/10',
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          cm.sp('mb', 4),
          'text-on-surface-variant uppercase tracking-widest',
        )}
      >
        {t('recommendedChannels.title', {}, { defaultValue: 'You might like' })}
      </h3>
      <div className={cm.stack(4)}>
        {channels === null ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : channels.length === 0 ? (
          <p
            data-mol-id="recommended-channels-empty"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
          >
            {t(
              'recommendedChannels.empty',
              {},
              { defaultValue: 'No suggestions yet — create a channel to get started.' },
            )}
          </p>
        ) : (
          channels.map((channel) => (
            <div
              key={channel.id}
              data-mol-id={`recommended-channel-${channel.id}`}
              className={cm.flex({ align: 'center', justify: 'between' })}
            >
              <div className={cm.flex({ align: 'center', gap: 3 })}>
                <div
                  className={cm.cn(
                    cm.w(8),
                    cm.h(8),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded-lg bg-border text-on-surface-variant',
                  )}
                >
                  <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>tag</span>
                </div>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {t(
                    'recommendedChannels.channel',
                    { name: `#${channel.name}` },
                    { defaultValue: '{{name}}' },
                  )}
                </span>
              </div>
              <Link
                data-mol-id={`recommended-channel-${channel.id}-open`}
                className={cm.cn(
                  'text-xs font-bold text-primary px-3 py-1 bg-surface rounded border border-primary/20 hover:bg-primary hover:text-on-primary transition-all',
                )}
                to={`/channels/${channel.id}`}
              >
                {t('common.open', {}, { defaultValue: 'Open' })}
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
export { RecommendedChannels }
