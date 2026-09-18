import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Clip {
  id: string
  start_beat: number
  length_beats: number
  label?: string
}

export interface TrackLaneItem {
  id: string
  name: string
  type: 'audio' | 'midi' | 'instrument' | 'bus'
  lane_color: string
  clips: Clip[]
  muted?: boolean
  solo?: boolean
  armed?: boolean
  level?: number
  pan?: number
}

interface TrackLaneProps {
  tracks: TrackLaneItem[]
  /** Total beat span shown in the timeline. Defaults to 32. */
  totalBeats?: number
  /** Currently-selected track id — gets the brand left-accent border. */
  selectedId?: string
}

const TYPE_ICON: Record<TrackLaneItem['type'], string> = {
  audio: 'graphic_eq',
  midi: 'piano',
  instrument: 'music_note',
  bus: 'tune',
}

/**
 * DAW timeline track-lane stack — left header (color-pip + name +
 * mute/solo/arm pills) + right clip canvas with rounded clip blocks
 * tinted with the track lane color, alternating-row backgrounds, and
 * a vertical playhead.
 *
 * Translated from music-streaming's TrackTable.tsx (editorial divide-y
 * + uppercase header pattern), re-shaped into the DAW arrangement
 * spec from Fugue's DESIGN.md "Track Lane" component (3px lane-color
 * accent, lane-color clip blocks at 30% opacity, mute/solo/arm pills).
 */
export function TrackLane({ tracks, totalBeats = 32, selectedId }: TrackLaneProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        'overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant',
      )}
    >
      <div
        className={cm.cn(
          'flex items-center gap-2 px-4 py-3 border-b border-outline-variant text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        <span className={cm.cn('w-44 shrink-0')}>
          {t('trackLane.colTrack', {}, { defaultValue: 'Track' })}
        </span>
        <span className={cm.cn('flex-1 min-w-0 font-mono tabular-nums')}>
          {Array.from({ length: Math.min(totalBeats / 4, 16) }, (_, i) => (
            <span key={i} className={cm.cn('inline-block w-[6.25%] text-[10px]')}>
              {i * 4 + 1}
            </span>
          ))}
        </span>
      </div>

      <ul className={cm.cn('divide-y divide-outline-variant/50')}>
        {tracks.map((track, i) => {
          const isSelected = selectedId === track.id
          const rowBg = i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container/30'
          return (
            <li
              key={track.id}
              className={cm.cn('flex items-center', rowBg, track.muted ? 'opacity-50' : '')}
              style={{
                borderLeft: isSelected ? `3px solid ${track.lane_color}` : undefined,
                minHeight: '72px',
              }}
            >
              <div
                className={cm.cn(
                  'w-44 shrink-0 flex items-center gap-2 px-3 py-3 border-r border-outline-variant',
                )}
              >
                <span
                  className={cm.cn('w-2 h-10 rounded-sm shrink-0')}
                  style={{ backgroundColor: track.lane_color }}
                  aria-hidden="true"
                />
                <div className={cm.cn('flex-1 min-w-0')}>
                  <p
                    className={cm.cn(
                      'flex items-center gap-1 text-[13px] font-semibold text-on-surface truncate',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-base text-on-surface-variant',
                      )}
                      aria-hidden="true"
                    >
                      {TYPE_ICON[track.type]}
                    </span>
                    {track.name}
                  </p>
                  <div className={cm.cn(cm.sp('mt', 1), 'flex items-center gap-1')}>
                    <PillButton
                      on={!!track.muted}
                      color="var(--mol-color-text-secondary)"
                      label="M"
                    />
                    <PillButton on={!!track.solo} color="var(--daw-meter-yellow)" label="S" />
                    <PillButton on={!!track.armed} color="var(--daw-record)" label="R" />
                  </div>
                </div>
              </div>

              <div className={cm.cn('relative flex-1 min-w-0 h-[72px]')}>
                <div className={cm.cn('absolute inset-0 flex')}>
                  {Array.from({ length: totalBeats / 4 }, (_, beat) => (
                    <span
                      key={beat}
                      className={cm.cn('border-r border-outline-variant/30 flex-1')}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                {track.clips.map((clip) => {
                  const left = (clip.start_beat / totalBeats) * 100
                  const width = (clip.length_beats / totalBeats) * 100
                  return (
                    <div
                      key={clip.id}
                      className={cm.cn(
                        'absolute top-2 bottom-2 rounded-md border px-2 py-1 text-[10px] font-semibold tracking-tight overflow-hidden flex items-end',
                      )}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        backgroundColor: `${track.lane_color}40`,
                        borderColor: `${track.lane_color}80`,
                        color: track.lane_color,
                      }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[14px] mr-1 opacity-70')}
                        aria-hidden="true"
                      >
                        {TYPE_ICON[track.type]}
                      </span>
                      <span className={cm.cn('truncate')}>{clip.label ?? track.name}</span>
                    </div>
                  )
                })}
                <span
                  className={cm.cn('absolute top-0 bottom-0 w-px')}
                  style={{
                    left: '18%',
                    backgroundColor: 'var(--daw-playhead)',
                    boxShadow: '0 0 6px color-mix(in srgb, var(--daw-playhead) 70%, transparent)',
                  }}
                  aria-hidden="true"
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PillButton({ on, color, label }: { on: boolean; color: string; label: string }) {
  const cm = getClassMap()
  return (
    <span
      className={cm.cn(
        'inline-flex items-center justify-center w-5 h-5 rounded-sm text-[9px] font-black tracking-tighter',
      )}
      style={{
        backgroundColor: on ? color : 'transparent',
        color: on ? '#0c0a13' : color,
        border: `1px solid ${color}80`,
      }}
      aria-hidden="true"
    >
      {label}
    </span>
  )
}
