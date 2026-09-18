import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface IntegrationsHeaderProps {
  onSearch: (query: string) => void
}

export default function IntegrationsHeader({ onSearch }: IntegrationsHeaderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('mb', 12),
        'md:flex-row md:items-end',
      )}
      style={{ gap: 'calc(6 * 0.25rem)' }}
      data-mol-id="header-section"
    >
      <div style={{ maxWidth: '36rem' }} data-mol-id="header-copy">
        <h2
          className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 3))}
          style={{
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
            fontFamily: 'var(--font-headline, sans-serif)',
            letterSpacing: "${1 === 'tighter' ? '-0.05em' : '-0.025em'}",
            color: 'var(--md-sys-color-on-surface)',
          }}
        >
          {t(
            'integrations-header.connect-your-workflow',
            {},
            { defaultValue: 'Connect your workflow' },
          )}
        </h2>
        <p style={{ color: 'var(--md-sys-color-on-surface-variant)', lineHeight: '1.625' }}>
          {t(
            'integrations-header.expand-bot-capabilities',
            {},
            {
              defaultValue:
                "Expand your bot's capabilities by integrating with the tools your team already uses. Seamlessly sync data, trigger workflows, and engage users across platforms.",
            },
          )}
        </p>
      </div>
      <div
        className={'md:w-80'}
        style={{ position: 'relative', width: '100%' }}
        data-mol-id="search-wrapper"
      >
        <div
          className={cm.flex({ align: 'center' })}
          style={{
            position: 'absolute',
            top: '0px',
            bottom: '0px',
            inset: 'calc(4 * 0.25rem)',
            pointerEvents: 'none',
          }}
        >
          <span
            className={'group-focus-within:text-primary'}
            style={{
              fontFamily: 'Material Symbols outlined',
              color: 'var(--md-sys-color-on-surface-variant)',
              transitionProperty:
                'color, background-color, border-color, text-decoration-color, fill, stroke',
              transitionDuration: '150ms',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            search
          </span>
        </div>
        <input
          className={'focus:ring-4 focus:ring-primary/10 placeholder:text-on-surface-variant/50'}
          style={{
            width: '100%',
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            borderColor: 'var(--md-sys-color-none)',
            borderRadius: '2rem',
            padding: 'calc(4 * 0.25rem)',
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
            transitionProperty: 'all',
            transitionDuration: '150ms',
          }}
          placeholder={t(
            'integrations-header.search-placeholder',
            {},
            { defaultValue: 'Search integrations...' },
          )}
          type="text"
          onChange={(e) => onSearch(e.target.value)}
          data-mol-id="search-input"
        />
      </div>
    </section>
  )
}

export { IntegrationsHeader }
