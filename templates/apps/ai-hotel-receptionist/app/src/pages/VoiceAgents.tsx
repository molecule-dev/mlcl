import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'

import { unwrapList } from '../lib/unwrap.js'

interface VoiceAgentRow {
  id: string
  name: string
  phone_number: string
  languages: string[] | string
  upsell_enabled: boolean
  max_discount_percent: number
  transfer_to_human_on: string[] | string
  after_hours_message: string | null
  active: boolean
}

const ALL_LANGUAGES = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'it', 'pt'] as const

function asStringArray(value: string[] | string): string[] {
  if (Array.isArray(value)) return value
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch (_error) {
    return []
  }
}

export function VoiceAgents() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [agents, setAgents] = useState<VoiceAgentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await http.get('/api/voice-agents')
      setAgents(unwrapList<VoiceAgentRow>(res))
      setError(null)
    } catch (_e) {
      setError(t('voiceAgents.loadError', {}, { defaultValue: 'Failed to load voice agents.' }))
    }
  }, [http, t])

  useEffect(() => {
    void load()
  }, [load])

  const toggleLanguage = async (agent: VoiceAgentRow, lang: string) => {
    setBusyId(agent.id)
    try {
      const current = asStringArray(agent.languages)
      const next = current.includes(lang) ? current.filter((l) => l !== lang) : [...current, lang]
      if (next.length === 0) return // an agent must speak at least one language
      await http.patch('/api/voice-agents/' + agent.id, { languages: next })
      void track({
        name: 'voice-agent.language_toggled',
        properties: {
          agent_id: agent.id,
          language: lang,
          enabled: next.includes(lang),
        },
      })
      await load()
    } catch (_e) {
      setError(t('voiceAgents.updateError', {}, { defaultValue: 'Could not update the agent.' }))
    } finally {
      setBusyId(null)
    }
  }

  const toggleUpsell = async (agent: VoiceAgentRow, upsellEnabled: boolean) => {
    setBusyId(agent.id)
    try {
      await http.patch('/api/voice-agents/' + agent.id, { upsell_enabled: upsellEnabled })
      void track({
        name: 'voice-agent.upsell_toggled',
        properties: { agent_id: agent.id, enabled: upsellEnabled },
      })
      await load()
    } catch (_e) {
      setError(t('voiceAgents.updateError', {}, { defaultValue: 'Could not update the agent.' }))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <h1
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}
        data-mol-id="voice-agents-heading"
      >
        {t('voiceAgents.heading', {}, { defaultValue: 'Voice agents' })}
      </h1>
      <p className={cm.cn(cm.sp('mt', 1), 'text-on-surface-variant')}>
        {t(
          'voiceAgents.subheading',
          {},
          {
            defaultValue:
              'Configure the phone receptionists: which languages they speak, and the rules they follow on a call.',
          },
        )}
      </p>

      {error ? (
        <p
          data-mol-id="voice-agents-error"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-xl bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      ) : null}

      <ul className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'lg' }))}>
        {agents.length === 0 ? (
          <li data-mol-id="voice-agents-empty" className="text-on-surface-variant">
            {t('voiceAgents.empty', {}, { defaultValue: 'No voice agents configured yet.' })}
          </li>
        ) : (
          agents.map((agent) => {
            const languages = asStringArray(agent.languages)
            const transferOn = asStringArray(agent.transfer_to_human_on)
            return (
              <li
                key={agent.id}
                data-mol-id={'voice-agent-' + agent.id}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface border border-outline-variant',
                )}
              >
                <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' })}>
                  <div>
                    <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                      {agent.name}
                    </h2>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {agent.phone_number}
                    </p>
                  </div>
                  <Link
                    to={'/simulator?agent=' + agent.id}
                    data-mol-id={'voice-agent-simulate-' + agent.id}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                      'rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors',
                    )}
                  >
                    {t('voiceAgents.simulateCall', {}, { defaultValue: 'Simulate a call' })}
                  </Link>
                </div>

                {/* Languages — the multilingual story made visible */}
                <div className={cm.sp('mt', 4)}>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('voiceAgents.languagesLabel', {}, { defaultValue: 'Languages spoken' })}
                  </p>
                  <div
                    className={cm.cn(cm.sp('mt', 2), cm.flex({ gap: 'sm', wrap: 'wrap' }))}
                    role="group"
                  >
                    {ALL_LANGUAGES.map((lang) => {
                      const on = languages.includes(lang)
                      return (
                        <button
                          key={lang}
                          type="button"
                          disabled={busyId === agent.id || (on && languages.length === 1)}
                          aria-pressed={on}
                          data-mol-id={'voice-agent-lang-' + agent.id + '-' + lang}
                          onClick={() => void toggleLanguage(agent, lang)}
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            // Touch-first: every chip is a >=40px tall target.
                            'inline-flex min-h-10 items-center justify-center rounded-full border transition-colors disabled:opacity-60',
                            on
                              ? 'bg-primary text-on-primary border-primary'
                              : 'bg-surface text-on-surface-variant border-outline-variant hover:border-primary',
                          )}
                        >
                          {lang}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Rules */}
                <div className={cm.cn(cm.sp('mt', 4), cm.flex({ gap: 'lg', wrap: 'wrap' }))}>
                  {/* Shared accessible switch: role=switch + aria-checked carry
                      the on/off state, the 40px hit-area is built in. */}
                  <Switch
                    checked={agent.upsell_enabled}
                    disabled={busyId === agent.id}
                    data-mol-id={'voice-agent-upsell-' + agent.id}
                    label={t('voiceAgents.upsell', {}, { defaultValue: 'Upsell upsells' })}
                    aria-label={t('voiceAgents.upsell', {}, { defaultValue: 'Upsell upsells' })}
                    onChange={(e) =>
                      void toggleUpsell(agent, (e.target as HTMLInputElement).checked)
                    }
                  />
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'voiceAgents.maxDiscount',
                      { percent: agent.max_discount_percent },
                      { defaultValue: 'Max discount {{percent}}%' },
                    )}
                    {transferOn.length > 0
                      ? ' · ' +
                        t(
                          'voiceAgents.transfersOn',
                          { list: transferOn.join(', ') },
                          { defaultValue: 'transfers to a human on: {{list}}' },
                        )
                      : ''}
                  </p>
                </div>

                {agent.after_hours_message ? (
                  <p
                    data-mol-id={'voice-agent-after-hours-' + agent.id}
                    className={cm.cn(
                      cm.sp('mt', 3),
                      cm.sp('p', 3),
                      cm.textSize('sm'),
                      'rounded-xl bg-surface-container-low border border-outline-variant italic',
                    )}
                  >
                    {agent.after_hours_message}
                  </p>
                ) : null}
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
