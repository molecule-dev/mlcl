import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type GenerationStatus, GenerationStatusPill } from './GenerationStatusPill.js'

export interface Generation {
  id: string
  prompt: string
  status: GenerationStatus
  thumbnailUrl?: string
  model: string
  seed: number
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9'
  createdAt: string
}

export interface GenerationCardProps {
  generation: Generation
  /** Aspect-ratio dial for the visual frame; defaults to the generation's own. */
  aspectClass?: string
}

const ASPECT_CLASS: Record<Generation['aspectRatio'], string> = {
  '1:1': 'aspect-square',
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
  '4:3': 'aspect-[4/3]',
  '3:4': 'aspect-[3/4]',
  '21:9': 'aspect-[21/9]',
}

/**
 * Image-card primitive used by Gallery, Dashboard "recent creations" and
 * Collection detail. Hover reveals the prompt and quick actions; status pill
 * sits in the top-right; click navigates to `/images/:id`.
 */
export function GenerationCard({ generation, aspectClass }: GenerationCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const aspect = aspectClass ?? ASPECT_CLASS[generation.aspectRatio]

  return (
    <Link
      to={`/images/${generation.id}`}
      className={cm.cn(
        'group relative block overflow-hidden rounded-2xl bg-surface-container-low border border-outline-variant/15 shadow-sm hover:shadow-xl hover:shadow-primary/15 transition-shadow duration-300',
      )}
    >
      <div
        className={cm.cn(
          'relative w-full',
          aspect,
          'bg-gradient-to-br from-primary/30 to-secondary/30',
        )}
      >
        {generation.thumbnailUrl ? (
          <img
            src={generation.thumbnailUrl}
            alt={generation.prompt}
            className={cm.cn('absolute inset-0 h-full w-full object-cover')}
            loading="lazy"
          />
        ) : (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.fontWeight('bold'),
              'absolute inset-0 text-white/80 text-3xl',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 48 }}>
              auto_awesome
            </span>
          </div>
        )}
        <div className={cm.cn('absolute top-3 right-3 z-10')}>
          <GenerationStatusPill status={generation.status} size="sm" />
        </div>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'xs' }),
            cm.sp('p', 4),
            // Touch devices never hover — keep the prompt/actions visible at
            // <md and restore the hover-reveal only where a pointer exists.
            'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity',
          )}
        >
          <p
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-sm leading-snug line-clamp-2 text-white/95',
            )}
          >
            {generation.prompt}
          </p>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.textSize('xs'),
              'font-mono text-white/80',
            )}
          >
            <span>{generation.model}</span>
            <span>seed {generation.seed}</span>
          </div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant font-mono uppercase tracking-widest',
          )}
        >
          {generation.aspectRatio}
        </span>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t('generation.created', { when: generation.createdAt }, { defaultValue: '{{when}}' })}
        </span>
      </div>
    </Link>
  )
}
