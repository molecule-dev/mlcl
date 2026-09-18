import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface Props {
  onViewAnalytics: () => void
  previewImageUrl: string
}

export default function PerformanceAnalyticsBanner({ onViewAnalytics, previewImageUrl }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <footer
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'between' }),
        cm.sp('mt', 12),
        'md:flex-row from-on-background to-inverse-surface',
      )}
      style={{
        padding: 'calc(8 * 0.25rem)',
        backgroundImage: 'linear-gradient(to br, var(--tw-gradient-from), var(--tw-gradient-to))',
        borderRadius: '2rem',
        color: 'var(--color-on-error)',
        gap: 'calc(6 * 0.25rem)',
        overflow: 'hidden',
        position: 'relative',
      }}
      data-mol-id="performance-analytics-banner"
    >
      <div style={{ position: 'relative', zIndex: '10' }} data-mol-id="banner-content">
        <h3
          className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 2))}
          style={{
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
            fontFamily: 'var(--font-headline, sans-serif)',
          }}
        >
          {t(
            'performance-analytics-banner.monitor-performance',
            {},
            { defaultValue: 'Monitor Performance' },
          )}
        </h3>
        <p
          style={{
            color: 'color-mix(in srgb, var(--md-sys-color-white) 60%, transparent)',
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
            maxWidth: '24rem',
          }}
        >
          {t(
            'performance-analytics-banner.description',
            {},
            {
              defaultValue:
                'Once deployed, you can track user interactions, satisfaction rates, and common queries in your real-time dashboard.',
            },
          )}
        </p>
        <button
          className={cm.cn(
            cm.sp('mt', 6),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'hover:scale-105',
          )}
          style={{
            paddingLeft: 'calc(8 * 0.25rem)',
            paddingRight: 'calc(8 * 0.25rem)',
            padding: 'calc(3 * 0.25rem)',
            backgroundColor: 'var(--md-sys-color-tertiary-fixed)',
            color: 'var(--md-sys-color-on-tertiary-fixed)',
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
            transitionProperty: 'all',
            transitionDuration: '150ms',
          }}
          onClick={onViewAnalytics}
          data-mol-id="view-analytics-button"
        >
          {t('performance-analytics-banner.view-analytics', {}, { defaultValue: 'View Analytics' })}
        </button>
      </div>
      <div
        className={'md:w-auto'}
        style={{ position: 'relative', width: '100%', zIndex: '10' }}
        data-mol-id="banner-image-container"
      >
        <img
          className={'md:w-80 hover:rotate-0'}
          style={{
            width: '100%',
            height: 'calc(48 * 0.25rem)',
            objectFit: 'cover',
            borderRadius: '2rem',
            boxShadow: 'var(--tw-shadow-2xl, revert)',
            transform:
              'translateX(var(--tw-translate-x,0)) translateY(var(--tw-translate-y,0)) rotate(var(--tw-rotate,0)) skewX(var(--tw-skew-x,0)) skewY(var(--tw-skew-y,0)) scaleX(var(--tw-scale-x,1)) scaleY(var(--tw-scale-y,1))',
            transitionProperty: 'all',
            transitionDuration: '700ms',
          }}
          data-alt="abstract bright colored data visualization charts and graphs on a high tech interface screen with dark background"
          alt={t(
            'performance-analytics-banner.preview-image-alt',
            {},
            {
              defaultValue:
                'abstract bright colored data visualization charts and graphs on a high tech interface screen with dark background',
            },
          )}
          src={previewImageUrl}
        />
      </div>
      <div
        className={cm.roundedFull}
        style={{
          position: 'absolute',
          right: 'calc(-20 * 0.25rem)',
          bottom: 'calc(-20 * 0.25rem)',
          width: '64rem-scaled',
          height: 'calc(64 * 0.25rem)',
          backgroundColor: 'color-mix(in srgb, var(--md-sys-color-primary) 20%, transparent)',
          filter: 'blur(100px)',
        }}
      ></div>
      <div
        className={cm.roundedFull}
        style={{
          position: 'absolute',
          inset: 'calc(0 * 0.25rem)',
          left: '50%',
          width: '32rem-scaled',
          height: 'calc(32 * 0.25rem)',
          backgroundColor: 'color-mix(in srgb, var(--md-sys-color-tertiary) 20%, transparent)',
          filter: 'blur(80px)',
        }}
      ></div>
    </footer>
  )
}

export { PerformanceAnalyticsBanner }
