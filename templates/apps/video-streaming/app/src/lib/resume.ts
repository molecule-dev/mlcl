/**
 * The playback position (seconds) to seek to when resuming a video, given the saved position and the
 * video's duration.
 *
 * The saved `watch_history.position_sec` was persisted and surfaced as a "Resume" button, but the
 * player never sought to it. This is the pure decision the player now applies on load: resume to the
 * saved position, EXCEPT start from 0 when there is no saved progress, or when the saved position is
 * within the last few seconds of a known duration (the video was essentially finished — restart it).
 */
export function resumePosition(savedSec: number, durationSec: number): number {
  if (!Number.isFinite(savedSec) || savedSec <= 0) return 0
  if (Number.isFinite(durationSec) && durationSec > 0 && savedSec >= durationSec - 5) return 0
  return savedSec
}
