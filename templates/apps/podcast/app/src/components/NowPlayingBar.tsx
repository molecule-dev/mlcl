import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  cycleRate,
  hydrateFromServer,
  type PlayerState,
  seekBy,
  subscribe,
  togglePlay,
} from '../lib/player.js'

/**
 * Persistent bottom-of-screen player.
 *
 * State source: the singleton `player` module (NOT a per-component fetch
 * loop) — that's what makes audio survive route changes. The bar
 * subscribes once on mount and renders whatever the player module
 * publishes.
 */
export function NowPlayingBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [state, setState] = useState<PlayerState | null>(null)

  useEffect(() => {
    const unsub = subscribe(setState)
    void hydrateFromServer()
    return unsub
  }, [])

  if (!state || !state.track) {
    return (
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('px', 6),
          cm.sp('py', 5),
          'fixed bottom-0 left-0 right-0 z-40',
        )}
        style={{
          backgroundColor: 'var(--color-now-playing-bg)',
          color: 'var(--color-now-playing-text)',
          height: '88px',
        }}
        data-testid="now-playing-idle"
      >
        <p className={cm.cn(cm.textSize('sm'))} style={{ opacity: 0.6 }}>
          {t('nowPlaying.idle', {}, { defaultValue: 'Nothing playing — pick an episode' })}
        </p>
      </div>
    )
  }

  const dur = state.duration || state.track.duration_seconds || 0
  const positionPct = dur > 0 ? Math.min(100, (state.position / dur) * 100) : 0
  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${(Math.floor(s) % 60).toString().padStart(2, '0')}`

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('px', 4),
        'fixed bottom-0 left-0 right-0 z-40',
      )}
      style={{
        backgroundColor: 'var(--color-now-playing-bg)',
        color: 'var(--color-now-playing-text)',
        height: '88px',
      }}
      data-testid="now-playing-bar"
    >
      <div
        className={cm.flex({ align: 'center', gap: 'sm' })}
        style={{ width: '320px', flexShrink: 0 }}
      >
        <div
          className={cm.cn(cm.h(14), cm.w(14), 'rounded shrink-0')}
          style={{ background: `var(--color-cover-${state.track.cover_index ?? 0})` }}
          aria-hidden="true"
        />
        <div className={'min-w-0'}>
          <p
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}
            data-testid="now-playing-title"
          >
            {state.track.episode_title}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'truncate')} style={{ opacity: 0.7 }}>
            {state.track.show_title}
          </p>
        </div>
      </div>

      <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }), cm.flex1)}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <TransportButton
            label={t('nowPlaying.skipBack', {}, { defaultValue: 'Skip back 30s' })}
            icon="replay_30"
            onClick={() => seekBy(-30)}
          />
          <button
            type="button"
            onClick={togglePlay}
            aria-label={
              state.isPlaying
                ? t('common.pause', {}, { defaultValue: 'Pause' })
                : t('common.play', {}, { defaultValue: 'Play' })
            }
            className={cm.cn(
              cm.h(11),
              cm.w(11),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-full',
            )}
            style={{ backgroundColor: 'white', color: 'var(--color-now-playing-bg)' }}
            data-testid="now-playing-toggle"
          >
            <span className={'material-symbols-outlined text-xl'} aria-hidden="true">
              {state.isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <TransportButton
            label={t('nowPlaying.skipForward', {}, { defaultValue: 'Skip forward 30s' })}
            icon="forward_30"
            onClick={() => seekBy(30)}
          />
        </div>
        <div
          className={cm.flex({ align: 'center', gap: 'sm' })}
          style={{ width: '100%', maxWidth: '600px' }}
        >
          <span
            className={cm.cn(cm.textSize('xs'))}
            style={{ opacity: 0.6, fontFamily: 'var(--mol-font-mono)' }}
          >
            {fmt(state.position)}
          </span>
          <div
            className={cm.flex1}
            style={{
              height: '4px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: '2px',
            }}
          >
            <div
              style={{
                width: `${positionPct}%`,
                height: '100%',
                backgroundColor: 'white',
                borderRadius: '2px',
              }}
            />
          </div>
          <span
            className={cm.cn(cm.textSize('xs'))}
            style={{ opacity: 0.6, fontFamily: 'var(--mol-font-mono)' }}
          >
            {fmt(dur)}
          </span>
        </div>
      </div>

      <div
        className={cm.flex({ align: 'center', gap: 'sm' })}
        style={{ width: '220px', justifyContent: 'flex-end', flexShrink: 0 }}
      >
        <button
          type="button"
          onClick={() => cycleRate()}
          aria-label={t('nowPlaying.speedAria', {}, { defaultValue: 'Playback speed' })}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'rounded-full',
          )}
          style={{ color: 'inherit', border: '1px solid rgba(255,255,255,0.2)' }}
          data-testid="now-playing-rate"
        >
          {state.rate}×
        </button>
      </div>
    </div>
  )
}

function TransportButton({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: string
  onClick: () => void
}) {
  const cm = getClassMap()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cm.cn(
        cm.h(8),
        cm.w(8),
        cm.flex({ align: 'center', justify: 'center' }),
        'rounded-full',
      )}
      style={{ color: 'inherit', opacity: 0.85 }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '20px' }} aria-hidden="true">
        {icon}
      </span>
    </button>
  )
}
