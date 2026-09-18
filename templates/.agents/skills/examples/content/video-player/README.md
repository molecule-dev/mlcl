---
name: video-player
intent: |
  - "Play a video"
  - "Video player"
  - "Live stream / HLS"
  - "Embed a video player"
  - "Watch videos in the app"
keywords: [video, player, stream, streaming, hls, m3u8, live, playback, mp4, media, watch, dash]
---

# Video player (MP4 + HLS live streaming)

**When to copy this example:** the user wants to play video in the app —
an uploaded MP4, a course lesson, or a live `.m3u8` HLS stream.

**Plain MP4/WebM plays with no extra provider.** For HLS (`.m3u8`)
streaming that works in EVERY browser (not just Safari), bond
`@molecule/app-video-hls`.

## What you'll install

```bash
cd /workspace
# The video feature (native MP4/WebM playback is built in).
npm install @molecule/app-video --workspace=app
# Add HLS (.m3u8) streaming in every browser (adaptive bitrate, no key):
npm install @molecule/app-video-hls --workspace=app
```

## Files in this example

| Path                                 | What it does                                                                                                                                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/VideoPlayerView.tsx` | `<VideoPlayerView sources={[{ src, type }]} />` — wraps the imperative `createPlayer()` from `@molecule/app-video` in a ref + effect (normalizes sync/async, destroys on unmount). Provider-agnostic. |

Usage — an MP4 needs no provider; an `.m3u8` needs the HLS bond wired:

```tsx
// Progressive MP4 (works out of the box):
<VideoPlayerView sources={[{ src: '/media/lesson.mp4', type: 'video/mp4' }]} />

// HLS live stream (requires the app-video-hls bond, see below):
<VideoPlayerView
  sources={[{ src: 'https://example.com/live.m3u8', type: 'application/x-mpegurl' }]}
/>
```

## Bond wiring (app entry, e.g. `app/src/main.tsx`, ONCE — only for HLS)

```typescript
import { setProvider } from '@molecule/app-video'
import { provider } from '@molecule/app-video-hls'

setProvider(provider) // .m3u8 now plays in Chrome/Firefox too, with adaptive bitrate
```

## Anti-patterns

- Do not point an `.m3u8` source at the built-in native provider and expect
  it to play everywhere. Native HTML5 plays HLS in Safari ONLY — bond
  `@molecule/app-video-hls` for Chrome/Firefox/Edge.
- Do not mark an HLS stream with `type: 'video/mp4'`. Use
  `type: 'application/x-mpegurl'` (or a `.m3u8` URL) so the provider routes
  it through hls.js.
- Do not skip `player.destroy()` on unmount. It tears down the media element
  AND the hls.js instance (network + buffers) — VideoPlayerView does this in
  its effect cleanup; leaking it keeps a background stream downloading.
- Do not put the player in a zero-height container. It fills its parent, so
  a parent with no height renders an invisible player (VideoPlayerView sets
  360px).
- Do not import `hls.js` (or any video library) directly in components. Build
  `sources` + call `createPlayer()` through `@molecule/app-video` so the
  provider stays swappable.
- `.mpd` (MPEG-DASH) is not covered by the HLS bond — for DASH, implement the
  `VideoProvider` interface against Shaka Player or dash.js.

## Verify

An MP4 source renders a player with controls and plays. With
`@molecule/app-video-hls` bonded, an `.m3u8` source plays in Chrome/Firefox
with adaptive bitrate; unmounting the component stops the stream (no
lingering network in devtools).
