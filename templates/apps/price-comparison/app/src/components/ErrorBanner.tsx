import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface ErrorBannerProps {
  /** Shown above the retry button; a generic message is used when omitted. */
  message?: string
  /** Called when the user clicks Retry; omit to render without an action. */
  onRetry?: () => void
}

/**
 * Inline fetch-failure banner (role="alert") — the ERROR state every data
 * screen must show instead of a silent blank. Pair with a `retryKey` in the
 * page's fetch effect to make Retry re-run the request.
 */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      data-test="error-banner"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
        cm.sp('p', 4),
        'rounded-xl bg-error/10 text-error border border-error/30',
      )}
    >
      <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
        <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-xl')}>
          error
        </span>
        {message ??
          t('common.fetchFailed', {}, { defaultValue: 'Something went wrong loading this page.' })}
      </span>
      {onRetry && (
        <button
          type="button"
          data-test="error-retry"
          onClick={onRetry}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'rounded-full uppercase tracking-wider bg-error/15 text-error hover:bg-error/25 transition-colors',
          )}
        >
          {t('common.retry', {}, { defaultValue: 'Retry' })}
        </button>
      )}
    </div>
  )
}
