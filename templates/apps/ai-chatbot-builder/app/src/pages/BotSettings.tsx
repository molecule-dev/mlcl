import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import BotSettingsAccessSection from '../components/BotSettingsAccessSection.js'
import BotSettingsAiBehaviorSection from '../components/BotSettingsAiBehaviorSection.js'
import BotSettingsAppearanceSection from '../components/BotSettingsAppearanceSection.js'
import BotSettingsFooter from '../components/BotSettingsFooter.js'
import BotSettingsGeneralSection from '../components/BotSettingsGeneralSection.js'
import BotSettingsSideNavBar from '../components/BotSettingsSideNavBar.js'
import BotSettingsTopBar from '../components/BotSettingsTopBar.js'

// Server-shaped record (snake_case, matches /api/bots/:id payload).
interface BotRecord {
  id: string
  name: string
  description?: string
  status?: string
  model?: string
  temperature?: number
  system_prompt?: string
  max_tokens?: number
  welcome_message?: string
}

const DEFAULT_MODEL = 'claude-sonnet-4-6'

function BotSettings() {
  const cm = getClassMap()
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [bot, setBot] = useState<BotRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Persisted (round-trip with the API) ----------
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [temperature, setTemperature] = useState(0.7)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [maxTokens, setMaxTokens] = useState(1024)
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! How can I help you?')

  // Derived from `status` (no separate column on the server).
  const [active, setActive] = useState(true)

  // UI-only — these fields are not yet wired into the server schema. We
  // keep the controls so the design matches the rest of the app, but we
  // do not send them on save (the API will reject unknown keys).
  const [position, setPosition] = useState('se')
  const [typingIndicator, setTypingIndicator] = useState(true)
  const [allowedDomains, setAllowedDomains] = useState('')
  const [rateLimit, setRateLimit] = useState(50)
  const [requireAuth, setRequireAuth] = useState(false)

  function applyBot(found: BotRecord) {
    setBot(found)
    setName(found.name ?? '')
    setDescription(found.description ?? '')
    setActive((found.status ?? 'draft') !== 'paused')
    setModel(found.model ?? DEFAULT_MODEL)
    setTemperature(typeof found.temperature === 'number' ? found.temperature : 0.7)
    setSystemPrompt(found.system_prompt ?? '')
    setMaxTokens(typeof found.max_tokens === 'number' ? found.max_tokens : 1024)
    setWelcomeMessage(found.welcome_message ?? 'Hello! How can I help you?')
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    const unwrap = (res: unknown): unknown =>
      res && typeof res === 'object' && 'data' in res ? (res as { data: unknown }).data : res
    const fetchPromise = id
      ? http.get(`/api/bots/${id}`).then((res) => {
          const row = unwrap(res) as BotRecord | null
          if (row && row.id) applyBot(row)
        })
      : http.get('/api/bots').then((res) => {
          const body = unwrap(res)
          const inner = (body as { data?: unknown } | null)?.data
          const list = (
            Array.isArray(body) ? body : Array.isArray(inner) ? inner : []
          ) as BotRecord[]
          if (list[0]) applyBot(list[0])
        })

    fetchPromise
      .catch((err) => {
        if (!mounted) return
        setError(
          err instanceof Error
            ? err.message
            : t('botSettings.loadError', {}, { defaultValue: 'Failed to load' }),
        )
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [id, http, t])

  useEffect(() => {
    if (savedAt === null) return
    const timer = setTimeout(() => setSavedAt(null), 2500)
    return () => clearTimeout(timer)
  }, [savedAt])

  async function handleSave() {
    if (!bot) return
    setSaving(true)
    setError(null)
    try {
      const res = await http.put(`/api/bots/${bot.id}`, {
        name,
        description,
        model,
        temperature,
        system_prompt: systemPrompt,
        max_tokens: maxTokens,
        welcome_message: welcomeMessage,
      })
      const updated = ((res as { data?: unknown } | null)?.data ?? res) as BotRecord | null

      // Active toggle maps to bot status (deployed ↔ paused). The server
      // exposes deploy/pause as separate endpoints.
      const desiredActive = active
      const currentlyActive = (bot.status ?? 'draft') !== 'paused'
      if (desiredActive !== currentlyActive) {
        await http.post(`/api/bots/${bot.id}/${desiredActive ? 'deploy' : 'pause'}`, {})
        void track({
          name: desiredActive ? 'bot.deployed' : 'bot.paused',
          properties: { bot_id: bot.id },
        })
      }

      if (updated) applyBot({ ...updated, status: desiredActive ? 'deployed' : 'paused' })
      void track({
        name: 'bot.updated',
        properties: { bot_id: bot.id, status: desiredActive ? 'deployed' : 'paused' },
      })
      setSavedAt(Date.now())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('botSettings.saveError', {}, { defaultValue: 'Save failed' }),
      )
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    if (bot) applyBot(bot)
    setPosition('se')
    setTypingIndicator(true)
    setAllowedDomains('')
    setRateLimit(50)
    setRequireAuth(false)
  }

  if (loading)
    return (
      <div className={cm.cn('bg-background font-body text-on-surface overflow-hidden')}>
        <BotSettingsSideNavBar />
        <BotSettingsTopBar botName={name} />
        <main
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('pt', 16),
            cm.h('screen'),
            'ml-0 md:ml-64 bg-background',
          )}
        >
          <div className={cm.cn(cm.stack(4), cm.w('full'), 'max-w-5xl', cm.sp('px', 12))}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className={cm.cn(cm.h(48), 'bg-surface-container-lowest rounded-3xl animate-pulse')}
              />
            ))}
          </div>
        </main>
      </div>
    )

  return (
    <div className={cm.cn('bg-background font-body text-on-surface overflow-hidden')}>
      <BotSettingsSideNavBar />
      <BotSettingsTopBar botName={name} />
      <main
        className={cm.cn(
          cm.sp('pt', 16),
          cm.h('screen'),
          'ml-0 md:ml-64 overflow-y-auto no-scrollbar bg-background',
        )}
      >
        <div
          className={cm.cn(
            'max-w-5xl',
            cm.mxAuto,
            cm.sp('px', 12),
            cm.sp('py', 12),
            cm.stack(10),
            'pb-32',
          )}
        >
          {error && (
            <p
              role="alert"
              className={cm.cn(cm.textSize('sm'), cm.sp('px', 1))}
              style={{ color: 'var(--md-sys-color-error)' }}
            >
              {error}
            </p>
          )}
          <BotSettingsGeneralSection
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            active={active}
            setActive={setActive}
          />
          <BotSettingsAiBehaviorSection
            model={model}
            setModel={setModel}
            temperature={temperature}
            setTemperature={setTemperature}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            maxTokens={maxTokens}
            setMaxTokens={setMaxTokens}
          />
          <BotSettingsAppearanceSection
            welcomeMessage={welcomeMessage}
            setWelcomeMessage={setWelcomeMessage}
            position={position}
            setPosition={setPosition}
            typingIndicator={typingIndicator}
            setTypingIndicator={setTypingIndicator}
          />
          <BotSettingsAccessSection
            allowedDomains={allowedDomains}
            setAllowedDomains={setAllowedDomains}
            rateLimit={rateLimit}
            setRateLimit={setRateLimit}
            requireAuth={requireAuth}
            setRequireAuth={setRequireAuth}
          />
        </div>
      </main>
      <BotSettingsFooter
        onSave={handleSave}
        onDiscard={handleDiscard}
        saving={saving}
        savedAt={savedAt}
      />
    </div>
  )
}

export default BotSettings
export { BotSettings, BotSettings as BotSettingsPage }
