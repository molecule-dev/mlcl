import { useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function BotSettingsAccessSecuritySection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [allowedDomains, setAllowedDomains] = useState('')
  const [rateLimit, setRateLimit] = useState('50')
  const [requireAuth, setRequireAuth] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      await http.post('/bot/api-key/regenerate')
    } finally {
      setRegenerating(false)
    }
  }
  return (
    <>
      {/* Section 4: Access & Security */}
      <section className={cm.stack(6)}>
        <h3
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight',
          )}
        >
          {t('botSettingsAccessSecurity.sectionTitle', {}, { defaultValue: 'Access & Security' })}
        </h3>
        <div
          className={cm.cn(
            cm.sp('p', 8),
            cm.stack(10),
            'bg-surface-container-lowest rounded-3xl ambient-shadow',
          )}
        >
          <div className={cm.cn(cm.grid({ cols: 2, gap: 10 }))}>
            <div className={cm.cn('space-y-1.5')}>
              <label
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wider text-on-surface-variant',
                )}
              >
                {t(
                  'botSettingsAccessSecurity.allowedDomainsLabel',
                  {},
                  { defaultValue: 'Allowed Domains' },
                )}
              </label>
              <input
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 5),
                  cm.fontWeight('medium'),
                  'bg-surface-container-high border-none rounded-2xl py-3.5 text-on-surface focus:ring-2 focus:ring-surface-tint/15 transition-shadow',
                )}
                placeholder={t(
                  'botSettingsAccessSecurity.allowedDomainsPlaceholder',
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
                  'botSettingsAccessSecurity.rateLimitingLabel',
                  {},
                  { defaultValue: 'Rate Limiting (msgs/min)' },
                )}
              </label>
              <input
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 5),
                  cm.fontWeight('medium'),
                  'bg-surface-container-high border-none rounded-2xl py-3.5 text-on-surface focus:ring-2 focus:ring-surface-tint/15 transition-shadow',
                )}
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
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
                  'botSettingsAccessSecurity.requireAuthTitle',
                  {},
                  { defaultValue: 'Require Authentication' },
                )}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'botSettingsAccessSecurity.requireAuthDescription',
                  {},
                  { defaultValue: 'Users must be logged in to chat' },
                )}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={requireAuth}
              aria-label={t(
                'botSettingsAccessSecurity.requireAuthTitle',
                {},
                { defaultValue: 'Require Authentication' },
              )}
              className={cm.cn(
                'w-12 h-6 rounded-full relative cursor-pointer transition-colors',
                requireAuth ? 'bg-tertiary' : 'bg-surface-container-highest',
              )}
              onClick={() => setRequireAuth((v) => !v)}
            >
              <span
                className={cm.cn(
                  'absolute top-1 w-4 h-4 bg-surface rounded-full transition-all',
                  requireAuth ? 'left-7' : 'left-1',
                )}
              ></span>
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
              {t('botSettingsAccessSecurity.apiKeyLabel', {}, { defaultValue: 'API Key' })}
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
              >
                ••••••••••••••••••••••••••••
              </span>
              <button
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  cm.textPrimary,
                  'hover:bg-surface-container-highest rounded-xl transition-colors',
                )}
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {t('common.regenerate', {}, { defaultValue: 'Regenerate' })}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default BotSettingsAccessSecuritySection
export { BotSettingsAccessSecuritySection }
