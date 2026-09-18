import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Channel {
  id: string
  name: string
  handle: string
  subscriber_count: number
  video_count: number
  avatar_index: number
  banner_index?: number
  description?: string
  subscribed?: boolean
  has_new?: boolean
  unread_count?: number
}

interface ChannelStripCardProps {
  channel: Channel
  /** Layout: 'horizontal' is the wide row card; 'vertical' is the
   *  centered avatar-first card used in subscription rails. */
  layout?: 'horizontal' | 'vertical'
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #f43f5e 0%, #be185d 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #c2410c 100%)',
  'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  'linear-gradient(135deg, #ec4899 0%, #9d174d 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
]

function fmtSubscribers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

/**
 * Editorial channel card — circular gradient avatar with optional
 * unread/new dot, channel name in tight tracking, handle + subscriber
 * count meta, subscribe pill (rose accent when not subscribed,
 * surface-container when subscribed). Two layout modes:
 * horizontal (used in Subscriptions feed list) and vertical
 * (used in channel grid + sidebar).
 *
 * Translated from music-streaming's PlaylistGrid card +
 * personal-finance's ActivityRow row pattern, recoloured with Spool's
 * violet/rose accent palette.
 */
export function ChannelStripCard({ channel, layout = 'horizontal' }: ChannelStripCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const avatarGradient = AVATAR_GRADIENTS[channel.avatar_index % AVATAR_GRADIENTS.length]
  const subscribed = !!channel.subscribed

  const SubscribeButton = (
    <span
      className={cm.cn(
        'inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-xs font-bold uppercase tracking-widest transition-colors',
        subscribed
          ? 'bg-surface-container-low text-on-surface border border-outline-variant hover:bg-surface-container'
          : 'bg-primary text-on-primary hover:bg-primary/90',
      )}
    >
      {subscribed ? (
        <>
          <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
            check
          </span>
          {t('channelStripCard.subscribed', {}, { defaultValue: 'Subscribed' })}
        </>
      ) : (
        t('channelStripCard.subscribe', {}, { defaultValue: 'Subscribe' })
      )}
    </span>
  )

  if (layout === 'vertical') {
    return (
      <Link
        to={`/channel/${channel.id}`}
        className={cm.cn(
          'group block bg-surface-container-lowest rounded-2xl p-5 text-center hover:shadow-lg transition-all hover:-translate-y-0.5',
        )}
      >
        <div className={cm.cn('relative inline-block')}>
          <div
            className={cm.cn(
              'w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-md',
            )}
            style={{ background: avatarGradient }}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-[36px] text-white/85')}>
              person
            </span>
          </div>
          {channel.has_new && (
            <span
              className={cm.cn(
                'absolute top-0 right-0 w-3 h-3 rounded-full bg-error border-2 border-surface-container-lowest',
              )}
              aria-hidden="true"
            />
          )}
        </div>
        <h3
          className={cm.cn(
            'mt-3 text-sm font-extrabold tracking-tight truncate group-hover:text-primary transition-colors',
          )}
        >
          {channel.name}
        </h3>
        <p className={cm.cn('text-[11px] text-on-surface-variant tabular-nums mt-0.5')}>
          {t(
            'channelStripCard.subscribersCount',
            { count: fmtSubscribers(channel.subscriber_count) },
            { defaultValue: '{{count}} subscribers' },
          )}
        </p>
        <div className={cm.cn('mt-3 inline-block')}>{SubscribeButton}</div>
      </Link>
    )
  }

  return (
    <Link
      to={`/channel/${channel.id}`}
      className={cm.cn(
        'group flex items-center gap-4 p-4 rounded-2xl bg-surface-container-lowest hover:shadow-lg hover:shadow-on-surface/5 transition-all',
      )}
    >
      <div
        className={cm.cn(
          'w-16 h-16 rounded-full shrink-0 flex items-center justify-center shadow-md relative',
        )}
        style={{ background: avatarGradient }}
        aria-hidden="true"
      >
        <span className={cm.cn('material-symbols-outlined text-[28px] text-white/85')}>person</span>
        {channel.has_new && (
          <span
            className={cm.cn(
              'absolute top-0 right-0 w-3 h-3 rounded-full bg-error border-2 border-surface-container-lowest',
            )}
            aria-hidden="true"
          />
        )}
      </div>
      <div className={cm.cn('flex-1 min-w-0')}>
        <h3
          className={cm.cn(
            'text-base font-extrabold tracking-tight truncate group-hover:text-primary transition-colors',
          )}
        >
          {channel.name}
        </h3>
        <div className={cm.cn('flex items-center gap-1.5 mt-0.5 text-xs text-on-surface-variant')}>
          <span className={cm.cn('truncate')}>@{channel.handle}</span>
          <span aria-hidden="true">·</span>
          <span className={cm.cn('tabular-nums shrink-0')}>
            {t(
              'channelStripCard.subscribersCount',
              { count: fmtSubscribers(channel.subscriber_count) },
              { defaultValue: '{{count}} subscribers' },
            )}
          </span>
        </div>
        {channel.description && (
          <p className={cm.cn('text-xs text-on-surface-variant line-clamp-1 mt-1')}>
            {channel.description}
          </p>
        )}
      </div>
      <div className={cm.cn('shrink-0')}>{SubscribeButton}</div>
    </Link>
  )
}

export type { Channel }
