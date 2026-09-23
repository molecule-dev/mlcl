import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Inline error banner for failed page loads — the ERROR state of the
 * loading/empty/error triad. Rendered instead of a silent blank (or, worse,
 * an empty state that reads as "you have no data" when the real problem is
 * the fetch). Offers a Retry that re-runs the page's load effect.
 */
export function LoadErrorBanner({ onRetry, testId }: { onRetry: () => void; testId: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      data-testid={testId}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
        cm.sp('p', 4),
        'bg-error-light text-error rounded-2xl',
      )}
    >
      <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
        {t(
          'common.loadFailed',
          {},
          { defaultValue: 'Something went wrong loading your data. Please try again.' },
        )}
      </p>
      <button
        type="button"
        data-testid={`${testId}-retry`}
        onClick={onRetry}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          cm.roundedFull,
          'bg-surface text-on-surface border border-outline-variant hover:bg-surface-container',
        )}
      >
        {t('common.retry', {}, { defaultValue: 'Retry' })}
      </button>
    </div>
  )
}
