// Phase 1 baseline — verbatim JSX of design-ai-chatbot-builder-bot-deploy.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { unwrapSingle } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { AppShell } from '../components/AppShell.js'
import BotDeployAnalyticsTeaser from '../components/BotDeployAnalyticsTeaser.js'
import BotDeployApiAccessCard from '../components/BotDeployApiAccessCard.js'
import BotDeployChannelIntegrationsCard from '../components/BotDeployChannelIntegrationsCard.js'
import BotDeployPageHeader from '../components/BotDeployPageHeader.js'
import BotDeployShareLinkCard from '../components/BotDeployShareLinkCard.js'
import UserMenu from '../components/UserMenu.js'

interface BotResponse {
  id?: string
  name?: string
  status?: string
  welcome_message?: string
}

function BotDeploy() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id: botId } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right')
  const [initialMessage, setInitialMessage] = useState(
    t('botDeploy.defaultInitialMessage', {}, { defaultValue: 'Hi! How can I help you today?' }),
  )
  const [themeColor, setThemeColor] = useState(BRAND_COLOR)
  const [codeCopied, setCodeCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  useEffect(() => {
    if (!botId) return
    let active = true
    http
      .get<BotResponse>(`/api/bots/${botId}`)
      .then((res) => {
        if (!active) return
        const body = unwrapSingle<BotResponse>(res.data) ?? null
        if (body?.welcome_message) setInitialMessage(body.welcome_message)
      })
      // The bot's stored welcome message is a nicety — on fetch failure the
      // editable default initial message is kept.
      .catch(() => {})
    return () => {
      active = false
    }
  }, [botId, http])

  // Build an embed snippet that actually points at the running bot.
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://your-deployment.example.com'
  const widgetSnippet =
    `<!-- AI Chatbot Builder embed -->\n` +
    `<script async src="${origin}/embed/chatbot.js"\n` +
    `        data-bot-id="${botId ?? ''}"\n` +
    `        data-position="${position}"\n` +
    `        data-theme-color="${themeColor}"\n` +
    `        data-initial-message="${initialMessage.replace(/"/g, '&quot;')}"></script>`

  function handleCopyCode() {
    navigator.clipboard
      .writeText(widgetSnippet)
      .then(() => {
        setCopyError(null)
        setCodeCopied(true)
        setTimeout(() => setCodeCopied(false), 2000)
      })
      .catch(() => {
        setCopyError(
          t(
            'botDeploy.copyFailed',
            {},
            {
              defaultValue:
                'Clipboard access is blocked in this browser. Copy manually from the snippet below.',
            },
          ),
        )
      })
  }

  // The former BotDeployTopBar, folded into the shared shell's top bar:
  // help link + Deploy Bot CTA beside the user menu.
  const shellActions = (
    <>
      <Link
        className={cm.cn(
          'text-foreground-secondary hover:text-primary transition-colors text-sm font-medium',
        )}
        to="/help"
      >
        {t('botDeployTopBar.help', {}, { defaultValue: 'Help' })}
      </Link>
      <Link
        className={cm.cn(
          'bg-primary px-5 py-2 rounded-lg text-on-primary font-semibold shadow-sm hover:opacity-90 active:opacity-80 transition-all',
        )}
        to="/bots"
      >
        {t('botDeployTopNavBar.deployBot', {}, { defaultValue: 'Deploy Bot' })}
      </Link>
      <UserMenu />
    </>
  )

  return (
    <AppShell className="bg-background text-on-surface" actions={shellActions}>
      {/* Main Content Area */}
      <main className={cm.cn(cm.sp('p', 4), 'md:p-10 overflow-x-hidden')}>
        <div className={cm.cn('max-w-6xl', cm.mxAuto)}>
          <BotDeployPageHeader />
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-2')}>
            {/* Section 1: Embed Widget */}
            <section
              className={cm.cn(
                cm.sp('p', 8),
                cm.flex({ direction: 'col', gap: 'xl' }),
                'bg-surface-container-lowest rounded-[2rem] ambient-shadow relative overflow-hidden',
              )}
            >
              <div className={cm.flex({ justify: 'between', align: 'start' })}>
                <div>
                  <h2
                    className={cm.cn(
                      cm.textSize('2xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 2),
                      'font-headline',
                    )}
                  >
                    {t('botDeploy.embedWidgetTitle', {}, { defaultValue: 'Embed Widget' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant/60')}>
                    {t(
                      'botDeploy.embedWidgetDescription',
                      {},
                      { defaultValue: 'Add a floating chat bubble to your website.' },
                    )}
                  </p>
                </div>
                <div
                  className={cm.cn(
                    cm.w(12),
                    cm.h(12),
                    cm.center,
                    'bg-surface-container-high rounded-2xl text-primary',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    code
                  </span>
                </div>
              </div>
              <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2')}>
                <div className={cm.stack(4)}>
                  <label className={cm.cn('block')}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.sp('mb', 2),
                        'text-on-surface-variant/70 uppercase tracking-widest block',
                      )}
                    >
                      {t('botDeploy.positionLabel', {}, { defaultValue: 'Position' })}
                    </span>
                    <div
                      className={cm.cn(
                        cm.flex(),
                        cm.sp('p', 1),
                        'gap-2 bg-surface-container-high rounded-xl',
                      )}
                    >
                      <button
                        className={cm.cn(
                          'flex-1 py-2 text-xs font-bold rounded-lg transition-colors',
                          position === 'bottom-right'
                            ? 'bg-surface shadow-sm text-primary'
                            : 'text-on-surface-variant/50 hover:text-on-surface',
                        )}
                        onClick={() => setPosition('bottom-right')}
                        aria-pressed={position === 'bottom-right'}
                      >
                        {t('botDeploy.positionBottomRight', {}, { defaultValue: 'Bottom Right' })}
                      </button>
                      <button
                        className={cm.cn(
                          'flex-1 py-2 text-xs font-bold rounded-lg transition-colors',
                          position === 'bottom-left'
                            ? 'bg-surface shadow-sm text-primary'
                            : 'text-on-surface-variant/50 hover:text-on-surface',
                        )}
                        onClick={() => setPosition('bottom-left')}
                        aria-pressed={position === 'bottom-left'}
                      >
                        {t('botDeploy.positionBottomLeft', {}, { defaultValue: 'Bottom Left' })}
                      </button>
                    </div>
                  </label>
                  <label className={cm.cn('block')}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.sp('mb', 2),
                        'text-on-surface-variant/70 uppercase tracking-widest block',
                      )}
                    >
                      {t('botDeploy.themeColorLabel', {}, { defaultValue: 'Theme Color' })}
                    </span>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center' }),
                        cm.sp('p', 3),
                        'gap-3 bg-surface-container-high rounded-xl',
                      )}
                    >
                      <input
                        type="color"
                        value={themeColor}
                        onChange={(e) => setThemeColor(e.target.value)}
                        aria-label={t(
                          'botDeploy.themeColorLabel',
                          {},
                          { defaultValue: 'Theme Color' },
                        )}
                        className={cm.cn(
                          cm.w(6),
                          cm.h(6),
                          cm.roundedFull,
                          'appearance-none border-0 cursor-pointer ring-4 ring-primary/10 overflow-hidden',
                        )}
                        style={{ backgroundColor: themeColor, padding: 0 }}
                      />
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          'text-on-surface',
                        )}
                      >
                        {themeColor}
                      </span>
                      <span
                        className={cm.cn(
                          'material-symbols-outlined ml-auto text-on-surface-variant/40',
                        )}
                      >
                        colorize
                      </span>
                    </div>
                  </label>
                  <label className={cm.cn('block')}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.sp('mb', 2),
                        'text-on-surface-variant/70 uppercase tracking-widest block',
                      )}
                    >
                      {t('botDeploy.initialMessageLabel', {}, { defaultValue: 'Initial Message' })}
                    </span>
                    <input
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('py', 3),
                        cm.sp('px', 4),
                        cm.textSize('sm'),
                        'bg-surface-container-high border-none rounded-xl focus:ring-2 focus:ring-primary/20',
                      )}
                      type="text"
                      value={initialMessage}
                      onChange={(e) => setInitialMessage(e.target.value)}
                    />
                  </label>
                </div>
                <div className={cm.cn('relative group')}>
                  <img
                    className={cm.cn(
                      cm.w('full'),
                      cm.h('full'),
                      'object-cover rounded-2xl brightness-90 group-hover:brightness-100 transition-all duration-500',
                    )}
                    alt={t(
                      'botDeploy.previewImageAlt',
                      {},
                      {
                        defaultValue:
                          'Close up of lines of computer code on a dark monitor with purple and blue glowing highlights',
                      },
                    )}
                    src="https://picsum.photos/seed/BotDeploy-1/1200/800"
                  />
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'end' }),
                      cm.sp('p', 4),
                      'absolute inset-0 bg-gradient-to-t from-on-surface/80 to-transparent',
                    )}
                  >
                    <div
                      className={cm.cn(
                        cm.sp('p', 3),
                        cm.w('full'),
                        'bg-surface/10 backdrop-blur-md rounded-lg border border-surface/10',
                      )}
                    >
                      <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 1), 'gap-2')}>
                        <div
                          className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-green-400')}
                        ></div>
                        <span
                          className={cm.cn(
                            cm.fontWeight('bold'),
                            'text-[10px] text-white uppercase',
                          )}
                        >
                          {t('botDeploy.widgetPreview', {}, { defaultValue: 'Widget Preview' })}
                        </span>
                      </div>
                      <p className={cm.cn('text-[10px] text-white/70 italic')}>
                        {t(
                          'botDeploy.previewCaption',
                          {},
                          { defaultValue: 'Showing "Deep Indigo" theme on dark site.' },
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-highest rounded-2xl')}>
                <div
                  className={cm.cn(
                    cm.flex({ justify: 'between', align: 'center' }),
                    cm.sp('mb', 4),
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.textPrimary,
                      'tracking-widest uppercase',
                    )}
                  >
                    {t('botDeploy.htmlSnippet', {}, { defaultValue: 'HTML Snippet' })}
                  </span>
                  <button
                    className={cm.cn(
                      cm.flex({ align: 'center' }),
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'gap-2 bg-primary text-white hover:scale-105 transition-transform active:scale-95',
                    )}
                    onClick={handleCopyCode}
                  >
                    <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                      {codeCopied ? 'check' : 'content_copy'}
                    </span>
                    {t('botDeploy.copyCode', {}, { defaultValue: 'Copy Code' })}
                  </button>
                </div>
                <pre
                  data-mol-id="bot-deploy-snippet"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('p', 5),
                    'bg-on-surface text-cyan-100/90 font-mono rounded-xl leading-relaxed border-l-4 border-tertiary whitespace-pre-wrap break-all',
                  )}
                >
                  {widgetSnippet}
                </pre>
                {copyError && (
                  <p
                    className={cm.cn(cm.sp('mt', 3), cm.textSize('xs'), 'text-error')}
                    data-mol-id="bot-deploy-copy-error"
                  >
                    {copyError}
                  </p>
                )}
              </div>
            </section>
            <BotDeployShareLinkCard botId={botId} />
            {/* Section 3: API Access */}
            <BotDeployApiAccessCard botId={botId} />
            {/* Section 4: Channel Integrations */}
            <BotDeployChannelIntegrationsCard />
          </div>
          {/* Dashboard Analytics Teaser */}
          <BotDeployAnalyticsTeaser />
        </div>
      </main>
    </AppShell>
  )
}

export default BotDeploy
export { BotDeploy, BotDeploy as BotDeployPage }
