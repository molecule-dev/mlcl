import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface SceneSummary {
  id: string
  name: string
  description?: string
  /** Material symbol name for the scene icon. */
  icon?: string
  /** Number of devices the scene controls. */
  deviceCount: number
  /** ISO timestamp of last activation. */
  last_activated?: string | null
  active?: boolean
}

interface SceneCardProps {
  scene: SceneSummary
  onActivate?: (id: string) => void
  /** Optional accent colour token name (defaults to 'primary'). */
  tone?: 'primary' | 'secondary' | 'tertiary' | 'info' | 'warning'
}

const TONE_GRADIENT: Record<NonNullable<SceneCardProps['tone']>, string> = {
  primary: 'from-primary to-primary-container',
  secondary: 'from-secondary to-secondary-container',
  tertiary: 'from-tertiary to-tertiary-container',
  info: 'from-info to-info-container',
  warning: 'from-warning to-warning-container',
}

function fmtDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Scene preset card — large rounded-3xl panel with a tinted gradient
 * mood, big scene icon, name + description, and an Activate pill. Active
 * scene gets a glow ring (matches DESIGN.md "Active device rings pulse
 * with glow cyan" principle).
 *
 * Translated from project-management's StatsRow icon-chip pattern + lms's
 * lesson-card hover treatment. Bigger and more decorative than the
 * editorial DeviceStatusRow because scenes are the user's most expressive
 * control surface.
 */
export function SceneCard({ scene, onActivate, tone = 'primary' }: SceneCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 6),
        'min-h-[220px] bg-surface-container-low rounded-3xl hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group',
        scene.active ? 'ring-2 ring-primary/60 shadow-lg' : '',
      )}
    >
      <div
        className={cm.cn(
          'absolute -right-16 -bottom-16 w-48 h-48 rounded-full blur-3xl opacity-30 bg-gradient-to-br',
          TONE_GRADIENT[tone],
        )}
        aria-hidden="true"
      />

      <div className={cm.cn('relative z-10')}>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('mb', 4),
            'bg-gradient-to-br shadow-md text-on-primary group-hover:scale-110 transition-transform',
            TONE_GRADIENT[tone],
          )}
        >
          <span className={'material-symbols-outlined text-2xl'} aria-hidden="true">
            {scene.icon || 'auto_awesome'}
          </span>
        </div>
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 1))}>
          {scene.name}
        </h3>
        {scene.description ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {scene.description}
          </p>
        ) : null}
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('mt', 6),
          'relative z-10',
        )}
      >
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t(
            'sceneCard.deviceCount',
            { count: scene.deviceCount },
            { defaultValue: '{{count}} devices' },
          )}
          {scene.last_activated ? ` · ${fmtDate(scene.last_activated)}` : ''}
        </span>
        {onActivate ? (
          <button
            type="button"
            onClick={() => onActivate(scene.id)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              scene.active
                ? 'bg-primary text-on-primary'
                : 'bg-surface text-on-surface hover:bg-surface-container-high',
              'uppercase tracking-widest shadow-sm transition-all',
            )}
          >
            {scene.active
              ? t('status.active', {}, { defaultValue: 'Active' })
              : t('sceneCard.activate', {}, { defaultValue: 'Activate' })}
          </button>
        ) : null}
      </div>
    </div>
  )
}
