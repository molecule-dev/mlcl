import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * The signature classroom canvas — full-bleed dark video grid with a
 * floating pill-shaped control toolbar and a recording badge.
 *
 * Inspired by personal-finance's gradient hero (decorative orbs + glassy
 * pill chrome) re-cast for the dark video-conf surface called for in
 * Aula's DESIGN.md (#111827 video grid + #1e1b3a toolbar).
 */
export interface ClassroomStageProps {
  classTitle?: string
  courseLabel?: string
  isRecording?: boolean
  participantCount?: number
}

type Tile = {
  name: string
  role?: string
  speaking?: boolean
  muted?: boolean
  cameraOff?: boolean
  raisedHand?: boolean
  presenter?: boolean
  imageSeed?: string
  initials?: string
  avatarBg?: string
  avatarText?: string
}

const TILES: Tile[] = [
  {
    name: 'Prof. Maya Okafor',
    role: 'Instructor',
    speaking: true,
    presenter: true,
    imageSeed: 'aula-tile-1',
  },
  { name: 'Aiyana Vega', imageSeed: 'aula-tile-2' },
  { name: 'Kenji Park', muted: true, imageSeed: 'aula-tile-3' },
  { name: 'Priya Shah', raisedHand: true, imageSeed: 'aula-tile-4' },
  {
    name: 'Liam Bennett',
    cameraOff: true,
    initials: 'LB',
    avatarBg: 'bg-primary-container',
    avatarText: 'text-on-primary-container',
  },
  { name: 'Noor Hadid', muted: true, imageSeed: 'aula-tile-6' },
  {
    name: 'Tomás Reyes',
    cameraOff: true,
    initials: 'TR',
    avatarBg: 'bg-secondary/40',
    avatarText: 'text-on-secondary',
  },
  { name: 'Eva Lindberg', imageSeed: 'aula-tile-8' },
]

export function ClassroomStage({
  classTitle,
  courseLabel,
  isRecording = true,
  participantCount = TILES.length,
}: ClassroomStageProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const heading =
    classTitle ??
    t('classroomStage.title', {}, { defaultValue: 'Lecture 14 — Vector fields & flux' })
  const course =
    courseLabel ?? t('classroomStage.course', {}, { defaultValue: 'Calculus II · MTH 202' })

  return (
    <div
      className={cm.cn(
        'relative rounded-3xl overflow-hidden bg-[var(--aula-video-grid)] text-white shadow-2xl',
      )}
    >
      <div
        className={cm.cn(
          'absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black/40 pointer-events-none',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'relative bg-foreground/30 backdrop-blur-md border-b border-surface/10',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
          {isRecording && (
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                'rounded-full bg-error/90 text-on-error text-[10px] uppercase tracking-widest',
              )}
            >
              <span
                className={cm.cn('h-2 w-2 rounded-full bg-surface animate-pulse')}
                aria-hidden="true"
              ></span>
              {t('classroomStage.recording', {}, { defaultValue: 'Rec · 14:21' })}
            </span>
          )}
          <div>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'leading-tight')}>
              {heading}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'opacity-70')}>{course}</p>
          </div>
        </div>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.textSize('xs'), 'opacity-90')}
        >
          <span className={cm.cn('material-symbols-outlined text-[16px]')}>group</span>
          <span className={cm.cn('font-semibold tabular-nums')}>
            {t(
              'classroomStage.participants',
              { count: participantCount },
              { defaultValue: '{{count}} attending' },
            )}
          </span>
        </div>
      </div>
      <div
        className={cm.cn(
          'relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 p-1 bg-[var(--aula-video-grid)]',
        )}
      >
        {TILES.slice(0, participantCount).map((tile) => (
          <div
            key={tile.name}
            className={cm.cn(
              'relative aspect-video overflow-hidden rounded-md bg-[var(--mol-color-text)]',
              tile.speaking && 'ring-2 ring-primary',
              tile.presenter && 'col-span-2 row-span-2',
            )}
          >
            {tile.cameraOff ? (
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.h('full'),
                  cm.w('full'),
                )}
              >
                <div
                  className={cm.cn(
                    'h-16 w-16 rounded-full flex items-center justify-center text-lg font-bold',
                    tile.avatarBg ?? 'bg-primary-container',
                    tile.avatarText ?? 'text-on-primary-container',
                  )}
                >
                  {tile.initials}
                </div>
              </div>
            ) : (
              <img
                alt={tile.name}
                src={`https://picsum.photos/seed/${tile.imageSeed}/900/600`}
                className={cm.cn('h-full w-full object-cover')}
              />
            )}
            <div
              className={cm.cn(
                'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none',
              )}
            ></div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                'absolute inset-x-2 bottom-2',
              )}
            >
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'py-0.5 rounded-md bg-foreground/60 text-white truncate max-w-[70%]',
                )}
              >
                {tile.name}
                {tile.role ? (
                  <span
                    className={cm.cn(
                      'ml-1.5 text-[9px] uppercase tracking-widest text-secondary-light',
                    )}
                  >
                    {tile.role}
                  </span>
                ) : null}
              </span>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
                {tile.muted && (
                  <span
                    className={cm.cn(
                      'h-6 w-6 rounded-full bg-error/80 text-on-error flex items-center justify-center',
                    )}
                    aria-label={t('classroomStage.muted', {}, { defaultValue: 'Muted' })}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[14px]')}>mic_off</span>
                  </span>
                )}
                {tile.cameraOff && (
                  <span
                    className={cm.cn(
                      'h-6 w-6 rounded-full bg-foreground/70 text-white flex items-center justify-center',
                    )}
                    aria-label={t('classroomStage.cameraOff', {}, { defaultValue: 'Camera off' })}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[14px]')}>
                      videocam_off
                    </span>
                  </span>
                )}
              </div>
            </div>
            {tile.raisedHand && (
              <span
                className={cm.cn(
                  'absolute top-2 left-2 h-7 w-7 rounded-full bg-warning/90 text-[var(--color-on-warning,#2a1c00)] flex items-center justify-center shadow-lg',
                )}
                aria-label={t('classroomStage.handRaised', {}, { defaultValue: 'Hand raised' })}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>front_hand</span>
              </span>
            )}
            {tile.presenter && (
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.fontWeight('bold'),
                  'absolute top-3 left-3 rounded-full bg-success/90 text-[var(--color-on-success,#002200)] text-[10px] uppercase tracking-widest',
                )}
              >
                {t('classroomStage.presenting', {}, { defaultValue: 'Presenting' })}
              </span>
            )}
          </div>
        ))}
      </div>
      <div
        className={cm.cn(
          cm.flex({ justify: 'center' }),
          'absolute inset-x-0 bottom-6 z-10 pointer-events-none',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            'rounded-full bg-[var(--mol-color-text)]/95 backdrop-blur-md border border-surface/10 shadow-2xl pointer-events-auto',
          )}
        >
          {[
            { icon: 'mic', label: 'Mute', tone: 'default' as const },
            { icon: 'videocam', label: 'Camera', tone: 'default' as const },
            { icon: 'present_to_all', label: 'Share', tone: 'default' as const },
            { icon: 'pan_tool', label: 'Raise hand', tone: 'accent' as const },
            { icon: 'forum', label: 'Chat', tone: 'default' as const },
            { icon: 'edit_square', label: 'Whiteboard', tone: 'default' as const },
            { icon: 'meeting_room', label: 'Breakouts', tone: 'default' as const },
            { icon: 'call_end', label: 'Leave', tone: 'destructive' as const },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => {}}
              // TODO: wire to media
              className={cm.cn(
                'h-11 w-11 rounded-full flex items-center justify-center transition-colors',
                btn.tone === 'destructive' && 'bg-error text-on-error hover:bg-error/90',
                btn.tone === 'accent' && 'bg-secondary text-on-secondary hover:bg-secondary-dark',
                btn.tone === 'default' && 'bg-surface/10 text-white hover:bg-surface/20',
              )}
              aria-label={btn.label}
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>{btn.icon}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ClassroomStage
