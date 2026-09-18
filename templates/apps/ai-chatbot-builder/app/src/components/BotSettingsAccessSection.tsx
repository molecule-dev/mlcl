import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface BotSettingsAccessSectionProps {
  allowedDomains: string
  setAllowedDomains: (v: string) => void
  rateLimit: number
  setRateLimit: (v: number) => void
  requireAuth: boolean
  setRequireAuth: (v: boolean) => void
  apiKey?: string
  onRegenerateKey?: () => void
}
function BotSettingsAccessSection({
  allowedDomains,
  setAllowedDomains,
  rateLimit,
  setRateLimit,
  requireAuth,
  setRequireAuth,
  apiKey,
  onRegenerateKey,
}: BotSettingsAccessSectionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section className={cm.stack(6)}>
      <h3
        className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-headline tracking-tight')}
      >
        {t('botSettingsAccess.sectionTitle', {}, { defaultValue: 'Access & Security' })}
      </h3>
      <div
        className={cm.cn(
          cm.sp('p', 8),
          'bg-surface-container-lowest rounded-3xl ambient-shadow space-y-10',
        )}
      >
        <div className={cm.grid({ cols: 2, gap: 'xl' })}>
          <div className={cm.cn('space-y-1.5')}>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('botSettingsAccess.allowedDomainsLabel', {}, { defaultValue: 'Allowed Domains' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 5),
                'bg-surface-container-high border-none rounded-2xl py-3.5 text-on-surface font-medium focus:ring-2 focus:ring-surface-tint/15 transition-shadow',
              )}
              placeholder={t(
                'botSettingsAccess.allowedDomainsPlaceholder',
                {},
                { defaultValue: 'example.com, app.example.com' },
              )}
              type="text"
              value={allowedDomains}
              onChange={(e) => setAllowedDomains(e.target.value)}
            />
          </div>
          <div className={cm.cn('space-y-1.5')}>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t(
                'botSettingsAccess.rateLimitLabel',
                {},
                { defaultValue: 'Rate Limiting (msgs/min)' },
              )}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 5),
                'bg-surface-container-high border-none rounded-2xl py-3.5 text-on-surface font-medium focus:ring-2 focus:ring-surface-tint/15 transition-shadow',
              )}
              type="number"
              value={rateLimit}
              onChange={(e) => setRateLimit(Number(e.target.value))}
            />
          </div>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('py', 2),
            cm.sp('pt', 8),
            'border-t border-surface-container-high',
          )}
        >
          <div>
            <p className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'botSettingsAccess.requireAuthTitle',
                {},
                { defaultValue: 'Require Authentication' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'botSettingsAccess.requireAuthDescription',
                {},
                { defaultValue: 'Users must be logged in to chat' },
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRequireAuth(!requireAuth)}
            aria-pressed={requireAuth}
            className={cm.cn(
              'w-12 h-6 rounded-full relative cursor-pointer transition-colors',
              requireAuth ? 'bg-tertiary' : 'bg-surface-container-highest',
            )}
          >
            <div
              className={cm.cn(
                'absolute top-1 w-4 h-4 bg-surface rounded-full transition-all',
                requireAuth ? 'right-1' : 'left-1',
              )}
            ></div>
          </button>
        </div>
        <div className={cm.stack(3)}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            {t('botSettingsAccess.apiKeyLabel', {}, { defaultValue: 'API Key' })}
          </label>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('p', 2),
              cm.sp('pl', 5),
              'gap-4 bg-surface-container-high rounded-2xl',
            )}
          >
            <span
              className={cm.cn(cm.flex1, 'text-on-surface-variant font-mono tracking-widest')}
              data-mol-id="bot-api-key"
            >
              {apiKey ? `${apiKey.slice(0, 8)}${'•'.repeat(20)}` : '••••••••••••••••••••••••••••'}
            </span>
            <button
              type="button"
              data-mol-id="bot-regenerate-key"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                cm.textPrimary,
                'hover:bg-surface-container-highest rounded-xl transition-colors',
              )}
              onClick={() => onRegenerateKey?.()}
            >
              {t('botSettingsAccess.regenerateApiKey', {}, { defaultValue: 'Regenerate' })}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BotSettingsAccessSection
export { BotSettingsAccessSection }
