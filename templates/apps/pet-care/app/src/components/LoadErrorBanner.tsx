import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Inline fetch-failure banner for list pages.
 *
 * Without it a failed GET silently renders the page's EMPTY state ("No pets
 * yet"), which lies about what happened. Render this instead of the empty
 * state when the request rejected, with a retry callback that re-runs the
 * page's load function.
 */
export function LoadErrorBanner({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      data-mol-id="load-error-banner"
      className={cm.cn(
        cm.sp('py', 10),
        cm.sp('px', 6),
        cm.textCenter,
        'rounded-xl bg-error-container/60',
      )}
    >
      <span
        className={cm.cn('material-symbols-outlined text-5xl text-error mb-2 block')}
        aria-hidden="true"
      >
        wifi_off
      </span>
      <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), cm.sp('mb', 1))}>
        {t('common.loadError.title', {}, { defaultValue: 'Something went wrong' })}
      </p>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
        {t(
          'common.loadError.body',
          {},
          { defaultValue: 'We could not load this content. Check your connection and retry.' },
        )}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={cm.cn(
          cm.sp('px', 5),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity min-h-10',
        )}
        data-mol-id="load-error-retry"
      >
        {t('common.loadError.retry', {}, { defaultValue: 'Try again' })}
      </button>
    </div>
  )
}
