import { useEffect, useMemo, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { AiSuggestionPanel } from '../components/AiSuggestionPanel.js'
import type { Tone } from '../components/TonePillRow.js'
import { TonePillRow } from '../components/TonePillRow.js'
import { loadPreferences, savePreferences } from '../lib/preferences.js'

interface IntegrationDef {
  key: 'gmail' | 'outlook' | 'hubspot' | 'notion'
  defaultLabel: string
  icon: string
  metaConnected: string
  metaDisconnected: string
}

const INTEGRATIONS: ReadonlyArray<IntegrationDef> = [
  {
    key: 'gmail',
    defaultLabel: 'Gmail',
    icon: 'mail',
    metaConnected: 'Connected',
    metaDisconnected: 'Connect to send via Gmail',
  },
  {
    key: 'outlook',
    defaultLabel: 'Outlook',
    icon: 'inbox',
    metaConnected: 'Connected',
    metaDisconnected: 'Connect to send via Outlook',
  },
  {
    key: 'hubspot',
    defaultLabel: 'HubSpot CRM',
    icon: 'group',
    metaConnected: 'Sync contacts + activity',
    metaDisconnected: 'Connect to sync contacts',
  },
  {
    key: 'notion',
    defaultLabel: 'Notion',
    icon: 'edit_document',
    metaConnected: 'Drafts vault enabled',
    metaDisconnected: 'Save drafts to a workspace',
  },
]

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const initialPrefs = useMemo(() => loadPreferences(), [])
  const [signature, setSignature] = useState(initialPrefs.signature)
  const [defaultTone, setDefaultTone] = useState<Tone>(initialPrefs.defaultTone)
  const [autoSummarize, setAutoSummarize] = useState(initialPrefs.autoSummarize)
  const [confirmBeforeSend, setConfirmBeforeSend] = useState(initialPrefs.confirmBeforeSend)
  const [integrations, setIntegrations] = useState<Record<string, boolean>>(
    initialPrefs.integrations,
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!statusMessage) return
    const id = window.setTimeout(() => setStatusMessage(null), 3000)
    return () => window.clearTimeout(id)
  }, [statusMessage])

  const handleSave = () => {
    savePreferences({ signature, defaultTone, autoSummarize, confirmBeforeSend, integrations })
    setStatusMessage(
      t('settings.savedToast', {}, { defaultValue: 'Settings saved on this device.' }),
    )
  }

  const toggleIntegration = (key: string) => {
    setIntegrations((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      savePreferences({
        signature,
        defaultTone,
        autoSummarize,
        confirmBeforeSend,
        integrations: next,
      })
      return next
    })
  }

  return (
    <div
      data-mol-id="settings-page"
      className={cm.cn('px-4 py-6 md:px-8 md:py-8', cm.maxW('5xl'), 'mx-auto', cm.stack(8))}
    >
      <header className={cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tighter')}>
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'settings.subheading',
              { app: APP_NAME },
              { defaultValue: `Tune ${APP_NAME} to your sending style.` },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="settings-save"
          onClick={handleSave}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-xl text-white transition-all hover:shadow-md',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
          }}
        >
          {t('settings.save', {}, { defaultValue: 'Save settings' })}
        </button>
      </header>

      {statusMessage && (
        <div
          data-mol-id="settings-status"
          role="status"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-lg bg-success/10 text-success',
          )}
        >
          {statusMessage}
        </div>
      )}

      <section
        data-mol-id="settings-signature-section"
        className={cm.cn(
          cm.sp('p', 8),
          'bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40',
        )}
      >
        <h2 className={cm.cn(cm.textSize('xl'), cm.sp('mb', 2), 'font-bold tracking-tight')}>
          {t('settings.signatureHeading', {}, { defaultValue: 'Email signature' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'settings.signatureHelper',
            {},
            { defaultValue: 'Appended to every outgoing message. Plain text or markdown.' },
          )}
        </p>
        <textarea
          data-mol-id="settings-signature"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          rows={6}
          placeholder={t(
            'settings.signaturePlaceholder',
            {},
            { defaultValue: 'Your name\nRole, Company\nEmail · Phone' },
          )}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 4),
            cm.w('full'),
            cm.textSize('sm'),
            'bg-surface-container-low rounded-xl border border-outline-variant/40 outline-none focus:border-primary leading-relaxed',
          )}
          style={{ fontFamily: 'Newsreader, Georgia, serif' }}
        />
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.sp('mt', 4),
            'rounded-xl bg-surface-container-low border-l-2 border-secondary',
          )}
        >
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-secondary-dark mb-2',
            )}
          >
            {t('settings.signaturePreview', {}, { defaultValue: 'Preview' })}
          </p>
          <pre
            data-mol-id="settings-signature-preview"
            className={cm.cn(cm.textSize('sm'), 'whitespace-pre-wrap text-on-surface')}
            style={{ fontFamily: 'Newsreader, Georgia, serif' }}
          >
            {signature ||
              t('settings.signatureEmpty', {}, { defaultValue: '— No signature set —' })}
          </pre>
        </div>
      </section>

      <AiSuggestionPanel
        title={t('settings.toneHeading', {}, { defaultValue: 'Default tone' })}
        subtitle={t(
          'settings.toneSubheading',
          { app: APP_NAME },
          { defaultValue: `${APP_NAME} uses this tone unless you override on the draft.` },
        )}
      >
        <div data-mol-id="settings-tone">
          <TonePillRow value={defaultTone} onChange={setDefaultTone} />
        </div>
      </AiSuggestionPanel>

      <section
        data-mol-id="settings-behavior-section"
        className={cm.cn(
          cm.sp('p', 8),
          'bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40',
        )}
      >
        <h2 className={cm.cn(cm.textSize('xl'), cm.sp('mb', 4), 'font-bold tracking-tight')}>
          {t('settings.behaviorHeading', {}, { defaultValue: 'Composer behavior' })}
        </h2>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {[
            {
              key: 'auto_summarize',
              label: t(
                'settings.autoSummarizeLabel',
                {},
                { defaultValue: 'Auto-summarize long replies in the inbox' },
              ),
              hint: t(
                'settings.autoSummarizeHint',
                {},
                { defaultValue: 'Adds a 2-sentence summary above any message over 250 words.' },
              ),
              value: autoSummarize,
              onToggle: () => setAutoSummarize((v) => !v),
            },
            {
              key: 'confirm_send',
              label: t(
                'settings.confirmSendLabel',
                {},
                { defaultValue: 'Confirm before sending AI-drafted email' },
              ),
              hint: t(
                'settings.confirmSendHint',
                { app: APP_NAME },
                {
                  defaultValue: `Asks for one final review when the draft was generated by ${APP_NAME}.`,
                },
              ),
              value: confirmBeforeSend,
              onToggle: () => setConfirmBeforeSend((v) => !v),
            },
          ].map((row) => (
            <label
              key={row.key}
              data-mol-id={`settings-behavior-${row.key}`}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                cm.sp('px', 4),
                cm.sp('py', 4),
                'rounded-xl bg-surface-container-low cursor-pointer hover:bg-surface-container transition-colors',
              )}
            >
              <span className={cm.cn('flex-1')}>
                <span className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface block')}>
                  {row.label}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant block mt-1')}>
                  {row.hint}
                </span>
              </span>
              <input
                type="checkbox"
                checked={row.value}
                onChange={row.onToggle}
                className={cm.cn('w-5 h-5 accent-primary')}
              />
            </label>
          ))}
        </div>
      </section>

      <section
        data-mol-id="settings-language-section"
        className={cm.cn(
          cm.sp('p', 8),
          'bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40',
        )}
      >
        <h2 className={cm.cn(cm.textSize('xl'), cm.sp('mb', 2), 'font-bold tracking-tight')}>
          {t('footer.language', {}, { defaultValue: 'Language' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'common.chooseTheLanguage',
            {},
            { defaultValue: 'Choose the language used throughout the app.' },
          )}
        </p>
        <LanguagePicker />
      </section>

      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.sp('mb', 6)}>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'common.toggleLightDark',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
        </div>
        <ThemeToggle />
      </section>
      <section
        data-mol-id="settings-integrations-section"
        className={cm.cn(
          cm.sp('p', 8),
          'bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40',
        )}
      >
        <h2 className={cm.cn(cm.textSize('xl'), cm.sp('mb', 4), 'font-bold tracking-tight')}>
          {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
        </h2>
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
          {INTEGRATIONS.map((it) => {
            const connected = integrations[it.key] === true
            return (
              <div
                key={it.key}
                data-mol-id={`settings-integration-${it.key}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('p', 5),
                  'rounded-xl border border-outline-variant/40 bg-surface',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    'bg-primary/10 text-primary',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    {it.icon}
                  </span>
                </span>
                <div className={cm.cn('flex-1')}>
                  <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface')}>
                    {t(
                      `settings.integration.${it.key}.label`,
                      {},
                      { defaultValue: it.defaultLabel },
                    )}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {connected
                      ? t(
                          `settings.integration.${it.key}.metaConnected`,
                          {},
                          { defaultValue: it.metaConnected },
                        )
                      : t(
                          `settings.integration.${it.key}.metaDisconnected`,
                          {},
                          { defaultValue: it.metaDisconnected },
                        )}
                  </p>
                </div>
                <button
                  type="button"
                  data-mol-id={`settings-integration-toggle-${it.key}`}
                  onClick={() => toggleIntegration(it.key)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'transition-colors',
                    connected
                      ? 'bg-success/15 text-success uppercase tracking-widest'
                      : 'bg-primary text-white uppercase tracking-widest hover:opacity-90',
                  )}
                >
                  {connected
                    ? t('settings.disconnect', {}, { defaultValue: 'Disconnect' })
                    : t('common.connect', {}, { defaultValue: 'Connect' })}
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default Settings
export { Settings as SettingsPage }
