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
 * wraps it in a ref + effect, normalizing with `Promise.resolve()`. Two gotchas
 * the package documents:
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

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    let player: VideoPlayer | undefined
    let cancelled = false

    void Promise.resolve(createPlayer({ container, sources, poster, controls: true })).then(
      (instance) => {
        if (cancelled) {
          instance.destroy()
          return
        }
        player = instance
      },
    )

    return () => {
      cancelled = true
      player?.destroy()
    }
  }, [sources, poster])

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
