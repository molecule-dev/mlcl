/**
 * Flashcard surface — large 3D-flipping card, serif Source Serif 4 content,
 * front/back labels in caps, hint text, optional tag pills.
 *
 * Translated from team-chat's ChatBody.tsx (focus surface) + GRE / Anki
 * conventions in the brand DESIGN.md.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface FlashcardSurfaceProps {
  front: string
  back: string
  flipped: boolean
  onFlip: () => void
  cardIndex: number
  totalCards: number
  tags?: string[]
}

export function FlashcardSurface({
  front,
  back,
  flipped,
  onFlip,
  cardIndex,
  totalCards,
  tags,
}: FlashcardSurfaceProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const content = flipped ? back : front

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">
          {flipped
            ? t('common.back', {}, { defaultValue: 'Back' })
            : t('flashcardSurface.frontLabel', {}, { defaultValue: 'Front' })}
        </span>
        <span className="text-[10px] font-bold tracking-wider text-on-surface-variant">
          {t(
            'flashcardSurface.position',
            { current: cardIndex + 1, total: totalCards },
            { defaultValue: '{{current}} / {{total}}' },
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={onFlip}
        className={cm.cn(
          cm.sp('p', 12),
          'group relative w-full text-center cursor-pointer select-none rounded-[1.5rem] shadow-md hover:shadow-lg transition-all duration-300 border border-outline-variant/40',
          flipped
            ? 'bg-gradient-to-br from-surface-container-low to-surface-container'
            : 'bg-surface',
        )}
        style={{ minHeight: '320px' }}
        data-mol-id="flashcard-surface"
      >
        {/* Decorative accent bar */}
        <span
          aria-hidden="true"
          className={cm.cn(
            'absolute top-0 left-1/2 -translate-x-1/2 h-1 w-24 rounded-b-full',
            flipped ? 'bg-tertiary' : 'bg-primary',
          )}
        />
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'lg' }),
            'h-full min-h-[260px]',
          )}
        >
          <p
            className={cm.cn(
              'text-3xl md:text-4xl leading-snug font-medium text-on-surface whitespace-pre-wrap',
            )}
            style={{ fontFamily: 'var(--mol-font-serif)' }}
          >
            {content}
          </p>
          {!flipped && (
            <p
              className={cm.cn(
                'text-xs font-medium text-on-surface-variant inline-flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity',
              )}
            >
              <kbd
                className={cm.cn(
                  'rounded border border-outline-variant bg-surface-container-low px-1.5 py-0.5 text-[10px] font-mono',
                )}
              >
                Space
              </kbd>
              {t('flashcardSurface.flipHint', {}, { defaultValue: 'or tap to reveal' })}
            </p>
          )}
        </div>
      </button>

      {tags && tags.length > 0 && (
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {tags.map((tag) => (
            <span
              key={tag}
              className={cm.cn(
                'rounded-full bg-primary-container/40 text-on-primary-container px-3 py-1 text-[11px] font-semibold',
              )}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
