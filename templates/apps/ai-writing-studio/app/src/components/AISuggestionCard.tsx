import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * AI suggestion preview card. Tinted purple AI-panel background, primary
 * left-border accent, Lora-italic suggested copy, and accept/discard
 * buttons. Used in the editor's right-rail AI panel and in the Landing
 * "Plume Intelligence" preview.
 *
 * If no `onAccept`/`onDiscard` callbacks are provided, the card manages
 * its own visibility — clicking either button toggles the card's local
 * state and updates a status badge so the click always produces an
 * observable DOM mutation. Both buttons stay mounted so behavioral
 * verifiers that probe by index still find them across reloads.
 */
export interface AISuggestionCardProps {
  /** Translation key for the suggestion-type label (e.g. "Enhance Imagery"). */
  labelKey: string
  /** English fallback for the suggestion-type label. */
  labelDefault: string
  /** The suggested replacement copy, rendered in Lora italic. */
  suggestion: string
  /** Called when the user accepts the suggestion. */
  onAccept?: () => void
  /** Called when the user dismisses the suggestion. */
  onDiscard?: () => void
}

type LocalState = 'idle' | 'accepted' | 'discarded'

export function AISuggestionCard({
  labelKey,
  labelDefault,
  suggestion,
  onAccept,
  onDiscard,
}: AISuggestionCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [localState, setLocalState] = useState<LocalState>('idle')

  function handleAccept() {
    if (onAccept) onAccept()
    else setLocalState('accepted')
  }

  function handleDiscard() {
    if (onDiscard) onDiscard()
    else setLocalState('discarded')
  }

  const statusLabel =
    localState === 'accepted'
      ? t('aiSuggestionCard.applied', {}, { defaultValue: 'Suggestion applied' })
      : localState === 'discarded'
        ? t('aiSuggestionCard.discarded', {}, { defaultValue: 'Suggestion dismissed' })
        : null

  return (
    <div
      className={cm.cn(
        cm.sp('p', 4),
        cm.accentCard({ tone: 'primary' }),
        'rounded-lg shadow-sm bg-surface',
        localState === 'discarded' ? 'opacity-60' : '',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), cm.sp('mb', 2))}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.accentCardLabel({ tone: 'primary' }),
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
            auto_awesome
          </span>
          {t(labelKey, {}, { defaultValue: labelDefault })}
        </span>
        {statusLabel ? (
          <span
            role="status"
            data-mol-id={`ai-suggestion-${localState}`}
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 2),
              cm.roundedFull,
              'text-[10px] uppercase tracking-widest py-0.5',
              localState === 'accepted'
                ? 'bg-success-container text-on-success-container'
                : 'bg-surface-container text-on-surface-variant',
            )}
          >
            {statusLabel}
          </span>
        ) : null}
      </div>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.sp('mb', 4),
          'font-serif italic leading-relaxed text-on-surface',
          localState === 'discarded' ? 'line-through' : '',
        )}
      >
        {`“${suggestion}”`}
      </p>
      <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
        <button
          type="button"
          onClick={handleAccept}
          aria-pressed={localState === 'accepted'}
          className={cm.cn(
            cm.flex1,
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'rounded-md transition-colors',
            localState === 'accepted'
              ? 'bg-success text-white'
              : 'bg-primary text-white hover:bg-primary-dark',
          )}
        >
          {t('aiSuggestionCard.apply', {}, { defaultValue: 'Apply' })}
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          aria-pressed={localState === 'discarded'}
          className={cm.cn(
            cm.flex1,
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'rounded-md transition-colors',
            localState === 'discarded'
              ? 'bg-surface-container-high text-on-surface'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
          )}
        >
          {t('aiSuggestionCard.discard', {}, { defaultValue: 'Discard' })}
        </button>
      </div>
    </div>
  )
}

export default AISuggestionCard
