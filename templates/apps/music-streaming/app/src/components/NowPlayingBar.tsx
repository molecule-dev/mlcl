import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { toggleLike } from '../lib/likes.js'
import { usePlayer } from '../lib/player.js'
import { useIsMobile } from '../lib/use-is-mobile.js'

/** Height of the docked player bar on desktop (md+). Pages offset by this. */
export const PLAYER_BAR_HEIGHT_DESKTOP = 88
/** Height of the docked player bar on mobile (<md) — taller: two stacked rows. */
export const PLAYER_BAR_HEIGHT_MOBILE = 96

export function NowPlayingBar() {
  const isMobile = useIsMobile()
  // Conditional RENDER (not CSS-hide) keeps `data-testid`s unique in the DOM.
  return isMobile ? <CompactBar /> : <DesktopBar />
}

function IdleBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('px', 4),
        'fixed bottom-0 left-0 right-0 z-40',
      )}
      style={{
        backgroundColor: 'var(--color-now-playing-bg)',
        color: 'var(--color-now-playing-text)',
        height: '88px',
      }}
    >
      <p className={cm.cn(cm.textSize('sm'), 'text-center')} style={{ opacity: 0.6 }}>
        {t('nowPlaying.idle', {}, { defaultValue: 'Nothing playing — pick a track or playlist' })}
      </p>
    </div>
  )
}

function useNowPlayingState() {
  const http = useHttpClient()
  const player = usePlayer()
  const [liked, setLiked] = useState<boolean | undefined>(undefined)

  const np = player.current
  const effectiveLiked = liked ?? np?.liked ?? false

  const handleLike = async () => {
    if (!np) return
    const newLiked = await toggleLike(http, np.id, effectiveLiked)
    setLiked(newLiked)
  }

  const totalDuration = np ? (player.duration > 0 ? player.duration : np.duration_seconds) : 0
  const positionPct = totalDuration > 0 ? Math.min(100, (player.position / totalDuration) * 100) : 0
  const fmt = (s: number) => {
    const safe = Number.isFinite(s) && s >= 0 ? Math.floor(s) : 0
    return `${Math.floor(safe / 60)}:${(safe % 60).toString().padStart(2, '0')}`
  }

  return { http, player, np, effectiveLiked, handleLike, totalDuration, positionPct, fmt }
}

function DesktopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { np, effectiveLiked, handleLike, player, totalDuration, positionPct, fmt } =
    useNowPlayingState()

  if (!np) return <IdleBar />

  return (
    <div
      data-testid="now-playing-bar"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('px', 4),
        'fixed bottom-0 left-0 right-0 z-40',
      )}
      style={{
        backgroundColor: 'var(--color-now-playing-bg)',
        color: 'var(--color-now-playing-text)',
        height: `${PLAYER_BAR_HEIGHT_DESKTOP}px`,
      }}
    >
      {/* Cover + track info */}
      <div
        className={cm.flex({ align: 'center', gap: 'sm' })}
        style={{ width: '300px', flexShrink: 0 }}
      >
        <div
          className={cm.cn(cm.h(14), cm.w(14), 'rounded shrink-0')}
          style={{ background: `var(--color-cover-${np.cover_index})` }}
          aria-hidden="true"
        />
        <div className={cm.cn('min-w-0')}>
          <p
            data-testid="now-playing-title"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}
          >
            {np.title}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'truncate')} style={{ opacity: 0.7 }}>
            {np.artist}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleLike()
          }}
          aria-pressed={effectiveLiked}
          aria-label={t('nowPlaying.likeAria', {}, { defaultValue: 'Like track' })}
          className={cm.cn(
            cm.shrink0,
            cm.h(8),
            cm.w(8),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full',
          )}
          style={{
            color: effectiveLiked ? 'var(--color-primary)' : 'inherit',
            opacity: effectiveLiked ? 1 : 0.7,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '20px' }}
            aria-hidden="true"
          >
            {effectiveLiked ? 'favorite' : 'favorite_border'}
          </span>
        </button>
      </div>

      {/* Transport controls + progress */}
      <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }), cm.flex1)}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <TransportButton
            label={t('nowPlaying.shuffle', {}, { defaultValue: 'Shuffle' })}
            icon="shuffle"
            on={player.isShuffled}
            onClick={() => player.toggleShuffle()}
          />
          <TransportButton
            label={t('nowPlaying.previous', {}, { defaultValue: 'Previous track' })}
            icon="skip_previous"
            onClick={() => {
              void player.previous()
            }}
          />
          <button
            type="button"
            data-testid="now-playing-toggle"
            onClick={() => {
              void player.toggle()
            }}
            aria-label={
              player.isPlaying
                ? t('common.pause', {}, { defaultValue: 'Pause' })
                : t('common.play', {}, { defaultValue: 'Play' })
            }
            className={cm.cn(
              cm.h(10),
              cm.w(10),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-full',
            )}
            style={{ backgroundColor: 'white', color: 'var(--color-now-playing-bg)' }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {player.isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <TransportButton
            label={t('nowPlaying.next', {}, { defaultValue: 'Next track' })}
            icon="skip_next"
            onClick={() => {
              void player.next()
            }}
          />
          <TransportButton
            label={t('nowPlaying.repeat', {}, { defaultValue: 'Repeat' })}
            icon={player.repeatMode === 'one' ? 'repeat_one' : 'repeat'}
            on={player.repeatMode !== 'off'}
            onClick={() => player.cycleRepeat()}
          />
        </div>
        <div
          className={cm.flex({ align: 'center', gap: 'sm' })}
          style={{ width: '100%', maxWidth: '600px' }}
        >
          <span
            data-testid="now-playing-position"
            className={cm.cn(cm.textSize('xs'))}
            style={{ opacity: 0.6, fontFamily: 'var(--mol-font-mono)' }}
          >
            {fmt(player.position)}
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
            {fmt(totalDuration)}
          </span>
        </div>
      </div>

      {/* Volume + queue */}
      <div
        className={cm.flex({ align: 'center', gap: 'sm' })}
        style={{ width: '180px', justifyContent: 'flex-end', flexShrink: 0 }}
      >
        <TransportButton
          label={t('nowPlaying.volume', {}, { defaultValue: 'Volume' })}
          icon={player.volume === 0 ? 'volume_off' : 'volume_up'}
          onClick={() => player.setVolume(player.volume === 0 ? 80 : 0)}
        />
        <TransportButton
          label={t('nowPlaying.queue', {}, { defaultValue: 'Queue' })}
          icon="queue_music"
          onClick={() => {
            navigate('/queue')
          }}
        />
      </div>
    </div>
  )
}

/**
 * Phone-class docked player (<md): the desktop row (~300px info + ~180px
 * volume/queue sections) needs ~700px and overflows a 390px viewport.
 * Compact shape: a tap-to-seek progress strip on top, then cover + text +
 * the four controls that matter on a phone (like, prev, play, next, queue).
 * Shuffle/repeat/volume stay on the full /now-playing screen.
 */
function CompactBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { np, effectiveLiked, handleLike, player, totalDuration, positionPct, fmt } =
    useNowPlayingState()

  if (!np) return <IdleBar />

  const seekFromEvent = (e: React.MouseEvent<HTMLElement>) => {
    if (totalDuration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / Math.max(1, rect.width)
    player.seek(Math.max(0, Math.min(1, ratio)) * totalDuration)
  }

  return (
    <div
      data-testid="now-playing-bar"
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'center' }),
        'fixed bottom-0 left-0 right-0 z-40',
      )}
      style={{
        backgroundColor: 'var(--color-now-playing-bg)',
        color: 'var(--color-now-playing-text)',
        height: `${PLAYER_BAR_HEIGHT_MOBILE}px`,
      }}
    >
      {/* Tap-to-seek progress strip */}
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('px', 3))}>
        <span
          data-testid="now-playing-position"
          className={cm.cn(cm.textSize('xs'), cm.shrink0)}
          style={{ opacity: 0.6, fontFamily: 'var(--mol-font-mono)' }}
        >
          {fmt(player.position)}
        </span>
        <button
          type="button"
          aria-label={t('nowPlaying.seekAria', {}, { defaultValue: 'Seek' })}
          onClick={seekFromEvent}
          className={cm.flex1}
          style={{
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            padding: 0,
          }}
        >
          <span
            style={{
              display: 'block',
              width: '100%',
              height: '4px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
            aria-hidden="true"
          >
            <span
              style={{
                display: 'block',
                width: `${positionPct}%`,
                height: '100%',
                backgroundColor: 'white',
                borderRadius: '2px',
              }}
            />
          </span>
        </button>
        <span
          className={cm.cn(cm.textSize('xs'), cm.shrink0)}
          style={{ opacity: 0.6, fontFamily: 'var(--mol-font-mono)' }}
        >
          {fmt(totalDuration)}
        </span>
      </div>

      {/* Cover + info + transport, one tappable row */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('px', 2),
          cm.sp('py', 1),
        )}
      >
        <div
          className={cm.cn(cm.h(11), cm.w(11), 'rounded shrink-0')}
          style={{ background: `var(--color-cover-${np.cover_index})` }}
          aria-hidden="true"
        />
        <div className={cm.cn('min-w-0 flex-1', cm.sp('px', 1))}>
          <p
            data-testid="now-playing-title"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}
          >
            {np.title}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'truncate')} style={{ opacity: 0.7 }}>
            {np.artist}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleLike()
          }}
          aria-pressed={effectiveLiked}
          aria-label={t('nowPlaying.likeAria', {}, { defaultValue: 'Like track' })}
          className={cm.cn(
            cm.shrink0,
            'h-10 w-10 rounded-full flex items-center justify-center',
          )}
          style={{
            color: effectiveLiked ? 'var(--color-primary)' : 'inherit',
            opacity: effectiveLiked ? 1 : 0.7,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '22px' }}
            aria-hidden="true"
          >
            {effectiveLiked ? 'favorite' : 'favorite_border'}
          </span>
        </button>
        <button
          type="button"
          aria-label={t('nowPlaying.previous', {}, { defaultValue: 'Previous track' })}
          onClick={() => {
            void player.previous()
          }}
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ color: 'inherit', opacity: 0.75 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }} aria-hidden="true">
            skip_previous
          </span>
        </button>
        <button
          type="button"
          data-testid="now-playing-toggle"
          onClick={() => {
            void player.toggle()
          }}
          aria-label={
            player.isPlaying
              ? t('common.pause', {}, { defaultValue: 'Pause' })
              : t('common.play', {}, { defaultValue: 'Play' })
          }
          className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'white', color: 'var(--color-now-playing-bg)' }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {player.isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <button
          type="button"
          aria-label={t('nowPlaying.next', {}, { defaultValue: 'Next track' })}
          onClick={() => {
            void player.next()
          }}
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ color: 'inherit', opacity: 0.75 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }} aria-hidden="true">
            skip_next
          </span>
        </button>
        <button
          type="button"
          aria-label={t('nowPlaying.queue', {}, { defaultValue: 'Queue' })}
          onClick={() => {
            navigate('/queue')
          }}
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ color: 'inherit', opacity: 0.75 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }} aria-hidden="true">
            queue_music
          </span>
        </button>
      </div>
    </div>
  )
}

function TransportButton({
  label,
  icon,
  on,
  onClick,
}: {
  label: string
  icon: string
  on?: boolean
  onClick: () => void
}) {
  const cm = getClassMap()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      className={cm.cn(
        cm.h(8),
        cm.w(8),
        cm.flex({ align: 'center', justify: 'center' }),
        'rounded-full',
      )}
      style={{ color: 'inherit', opacity: on ? 1 : 0.7 }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '20px', color: on ? 'var(--color-primary)' : 'inherit' }}
        aria-hidden="true"
      >
        {icon}
      </span>
    </button>
  )
}
