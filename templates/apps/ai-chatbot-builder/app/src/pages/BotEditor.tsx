import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AiFlowPulseIndicator from '../components/AiFlowPulseIndicator.js'
import { AppShell } from '../components/AppShell.js'
import BotEditorCanvas from '../components/BotEditorCanvas.js'
import BotEditorNodePropertiesPanel from '../components/BotEditorNodePropertiesPanel.js'
import UserMenu from '../components/UserMenu.js'

interface NewBotResponse {
  id?: string
}

function CreateBotForm() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('Hi! I am here to help. Ask me anything.')
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a friendly, concise assistant. Stay on-topic and acknowledge when you do not know.',
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await http.post('/api/bots', {
        name: name.trim(),
        description: description.trim(),
        welcome_message: welcomeMessage.trim(),
        system_prompt: systemPrompt.trim(),
      })
      const body = (res as { data?: unknown })?.data ?? res
      const id = (body as NewBotResponse | undefined)?.id
      if (!id) {
        throw new Error(
          t('botCreate.missingId', {}, { defaultValue: 'Server did not return a bot id.' }),
        )
      }
      // Domain analytics: the funnel's entry point (fire-and-forget).
      void track({ name: 'bot.created', properties: { bot_id: id } })
      navigate(`/bots/${id}/settings`)
    } catch (err) {
      const status = (err as { status?: number; response?: { status?: number } })?.status
      const responseStatus = (err as { response?: { status?: number } })?.response?.status
      if (status === 402 || responseStatus === 402) {
        setError(
          t(
            'botCreate.tierLimit',
            {},
            {
              defaultValue:
                'You have reached the bot limit on your current plan. Upgrade to add more bots.',
            },
          ),
        )
      } else {
        setError(
          err instanceof Error
            ? err.message
            : t('botCreate.failed', {}, { defaultValue: 'Could not create bot' }),
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={cm.cn(cm.minH('screen'), 'flex items-center justify-center px-6 py-12')}>
      <form
        onSubmit={handleSubmit}
        className={cm.cn(
          cm.w('full'),
          cm.stack(6),
          'max-w-xl bg-surface-container-lowest rounded-3xl ambient-shadow p-10',
        )}
        aria-label={t('botCreate.formLabel', {}, { defaultValue: 'Create a new bot' })}
      >
        <div>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'font-headline tracking-tight',
            )}
          >
            {t('botCreate.heading', {}, { defaultValue: 'Create a new bot' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 2), 'text-on-surface-variant text-sm')}>
            {t(
              'botCreate.subtitle',
              {},
              {
                defaultValue:
                  'Give your bot a name and a brief role description. You can refine its prompt and behaviour after creating it.',
              },
            )}
          </p>
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="bot-name"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            {t('botCreate.nameLabel', {}, { defaultValue: 'Bot name' })}
          </label>
          <input
            id="bot-name"
            name="name"
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t(
              'botCreate.namePlaceholder',
              {},
              { defaultValue: 'Customer support concierge' },
            )}
            className={cm.cn(
              cm.w('full'),
              'bg-surface-container-high border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/40 transition-shadow',
            )}
          />
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="bot-description"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            {t('form.description', {}, { defaultValue: 'Description' })}
          </label>
          <input
            id="bot-description"
            name="description"
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t(
              'botCreate.descriptionPlaceholder',
              {},
              { defaultValue: 'What is this bot for?' },
            )}
            className={cm.cn(
              cm.w('full'),
              'bg-surface-container-high border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/40 transition-shadow',
            )}
          />
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="bot-welcome"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            {t('botCreate.welcomeLabel', {}, { defaultValue: 'Welcome message' })}
          </label>
          <input
            id="bot-welcome"
            name="welcome_message"
            maxLength={1000}
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            className={cm.cn(
              cm.w('full'),
              'bg-surface-container-high border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/40 transition-shadow',
            )}
          />
        </div>
        <div className={cm.stack(2)}>
          <label
            htmlFor="bot-system-prompt"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-wider text-on-surface-variant',
            )}
          >
            {t('botCreate.systemPromptLabel', {}, { defaultValue: 'System prompt' })}
          </label>
          <textarea
            id="bot-system-prompt"
            name="system_prompt"
            rows={4}
            maxLength={10000}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className={cm.cn(
              cm.w('full'),
              'bg-surface-container-high border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/40 transition-shadow',
            )}
          />
        </div>
        {error && (
          <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className={cm.cn(
            cm.w('full'),
            cm.fontWeight('bold'),
            'btn-gradient text-on-primary py-3 rounded-xl text-base shadow-md disabled:opacity-50',
          )}
        >
          {submitting
            ? t('botCreate.submitting', {}, { defaultValue: 'Creating bot…' })
            : t('botCreate.submit', {}, { defaultValue: 'Create bot' })}
        </button>
      </form>
    </main>
  )
}

function BotEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [botName, setBotName] = useState<string | undefined>(undefined)

  // The /bots/new route uses this same component. We branch early so users
  // arriving at /bots/new always see a real creation form (and the POST
  // that backs it) rather than the visual flow canvas with no save path.
  const isCreating = !id || id === 'new'

  useEffect(() => {
    if (isCreating) return
    let active = true
    http
      .get(`/api/bots/${id}`)
      .then((res) => {
        if (!active) return
        setLoadError(null)
        const body = (res as { data?: unknown })?.data ?? res
        const name = (body as { name?: string } | null)?.name
        if (typeof name === 'string' && name) setBotName(name)
      })
      .catch(() => {
        if (active)
          setLoadError(t('botEditor.loadError', {}, { defaultValue: 'Failed to load bot' }))
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isCreating])

  if (isCreating) {
    return <CreateBotForm />
  }

  // The former BotEditorTopBar, folded into the shared shell's top bar:
  // bot name in the leading slot, Test/Deploy + bot settings + user menu in
  // actions. The editor canvas fills the content column (h-screen, internal
  // overflow) exactly as before.
  const shellLeading = (
    <h1 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface truncate')}>
      {botName ?? t('botEditorTopBar.untitledBot', {}, { defaultValue: 'Untitled bot' })}
    </h1>
  )
  const shellActions = (
    <>
      <Link
        className={cm.cn(
          'text-foreground-tertiary dark:text-outline-variant hover:text-indigo-300 dark:hover:text-[var(--mol-color-primary-light)] transition-all flex items-center gap-2',
        )}
        to={`/test-chat?botId=${id}`}
      >
        <span
          className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
          data-icon="play_circle"
        >
          play_circle
        </span>
        {t('botEditorTopBar.test', {}, { defaultValue: 'Test' })}
      </Link>
      <Link
        className={cm.cn(
          'bg-primary px-5 py-1.5 rounded-lg text-on-primary font-semibold hover:opacity-90 active:opacity-80 transition-all',
        )}
        to={`/bots/${id}/deploy`}
      >
        {t('botEditorTopBar.deploy', {}, { defaultValue: 'Deploy' })}
      </Link>
      <button
        type="button"
        aria-label={t('botEditorTopBar.botSettings', {}, { defaultValue: 'Bot settings' })}
        className={cm.cn(
          cm.cursorPointer,
          'material-symbols-outlined hover:text-indigo-300 transition-colors',
        )}
        data-icon="settings"
        onClick={() => navigate(`/bots/${id}/settings`)}
      >
        settings
      </button>
      <UserMenu />
    </>
  )

  return (
    <AppShell
      className="dark bg-background text-on-surface font-body selection:bg-primary/30 antialiased overflow-hidden"
      leading={shellLeading}
      actions={shellActions}
      contentClassName="h-screen overflow-hidden"
    >
      <main className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'relative h-full')}>
        {/* Workspace Content: Canvas + Right Panel */}
        <div className={cm.cn(cm.flex(), cm.flex1, 'overflow-hidden')}>
          {/* Main Canvas (Visual Flow Editor) */}
          <BotEditorCanvas />
          {/* Right Panel (Node Properties) */}
          <BotEditorNodePropertiesPanel />
        </div>
        {loadError && (
          <div
            role="alert"
            className={cm.cn(
              'absolute bottom-4 right-4 max-w-xs px-3 py-2 rounded text-sm bg-error-container text-on-error-container shadow',
            )}
          >
            {loadError}
          </div>
        )}
      </main>
      {/* Floating AI Pulse Indicator (Center Bottom) */}
      <AiFlowPulseIndicator />
    </AppShell>
  )
}

export default BotEditor
export { BotEditor, BotEditor as BotEditorPage }
