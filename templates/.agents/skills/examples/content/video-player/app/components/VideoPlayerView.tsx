import { useEffect, useRef } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { createPlayer, type VideoPlayer, type VideoSource } from '@molecule/app-video'

const cm = getClassMap()

/**
 * Renders a video player for the given sources using the bonded video provider
 * from `@molecule/app-video`.
 *
 * `createPlayer()` is imperative — it takes a container element and returns a
 * `VideoPlayer` (which MAY be a promise, depending on the provider) — so this
 * wraps it in a ref + effect, normalizing with `Promise.resolve()`. The call
 * itself is DEFERRED into the chain (`Promise.resolve().then(() => create…)`),
 * never passed as `Promise.resolve`'s argument: a provider that throws
 * SYNCHRONOUSLY (a container it refuses, a codec/element it cannot bind) would
 * escape the effect before the rejection handler below exists — React surfaces
 * the exception out of the passive effect (an error boundary, or a blank panel
 * with nothing logged) instead of the logged, blank-panel failure. Deferring
 * puts both failure modes on the same path. Two gotchas the package documents:
 *
 * - The container needs an explicit height (fills 100% of its parent); a
 *   zero-height parent renders an invisible player. `height` defaults to 360.
 * - ALWAYS `destroy()` on unmount — it tears down media/network (and the hls.js
 *   instance, when the `@molecule/app-video-hls` provider is bonded).
 */
export function VideoPlayerView({
  sources,
  poster,
  height = 360,
}: {
  sources: VideoSource[]
  poster?: string
  height?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  // The latest props for the effect body below: the effect is keyed on the
  // sources' CONTENT (see `sourcesKey`), so the body reads them through a ref
  // instead of re-running when only the array's IDENTITY changed.
  const sourcesRef = useRef(sources)
  sourcesRef.current = sources
  /**
   * The sources' content, as one of the effect's dependencies.
   *
   * Keyed on the array itself, the effect re-ran on every parent render that
   * passed a fresh array — which is exactly the usage this slice's README
   * documents (`sources={[{ src: '/media/lesson.mp4', type: 'video/mp4' }]}`).
   * The cleanup called `destroy()` and the body built a new player: playback
   * restarted and the media (or the hls.js stream) was re-fetched, on any
   * unrelated state change in the parent. The CONTENT is what invalidates a
   * player.
   */
  const sourcesKey = JSON.stringify(sources)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const sources = sourcesRef.current
    let player: VideoPlayer | undefined
    let cancelled = false

    // Deferred (see the note above): a synchronous throw must reach the
    // rejection handler, not escape the effect.
    void Promise.resolve()
      .then(() => createPlayer({ container, sources, poster, controls: true }))
      .then(
        (instance) => {
          if (cancelled) {
            instance.destroy()
            return
          }
          player = instance
        },
        (error: unknown) => {
          // A rejected createPlayer must not vanish as an unhandled rejection —
          // the container would just stay blank with nothing to diagnose.
          console.error('video player failed to initialize', error)
        },
      )

    return () => {
      cancelled = true
      player?.destroy()
    }
  }, [sourcesKey, poster])

  return (
    <div
      ref={containerRef}
      data-mol-id="video-player"
      className={cm.cn(cm.card({}))}
      style={{ height, width: '100%', overflow: 'hidden' }}
    />
  )
}

export default VideoPlayerView
