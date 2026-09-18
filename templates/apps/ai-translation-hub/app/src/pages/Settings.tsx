import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { LanguagePairBadge } from '../components/LanguagePairBadge.js'
import { PageHeading } from '../components/PageHeading.js'

interface Pair {
  source: string
  target: string
}

const INITIAL_PAIRS: ReadonlyArray<Pair> = [
  { source: 'en', target: 'es' },
  { source: 'en', target: 'fr' },
  { source: 'en', target: 'de' },
  { source: 'en', target: 'ja' },
  { source: 'en', target: 'pt-BR' },
]

const SUGGESTION_PAIRS: ReadonlyArray<Pair> = [
  { source: 'en', target: 'it' },
  { source: 'en', target: 'ko' },
  { source: 'en', target: 'zh-CN' },
  { source: 'en', target: 'ar' },
  { source: 'en', target: 'nl' },
]

interface Integration {
  key: string
  label: string
  description: string
  connected: boolean
  icon: string
}

const INTEGRATIONS: ReadonlyArray<Integration> = [
  {
    key: 'github',
    label: 'GitHub',
    description: 'Sync .po / .json files from a repository pull request.',
    connected: true,
    icon: 'code',
  },
  {
    key: 'figma',
    label: 'Figma',
    description: 'Pull text from Figma design files for translation.',
    connected: false,
    icon: 'design_services',
  },
  {
    key: 'contentful',
    label: 'Contentful',
    description: 'Two-way sync of Contentful entries.',
    connected: true,
    icon: 'storage',
  },
  {
    key: 'slack',
    label: 'Slack',
    description: 'Notify channels when reviews are requested.',
    connected: false,
    icon: 'chat',
  },
]

const STORAGE_KEY = 'ai-translation-hub:workspace-settings'

interface PersistedSettings {
  aiAssist: boolean
  autoApply: boolean
  glossaryEnforce: boolean
  pairs: ReadonlyArray<Pair>
  integrations: ReadonlyArray<Integration>
}

function loadPersisted(): PersistedSettings | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>
    return {
      aiAssist: typeof parsed.aiAssist === 'boolean' ? parsed.aiAssist : true,
      autoApply: typeof parsed.autoApply === 'boolean' ? parsed.autoApply : false,
      glossaryEnforce: typeof parsed.glossaryEnforce === 'boolean' ? parsed.glossaryEnforce : true,
      pairs: Array.isArray(parsed.pairs) ? (parsed.pairs as ReadonlyArray<Pair>) : INITIAL_PAIRS,
      integrations: Array.isArray(parsed.integrations)
        ? (parsed.integrations as ReadonlyArray<Integration>)
        : INTEGRATIONS,
    }
  } catch (_error) {
    // Corrupted or unparseable persisted settings — fall back to defaults.
    return null
  }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const initial = loadPersisted()
  const [aiAssist, setAiAssist] = useState<boolean>(initial?.aiAssist ?? true)
  const [autoApply, setAutoApply] = useState<boolean>(initial?.autoApply ?? false)
  const [glossaryEnforce, setGlossaryEnforce] = useState<boolean>(initial?.glossaryEnforce ?? true)
  const [pairs, setPairs] = useState<ReadonlyArray<Pair>>(initial?.pairs ?? INITIAL_PAIRS)
  const [showAddPair, setShowAddPair] = useState(false)
  const [integrations, setIntegrations] = useState<ReadonlyArray<Integration>>(
    initial?.integrations ?? INTEGRATIONS.map((i) => ({ ...i })),
  )
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          aiAssist,
          autoApply,
          glossaryEnforce,
          pairs,
          integrations,
        } satisfies PersistedSettings),
      )
      setSaved(t('common.settingsSavedPeriod', {}, { defaultValue: 'Settings saved.' }))
      const id = window.setTimeout(() => setSaved(null), 1500)
      return () => window.clearTimeout(id)
    } catch (_error) {
      // localStorage quota exceeded — settings not persisted, safe to ignore.
    }
  }, [aiAssist, autoApply, glossaryEnforce, pairs, integrations, t])

  const handleAddPair = () => {
    setShowAddPair((prev) => !prev)
  }

  const handleSelectPair = (pair: Pair) => {
    if (!pairs.some((p) => p.source === pair.source && p.target === pair.target)) {
      setPairs((prev) => [...prev, pair])
    }
    setShowAddPair(false)
  }

  const handleToggleIntegration = (key: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.key === key ? { ...i, connected: !i.connected } : i)),
    )
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 8),
        cm.maxW('5xl'),
        cm.mxAuto,
        cm.minH('screen'),
        'w-full',
      )}
    >
      <PageHeading
        eyebrow={t('settings.eyebrow', {}, { defaultValue: 'Workspace settings' })}
        title={t('nav.settings', {}, { defaultValue: 'Settings' })}
        subtitle={t(
          'settings.subtitle',
          {},
          { defaultValue: 'Locale defaults, AI behavior, and integrations.' },
        )}
      />

      {saved && (
        <div
          role="status"
          data-mol-id="settings-saved"
          className={cm.cn(
            cm.sp('p', 3),
            'rounded-xl bg-primary-fixed/40 text-on-primary-fixed text-sm',
          )}
        >
          {saved}
        </div>
      )}

      <section
        data-mol-id="settings-language-section"
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl border border-surface-container/50 shadow-sm',
        )}
      >
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mb', 2),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.appLanguageHeading', {}, { defaultValue: 'App language' })}
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
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl border border-surface-container/50 shadow-sm',
        )}
      >
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mb', 4),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.languagesHeading', {}, { defaultValue: 'Default language pairs' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          {pairs.map((p, i) => (
            <LanguagePairBadge
              key={`${p.source}-${p.target}-${i}`}
              source={p.source}
              target={p.target}
            />
          ))}
          <button
            onClick={handleAddPair}
            type="button"
            aria-expanded={showAddPair}
            className={cm.cn(
              cm.fontWeight('semibold'),
              'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono border border-dashed border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              {showAddPair ? 'close' : 'add'}
            </span>
            {showAddPair
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('settings.addPair', {}, { defaultValue: 'Add pair' })}
          </button>
        </div>
        {showAddPair && (
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('settings.addPairChoose', {}, { defaultValue: 'Choose a pair to add' })}
            </p>
            {SUGGESTION_PAIRS.filter(
              (s) => !pairs.some((p) => p.source === s.source && p.target === s.target),
            ).map((s) => (
              <button
                key={`${s.source}-${s.target}`}
                type="button"
                onClick={() => handleSelectPair(s)}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface hover:bg-primary-fixed transition-colors',
                )}
              >
                <LanguagePairBadge source={s.source} target={s.target} size="sm" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl border border-surface-container/50 shadow-sm',
        )}
      >
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mb', 4),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.aiHeading', {}, { defaultValue: 'AI behavior' })}
        </h2>
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <SettingToggle
            label={t('settings.aiAssist.label', {}, { defaultValue: 'AI-assisted segments' })}
            description={t(
              'settings.aiAssist.description',
              {},
              { defaultValue: 'Pre-fill empty segments with Claude + DeepL suggestions.' },
            )}
            value={aiAssist}
            onChange={setAiAssist}
          />
          <SettingToggle
            label={t(
              'settings.autoApply.label',
              {},
              { defaultValue: 'Auto-apply 100% TM matches' },
            )}
            description={t(
              'settings.autoApply.description',
              {},
              { defaultValue: 'Automatically commit translations when memory match is exact.' },
            )}
            value={autoApply}
            onChange={setAutoApply}
          />
          <SettingToggle
            label={t('settings.glossary.label', {}, { defaultValue: 'Enforce glossary' })}
            description={t(
              'settings.glossary.description',
              {},
              { defaultValue: 'Block segments that diverge from approved terminology.' },
            )}
            value={glossaryEnforce}
            onChange={setGlossaryEnforce}
          />
        </ul>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl border border-surface-container/50 shadow-sm',
        )}
      >
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mb', 4),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
        </h2>
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
          {integrations.map((i) => (
            <article
              key={i.key}
              className={cm.cn(
                cm.sp('p', 5),
                cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
                'bg-surface-container-low rounded-xl border border-surface-container/50',
              )}
            >
              <div className={cm.flex({ align: 'start', gap: 'md' })}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    'rounded-xl bg-primary-fixed text-primary',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[20px]')}
                    aria-hidden="true"
                  >
                    {i.icon}
                  </span>
                </span>
                <div>
                  <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                    {t(`settings.integration.${i.key}.label`, {}, { defaultValue: i.label })}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mt', 1),
                      'text-on-surface-variant leading-relaxed',
                    )}
                  >
                    {t(
                      `settings.integration.${i.key}.description`,
                      {},
                      { defaultValue: i.description },
                    )}
                  </p>
                </div>
              </div>
              <button
                data-mol-id={`settings-integration-${i.key}`}
                onClick={() => handleToggleIntegration(i.key)}
                type="button"
                aria-pressed={i.connected}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'rounded-full transition-colors',
                  i.connected
                    ? 'bg-success-light text-success'
                    : 'border border-outline-variant/40 text-primary hover:bg-surface-container',
                )}
              >
                {i.connected
                  ? t('settings.connected', {}, { defaultValue: 'Connected' })
                  : t('common.connect', {}, { defaultValue: 'Connect' })}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

interface SettingToggleProps {
  label: string
  description: string
  value: boolean
  onChange: (next: boolean) => void
}

function SettingToggle({ label, description, value, onChange }: SettingToggleProps) {
  const cm = getClassMap()
  const id = `settings-toggle-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <li className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }))}>
      <div>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{label}</p>
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        data-mol-id={id}
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cm.cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
          value ? 'bg-primary' : 'bg-surface-container-high',
        )}
      >
        <span
          className={cm.cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
            value ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </li>
  )
}

export default Settings
export { Settings as SettingsPage }
