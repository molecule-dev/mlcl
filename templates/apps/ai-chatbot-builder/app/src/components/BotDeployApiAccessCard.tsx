import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface BotDeployApiAccessCardProps {
  botId?: string
}

export default function BotDeployApiAccessCard({ botId }: BotDeployApiAccessCardProps = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [keyVisible, setKeyVisible] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)
  // The session-cookie auth used by the rest of the app is what authenticates
  // calls to /api/conversations — this surface explains the canonical request
  // shape rather than vending a separately-issued key (no API-key resource
  // exists yet). The "Coming soon" label below makes the placeholder honest.
  const apiKey = 'Use your session cookie'
  const usedRequests = 0
  const totalRequests = 1000

  function handleCopyKey() {
    navigator.clipboard.writeText(apiKey).then(() => {
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 2000)
    })
  }

  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        'bg-surface-container-lowest rounded-[2rem] ambient-shadow lg:col-span-1',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 8))}>
        <div>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'font-headline',
            )}
          >
            {t('botDeployApiAccessCard.title', {}, { defaultValue: 'API Access' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant/60')}>
            {t(
              'botDeployApiAccessCard.description',
              {},
              { defaultValue: 'Build custom integrations with our REST API.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.textPrimary,
            'bg-surface-container-high rounded-2xl',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            api
          </span>
        </div>
      </div>
      <div className={cm.stack(6)}>
        <div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 3),
              'text-[10px] text-on-surface-variant/70 uppercase tracking-[0.2em] block',
            )}
          >
            {t('botDeployApiAccessCard.endpointUrl', {}, { defaultValue: 'Endpoint URL' })}
          </span>
          <div
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('xs'),
              cm.flex({ align: 'center' }),
              'bg-on-surface/5 rounded-2xl font-mono text-on-surface-variant gap-2',
            )}
          >
            <span className={cm.cn(cm.textPrimary, cm.fontWeight('bold'))}>POST</span>
            <span data-mol-id="bot-deploy-api-endpoint">
              {typeof window !== 'undefined' ? window.location.origin : ''}/api/conversations/
              {botId ?? '<bot-id>'}/messages
            </span>
          </div>
        </div>
        <div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 3),
              'text-[10px] text-on-surface-variant/70 uppercase tracking-[0.2em] block',
            )}
          >
            {t('botDeployApiAccessCard.secretApiKey', {}, { defaultValue: 'Secret API Key' })}
          </span>
          <div className={cm.cn(cm.flex({}), 'gap-2')}>
            <div
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 4),
                cm.flex({ align: 'center', justify: 'between' }),
                'bg-on-surface/5 rounded-2xl',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-mono text-on-surface-variant tracking-widest',
                )}
              >
                {keyVisible ? apiKey : '••••••••••••••••••••••••'}
              </span>
              <button
                className={cm.cn(cm.textPrimary, 'hover:text-tertiary transition-colors')}
                onClick={() => setKeyVisible((v) => !v)}
                aria-label={
                  keyVisible
                    ? t('botDeployApiAccessCard.hideApiKey', {}, { defaultValue: 'Hide API key' })
                    : t('botDeployApiAccessCard.showApiKey', {}, { defaultValue: 'Show API key' })
                }
              >
                <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                  {keyVisible ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <button
              className={cm.cn(
                cm.sp('p', 4),
                cm.textPrimary,
                'bg-surface-container-high rounded-lg hover:bg-primary hover:text-white transition-all',
              )}
              onClick={handleCopyKey}
            >
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                {keyCopied ? 'check' : 'content_copy'}
              </span>
            </button>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.sp('pt', 4),
            cm.sp('mt', 4),
            'border-t border-surface-container-high',
          )}
        >
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 2))}>
            <span
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface-variant')}
            >
              {t('botDeployApiAccessCard.rateLimit', {}, { defaultValue: 'Rate Limit' })}
            </span>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'botDeployApiAccessCard.rateLimitUsage',
                { used: usedRequests, total: totalRequests.toLocaleString() },
                { defaultValue: '{{used}} / {{total}} req/min' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.w('full'),
              cm.h(2),
              cm.roundedFull,
              'bg-surface-container-high overflow-hidden',
            )}
          >
            <div
              className={cm.cn(cm.h('full'), 'bg-gradient-to-r from-tertiary to-primary')}
              style={{ width: (usedRequests / totalRequests) * 100 + '%' }}
            ></div>
          </div>
          <a
            className={cm.cn(
              cm.sp('mt', 6),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.textPrimary,
              'inline-flex items-center gap-2 group',
            )}
            href="https://docs.neuralforge.ai/api"
            target="_blank"
            rel="noreferrer"
          >
            {t(
              'botDeployApiAccessCard.readDocumentation',
              {},
              { defaultValue: 'Read Documentation' },
            )}
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'material-symbols-outlined group-hover:translate-x-1 transition-transform',
              )}
            >
              arrow_forward
            </span>
          </a>
        </div>
      </div>
    </section>
  )
}
export { BotDeployApiAccessCard }
