import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface VocabWord {
  id: string
  word: string
  pronunciation: string
  translation: string
  example: string
  /** 0..5 mastery level — drives the dot ladder colour. */
  mastery: 0 | 1 | 2 | 3 | 4 | 5
  /** ISO date — when the SRS scheduler wants this word reviewed next. */
  nextReviewIso: string
}

interface VocabReviewCardProps {
  word: VocabWord
  disabled?: boolean
  onPlayAudio?: (word: VocabWord) => void
  onReviewCorrect?: (word: VocabWord) => void
  onReviewWrong?: (word: VocabWord) => void
}

/**
 * Vocab review card — large script-aware word, pronunciation in mono,
 * translation, example sentence, mastery dot ladder (5 dots, primary fill),
 * audio play button, and Got-it / Forgot review CTAs that drive the SRS
 * scheduler. Forgot resets to a 1-day interval; Got it doubles the interval.
 */
export function VocabReviewCard({
  word,
  disabled,
  onPlayAudio,
  onReviewCorrect,
  onReviewWrong,
}: VocabReviewCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const dueDate = new Date(word.nextReviewIso)
  const dueLabel = isNaN(dueDate.getTime())
    ? t('vocabReviewCard.dueUnknown', {}, { defaultValue: 'Review due' })
    : dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <article
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl border border-outline-variant/20 hover:shadow-md transition-shadow',
      )}
      data-testid="vocab-card"
      data-vocab-id={word.id}
      data-mastery={word.mastery}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <div className={cm.cn(cm.flex1, 'min-w-0')}>
          <h3
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight font-headline',
            )}
          >
            {word.word}
          </h3>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              'font-mono text-on-surface-variant',
            )}
          >
            {word.pronunciation}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onPlayAudio?.(word)}
          aria-label={t('vocabReviewCard.playAudio', {}, { defaultValue: 'Play pronunciation' })}
          className={cm.cn(
            cm.w(11),
            cm.h(11),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.roundedFull,
            'bg-primary-container/40 text-primary hover:bg-primary hover:text-on-primary transition-all shrink-0',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            volume_up
          </span>
        </button>
      </div>

      <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 2))}>
        {word.translation}
      </p>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.sp('mb', 5),
          'italic text-on-surface-variant leading-relaxed',
        )}
      >
        &ldquo;{word.example}&rdquo;
      </p>

      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }))}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <p
            className={cm.cn(
              'font-black uppercase tracking-widest text-[10px] text-on-surface-variant',
            )}
          >
            {t('vocabReviewCard.masteryLabel', {}, { defaultValue: 'Mastery' })}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={cm.cn(
                  cm.w(2),
                  cm.h(2),
                  cm.roundedFull,
                  i < word.mastery
                    ? 'bg-gradient-to-r from-primary to-primary-light'
                    : 'bg-surface-container-high',
                )}
              />
            ))}
          </div>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('vocabReviewCard.due', { date: dueLabel }, { defaultValue: 'Due {{date}}' })}
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          <button
            type="button"
            onClick={() => onReviewWrong?.(word)}
            disabled={disabled}
            data-testid="vocab-review-forgot"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full bg-error-container/30 text-error hover:bg-error hover:text-on-error disabled:opacity-50 transition-colors uppercase tracking-widest',
            )}
          >
            {t('vocabReviewCard.forgot', {}, { defaultValue: 'Forgot' })}
          </button>
          <button
            type="button"
            onClick={() => onReviewCorrect?.(word)}
            disabled={disabled}
            data-testid="vocab-review-gotit"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-50 transition-colors uppercase tracking-widest',
            )}
          >
            {t('vocabReviewCard.gotIt', {}, { defaultValue: 'Got it' })}
          </button>
        </div>
      </div>
    </article>
  )
}

export default VocabReviewCard
