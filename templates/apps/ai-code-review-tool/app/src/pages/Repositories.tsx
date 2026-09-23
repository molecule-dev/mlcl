import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Repository {
  id: string
  full_name: string
  provider: 'github' | 'gitlab' | 'bitbucket' | 'self_hosted'
  default_branch: string | null
  sync_status: 'pending' | 'synced' | 'error'
  last_sync_at: string | null
}

const STATUS_TINT: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: 'bg-cyan-500/15', fg: 'text-cyan-600', label: 'Pending' },
  synced: { bg: 'bg-emerald-500/15', fg: 'text-success', label: 'Synced' },
  error: { bg: 'bg-red-500/15', fg: 'text-error', label: 'Error' },
}

const PROVIDER_ICON: Record<string, string> = {
  github: 'hub',
  gitlab: 'merge_type',
  bitbucket: 'corporate_fare',
  self_hosted: 'storage',
}

export function Repositories() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [connectFullName, setConnectFullName] = useState('')
  const [connectProvider, setConnectProvider] = useState<'github' | 'gitlab'>('github')
  const [connectBusy, setConnectBusy] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  const loadRepos = () => {
    setLoading(true)
    setError(null)
    http
      .get('/api/repositories')
      .catch(() => null)
      .then((res) => setRepos(unwrapList<Repository>(res)))
      .catch(() =>
        setError(t('repositories.loadError', {}, { defaultValue: 'Failed to load repositories.' })),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/repositories')
      .catch(() => null)
      .then((res) => {
        if (!cancelled) setRepos(unwrapList<Repository>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('repositories.loadError', {}, { defaultValue: 'Failed to load repositories.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!connectFullName.trim()) {
      setConnectError(
        t('repositories.fullNameRequired', {}, { defaultValue: 'Repository name is required.' }),
      )
      return
    }
    setConnectBusy(true)
    setConnectError(null)
    try {
      const res = await http.post('/api/repositories', {
        provider: connectProvider,
        full_name: connectFullName.trim(),
        default_branch: 'main',
      })
      const created = unwrapSingle<Repository>(res)
      track({
        name: 'repo.connected',
        properties: {
          repository_id: created?.id,
          provider: connectProvider,
          full_name: created?.full_name ?? connectFullName.trim(),
        },
      })
      setConnectFullName('')
      setConnectOpen(false)
      loadRepos()
    } catch (err) {
      setConnectError(
        err instanceof Error
          ? err.message
          : t('repositories.connectError', {}, { defaultValue: 'Failed to connect repository.' }),
      )
    } finally {
      setConnectBusy(false)
    }
  }

  return (
    <div className={cm.cn(cm.flex1, cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary font-mono',
            )}
          >
            {t(
              'repositories.eyebrow',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} · integrations' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mt', 1),
              'tracking-tight',
            )}
          >
            {t('repositories.heading', {}, { defaultValue: 'Repositories' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'repositories.subheading',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Connected source repositories that {{appName}} reviews on every push.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConnectOpen((v) => !v)}
          aria-expanded={connectOpen}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-full bg-primary-dark text-white hover:opacity-90 transition-opacity shadow-sm shadow-primary/30',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add_link
          </span>
          {connectOpen
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('repositories.connectCta', {}, { defaultValue: 'Connect repository' })}
        </button>
      </header>

      {connectOpen ? (
        <form
          onSubmit={handleConnect}
          className={cm.cn(
            cm.sp('p', 5),
            'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
            cm.stack(4),
          )}
        >
          <div>
            <label
              htmlFor="repo-provider"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant font-mono',
                cm.sp('mb', 1),
                'block',
              )}
            >
              {t('repositories.providerLabel', {}, { defaultValue: 'Provider' })}
            </label>
            <select
              id="repo-provider"
              value={connectProvider}
              onChange={(e) => setConnectProvider(e.target.value as 'github' | 'gitlab')}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md bg-surface border border-outline-variant/40',
              )}
            >
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="repo-full-name"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant font-mono',
                cm.sp('mb', 1),
                'block',
              )}
            >
              {t('repositories.fullNameLabel', {}, { defaultValue: 'Full name (owner/repo)' })}
            </label>
            <input
              id="repo-full-name"
              type="text"
              value={connectFullName}
              onChange={(e) => setConnectFullName(e.target.value)}
              placeholder={t(
                'repositories.fullNamePlaceholder',
                {},
                { defaultValue: 'e.g. yourorg/your-repo' },
              )}
              required
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md bg-surface border border-outline-variant/40 font-mono',
              )}
            />
          </div>
          {connectError ? (
            <p className={cm.cn(cm.textSize('xs'), 'text-error')}>{connectError}</p>
          ) : null}
          <button
            type="submit"
            disabled={connectBusy}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full bg-primary-dark text-white hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50',
            )}
          >
            {connectBusy
              ? t('repositories.connecting', {}, { defaultValue: 'Connecting…' })
              : t('repositories.connectSubmit', {}, { defaultValue: 'Add repository' })}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className={cm.cn(cm.sp('py', 4), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : repos.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t(
            'repositories.empty',
            {},
            {
              defaultValue:
                'No repositories connected yet — use the Connect button above to add one.',
            },
          )}
        </p>
      ) : (
        <ul className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
          {repos.map((repo) => {
            const tint = STATUS_TINT[repo.sync_status] ?? STATUS_TINT.pending!
            const providerIcon = PROVIDER_ICON[repo.provider] ?? 'storage'
            const last = repo.last_sync_at
              ? new Date(repo.last_sync_at).toLocaleDateString()
              : t('repositories.never', {}, { defaultValue: 'Never' })
            const shortName = repo.full_name.split('/').pop() ?? repo.full_name
            return (
              <li key={repo.id}>
                <Link
                  to={`/repos/${repo.id}`}
                  className={cm.cn(
                    cm.sp('p', 5),
                    cm.flex({ direction: 'col', gap: 'md' }),
                    'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group',
                  )}
                >
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      className={cm.cn(
                        'w-9 h-9 rounded-lg bg-inverse-surface text-inverse-on-surface inline-flex items-center justify-center',
                      )}
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined text-[18px]">{providerIcon}</span>
                    </span>
                    <span className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0 flex-1')}>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'text-on-surface group-hover:text-primary truncate',
                        )}
                      >
                        {shortName}
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-mono text-on-surface-variant truncate',
                        )}
                      >
                        {repo.full_name}
                      </span>
                    </span>
                    <span
                      className={cm.cn(
                        'px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest font-mono shrink-0',
                        tint.bg,
                        tint.fg,
                      )}
                    >
                      {t(
                        `repositories.status.${repo.sync_status}`,
                        {},
                        { defaultValue: tint.label },
                      )}
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                      'text-xs font-mono tabular-nums text-on-surface-variant',
                    )}
                  >
                    <span className={cm.flex({ align: 'center', gap: 'xs' })}>
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                        account_tree
                      </span>
                      {repo.default_branch ?? 'main'}
                    </span>
                    <span className="ml-auto">
                      {t(
                        'repositories.lastSync',
                        { when: last },
                        { defaultValue: 'Last sync {{when}}' },
                      )}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
