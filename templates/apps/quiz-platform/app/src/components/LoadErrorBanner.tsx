import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Inline load-error banner for failed page fetches (role="alert" so screen
 * readers announce it). Every page that swallows a rejected fetch into a
 * silent empty state renders this instead — with a retry action when the
 * caller can re-run its load.
 */
export function LoadErrorBanner({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const text =
    message ??
    t('common.loadError', {}, { defaultValue: 'Something went wrong loading this content.' })
  return (
    <div
      role="alert"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 3, wrap: 'wrap' }),
        cm.sp('p', 4),
        'rounded-2xl bg-error-container/30 border border-error/30 text-error',
      )}
    >
      <span className={cm.cn('material-symbols-outlined text-[20px]')} aria-hidden="true">
        cloud_off
      </span>
      <p className={cm.cn('text-sm font-bold flex-1 min-w-0')}>{text}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={cm.cn(
            'px-4 py-2 rounded-xl bg-error/10 text-error text-xs font-extrabold uppercase tracking-widest hover:bg-error/20 transition-colors',
          )}
        >
          {t('common.retry', {}, { defaultValue: 'Retry' })}
        </button>
      ) : null}
    </div>
  )
}

export default LoadErrorBanner
