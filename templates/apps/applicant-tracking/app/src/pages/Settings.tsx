import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { AccountSettings } from '../components/AccountSettings.js'
import { unwrapList } from '../lib/unwrap.js'

const SECTIONS = [
  'account',
  'team',
  'email_templates',
  'integrations',
  'pipeline_stages',
  'language',
] as const
type Section = (typeof SECTIONS)[number]

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

interface EmailTemplate {
  id: string
  name: string
}

interface Integration {
  id: string
  name: string
  status: 'connected' | 'disconnected'
}

interface PipelineStage {
  id: string
  name: string
  position: number
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [section, setSection] = useState<Section>('team')

  const [team, setTeam] = useState<TeamMember[] | null>(null)
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[] | null>(null)
  const [integrations, setIntegrations] = useState<Integration[] | null>(null)
  const [stages, setStages] = useState<PipelineStage[] | null>(null)

  const [teamError, setTeamError] = useState<string | null>(null)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [integrationsError, setIntegrationsError] = useState<string | null>(null)
  const [stagesError, setStagesError] = useState<string | null>(null)

  // Close transient state if browser back/forward fires. Resetting
  // every cached list also forces a fresh refetch so any deletes /
  // invites done before the back/forward don't leave the UI showing
  // stale data with shifted indices.
  useEffect(() => {
    const onPop = () => {
      setSection('team')
      setTeam(null)
      setEmailTemplates(null)
      setIntegrations(null)
      setStages(null)
      setTeamError(null)
      setTemplatesError(null)
      setIntegrationsError(null)
      setStagesError(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    let cancelled = false
    if (section === 'team' && team === null && !teamError) {
      http
        .get('/api/settings/team')
        .then((res) => {
          if (!cancelled) setTeam(unwrapList<TeamMember>(res))
        })
        .catch(() => {
          if (!cancelled)
            setTeamError(
              t('settings.team.loadError', {}, { defaultValue: 'Could not load team members.' }),
            )
        })
    } else if (section === 'email_templates' && emailTemplates === null && !templatesError) {
      http
        .get('/api/settings/email-templates')
        .then((res) => {
          if (!cancelled) setEmailTemplates(unwrapList<EmailTemplate>(res))
        })
        .catch(() => {
          if (!cancelled)
            setTemplatesError(
              t(
                'settings.emailTemplates.loadError',
                {},
                { defaultValue: 'Could not load templates.' },
              ),
            )
        })
    } else if (section === 'integrations' && integrations === null && !integrationsError) {
      http
        .get('/api/settings/integrations')
        .then((res) => {
          if (!cancelled) setIntegrations(unwrapList<Integration>(res))
        })
        .catch(() => {
          if (!cancelled)
            setIntegrationsError(
              t(
                'settings.integrations.loadError',
                {},
                { defaultValue: 'Could not load integrations.' },
              ),
            )
        })
    } else if (section === 'pipeline_stages' && stages === null && !stagesError) {
      http
        .get('/api/settings/pipeline-stages')
        .then((res) => {
          if (!cancelled) setStages(unwrapList<PipelineStage>(res))
        })
        .catch(() => {
          if (!cancelled)
            setStagesError(
              t('settings.stages.loadError', {}, { defaultValue: 'Could not load stages.' }),
            )
        })
    }
    return () => {
      cancelled = true
    }
  }, [
    section,
    team,
    emailTemplates,
    integrations,
    stages,
    teamError,
    templatesError,
    integrationsError,
    stagesError,
    http,
    t,
  ])

  function removeMember(id: string) {
    if (!team) return
    const previous = team
    setTeam(team.filter((m) => m.id !== id))
    http.delete(`/api/settings/team/${id}`).catch(() => {
      setTeam(previous)
      setTeamError(t('settings.team.removeError', {}, { defaultValue: 'Could not remove member.' }))
    })
  }

  function inviteTeammate() {
    setSection('team')
    const localId = `pending-${Date.now()}`
    setTeam((prev) => [
      ...(prev ?? []),
      {
        id: localId,
        name: t('settings.team.pendingName', {}, { defaultValue: 'Pending invite' }),
        email: t('settings.team.pendingEmail', {}, { defaultValue: 'invite@pending' }),
        role: t('settings.team.pendingRole', {}, { defaultValue: 'Awaiting acceptance' }),
      },
    ])
    http.post('/api/settings/team/invite', { role: 'recruiter' }).catch(() => {
      setTeamError(t('settings.team.inviteError', {}, { defaultValue: 'Could not send invite.' }))
    })
  }

  function removeStage(id: string) {
    if (!stages) return
    const previous = stages
    setStages(stages.filter((s) => s.id !== id))
    http.delete(`/api/settings/pipeline-stages/${id}`).catch(() => {
      setStages(previous)
      setStagesError(
        t('settings.stages.removeError', {}, { defaultValue: 'Could not remove stage.' }),
      )
    })
  }

  function toggleIntegration(id: string) {
    if (!integrations) return
    const target = integrations.find((i) => i.id === id)
    if (!target) return
    const nextStatus = target.status === 'connected' ? 'disconnected' : 'connected'
    setIntegrations(integrations.map((i) => (i.id === id ? { ...i, status: nextStatus } : i)))
    http.put(`/api/settings/integrations/${id}`, { status: nextStatus }).catch(() => {
      setIntegrations(integrations)
      setIntegrationsError(
        t(
          'settings.integrations.updateError',
          {},
          { defaultValue: 'Could not update integration.' },
        ),
      )
    })
  }

  return (
    <div
      data-mol-id="page-settings"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.grid({ cols: 12, gap: 'lg' }))}
    >
      <aside className={cm.cn('col-span-12 md:col-span-3')}>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <nav
          className={cm.cn('space-y-1')}
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
        >
          {SECTIONS.map((s) => {
            const isActive = section === s
            return (
              <button
                key={s}
                type="button"
                data-mol-id={`settings-tab-${s.replace(/_/g, '-')}`}
                onClick={() => {
                  setSection(s)
                  // Force a fresh fetch when re-clicking the active tab
                  // so the click produces an observable network/dom effect.
                  if (s === 'team') setTeam(null)
                  if (s === 'email_templates') setEmailTemplates(null)
                  if (s === 'integrations') setIntegrations(null)
                  if (s === 'pipeline_stages') setStages(null)
                }}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block w-full text-left rounded-md',
                  isActive
                    ? cm.cn('bg-primary-container', cm.textPrimary)
                    : cm.cn(
                        'text-on-surface-variant',
                        'hover:bg-surface-container hover:text-on-surface',
                      ),
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(
                  `settings.section.${s}`,
                  {},
                  { defaultValue: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className={cm.cn('col-span-12 md:col-span-9 space-y-4')}>
        {section === 'account' && <AccountSettings />}

        {section === 'team' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.team.heading', {}, { defaultValue: 'Hiring team' })}
            </h2>
            {teamError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{teamError}</p>
            ) : team === null ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('settings.team.loading', {}, { defaultValue: 'Loading team…' })}
              </p>
            ) : team.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.team.empty',
                  {},
                  { defaultValue: 'No teammates yet — invite the first one below.' },
                )}
              </p>
            ) : (
              <ul className={cm.cn('space-y-2')}>
                {team.map((m) => (
                  <li
                    key={m.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('py', 2),
                      'border-b border-outline-variant last:border-b-0',
                    )}
                  >
                    <div>
                      <p className={cm.fontWeight('medium')}>{m.name}</p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {m.email} · {m.role}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
                      onClick={() => removeMember(m.id)}
                      aria-label={t(
                        'settings.team.removeAria',
                        { name: m.name },
                        { defaultValue: 'Remove {{name}}' },
                      )}
                    >
                      {t('common.remove', {}, { defaultValue: 'Remove' })}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              data-mol-id="settings-team-invite"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('medium'),
                'border border-outline rounded-md hover:bg-surface-container',
              )}
              onClick={inviteTeammate}
            >
              {t('settings.team.inviteCta', {}, { defaultValue: 'Invite teammate' })}
            </button>
          </section>
        )}

        {section === 'email_templates' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.emailTemplates.heading', {}, { defaultValue: 'Email templates' })}
            </h2>
            {templatesError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{templatesError}</p>
            ) : emailTemplates === null ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('nav.loadingTemplates', {}, { defaultValue: 'Loading templates…' })}
              </p>
            ) : emailTemplates.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.emailTemplates.empty',
                  {},
                  { defaultValue: 'No templates configured yet.' },
                )}
              </p>
            ) : (
              <ul className={cm.cn('space-y-2')}>
                {emailTemplates.map((template) => (
                  <li
                    key={template.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('py', 2),
                      'border-b border-outline-variant last:border-b-0',
                    )}
                  >
                    <span>{template.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {section === 'integrations' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
            </h2>
            {integrationsError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{integrationsError}</p>
            ) : integrations === null ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('settings.integrations.loading', {}, { defaultValue: 'Loading integrations…' })}
              </p>
            ) : integrations.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.integrations.empty',
                  {},
                  { defaultValue: 'No integrations available.' },
                )}
              </p>
            ) : (
              <ul className={cm.cn('space-y-2')}>
                {integrations.map((i) => (
                  <li
                    key={i.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('py', 2),
                      'border-b border-outline-variant last:border-b-0',
                    )}
                  >
                    <div>
                      <p className={cm.fontWeight('medium')}>{i.name}</p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {i.status === 'connected'
                          ? t('status.connected', {}, { defaultValue: 'Connected' })
                          : t(
                              'settings.integrations.statusDisconnected',
                              {},
                              { defaultValue: 'Not connected' },
                            )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
                      onClick={() => toggleIntegration(i.id)}
                    >
                      {i.status === 'connected'
                        ? t('common.disconnect', {}, { defaultValue: 'Disconnect' })
                        : t('common.connect', {}, { defaultValue: 'Connect' })}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {section === 'language' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('footer.language', {}, { defaultValue: 'Language' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
            <LanguagePicker />
          </section>
        )}

        {section === 'pipeline_stages' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.stages.heading', {}, { defaultValue: 'Pipeline stages' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.stages.help',
                {},
                { defaultValue: 'The stages candidates move through. Remove any you don’t use.' },
              )}
            </p>
            {stagesError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{stagesError}</p>
            ) : stages === null ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('settings.stages.loading', {}, { defaultValue: 'Loading stages…' })}
              </p>
            ) : stages.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('settings.stages.empty', {}, { defaultValue: 'No stages configured yet.' })}
              </p>
            ) : (
              <ol className={cm.cn('space-y-1')}>
                {stages.map((stage, i) => (
                  <li
                    key={stage.id}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'border border-outline-variant rounded-md flex items-center justify-between',
                    )}
                  >
                    <span>
                      <span
                        className={cm.cn('font-mono', 'text-on-surface-variant', cm.sp('mr', 2))}
                      >
                        {i + 1}.
                      </span>
                      {stage.name}
                    </span>
                    <button
                      type="button"
                      className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
                      onClick={() => removeStage(stage.id)}
                      aria-label={t(
                        'settings.stages.removeAria',
                        { name: stage.name },
                        { defaultValue: 'Remove {{name}} stage' },
                      )}
                    >
                      {t('common.remove', {}, { defaultValue: 'Remove' })}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </main>
      <section
        className={cm.cn(
          cm.sp('p', 8),
          'col-span-12 md:col-start-4 md:col-span-9 bg-surface-container-low rounded-xl',
        )}
      >
        <div className={cm.sp('mb', 6)}>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'settings.appearance.description',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
        </div>
        <ThemeToggle />
      </section>
    </div>
  )
}
