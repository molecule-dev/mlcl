import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface PullRequestHeroProps {
  prCount: number
  reposConnected: number
  avgScore: number
  uptimePct: number
  /** Sample diff snippet rendered into the right-hand terminal panel. */
  sampleRepo?: string
  sampleBranch?: string
}

/**
 * Dark dev-tools gradient hero — terminal-style background with a
 * "review preview" diff block, +/- syntax-highlighted lines, scanline
 * dotted grid overlay, decorative blurred orbs.
 *
 * Translated from api-documentation's EndpointPlaygroundHero pattern
 * (dev-tools cluster idiom) — recoloured to Refract's violet/cyan
 * palette and wired to PR-review semantics (additions, deletions,
 * AI score).
 */
export function PullRequestHero({
  prCount,
  reposConnected,
  avgScore,
  uptimePct,
  sampleRepo = 'frontend-core',
  sampleBranch = 'feat/oauth-rotation',
}: PullRequestHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const stats: { key: string; label: string; value: string; color: string }[] = [
    {
      key: 'prs',
      label: t('pullRequestHero.prsLabel', {}, { defaultValue: 'PRs' }),
      value: String(prCount),
      color: 'text-violet-300',
    },
    {
      key: 'repos',
      label: t('pullRequestHero.reposLabel', {}, { defaultValue: 'Repos' }),
      value: String(reposConnected),
      color: 'text-cyan-300',
    },
    {
      key: 'score',
      label: t('pullRequestHero.scoreLabel', {}, { defaultValue: 'Avg score' }),
      value: avgScore.toFixed(1),
      color: 'text-emerald-300',
    },
    {
      key: 'uptime',
      label: t('pullRequestHero.uptimeLabel', {}, { defaultValue: 'Uptime' }),
      value: `${uptimePct.toFixed(1)}%`,
      color: 'text-cyan-300',
    },
  ]

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10',
      )}
      style={{ backgroundColor: 'var(--color-ink-panel-bright)', minHeight: '420px' }}
    >
      <div
        className={cm.cn('absolute inset-0')}
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 35%, rgba(124, 58, 237, 0.34) 0%, transparent 38%),' +
            'radial-gradient(circle at 75% 65%, rgba(6, 182, 212, 0.28) 0%, transparent 35%),' +
            'linear-gradient(135deg, var(--color-ink-panel-bright) 0%, var(--color-ink-deep) 100%)',
        }}
        aria-hidden="true"
      />
      <div
        className={cm.cn('absolute inset-0 opacity-15')}
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(167, 139, 250, 0.65) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden="true"
      />

      <div
        className={cm.cn(
          'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-violet-500/25 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn('absolute right-12 top-12 w-20 h-20 rounded-full bg-cyan-400/30 blur-2xl')}
        aria-hidden="true"
      />

      <div
        className={cm.cn(
          'relative z-10 p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center min-h-[420px]',
        )}
      >
        <div className={cm.cn('lg:col-span-7')}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span className={cm.cn('relative flex h-3 w-3')} aria-hidden="true">
              <span
                className={cm.cn(
                  'absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping',
                )}
              />
              <span className={cm.cn('relative inline-flex rounded-full h-3 w-3 bg-cyan-400')} />
            </span>
            <span
              className={cm.cn(
                'text-[11px] font-bold uppercase tracking-widest text-cyan-300 font-mono',
              )}
            >
              {t(
                'pullRequestHero.live',
                { pct: uptimePct.toFixed(2) },
                { defaultValue: 'AI agent online · {{pct}}% uptime' },
              )}
            </span>
          </div>

          <p
            className={cm.cn(
              'text-[11px] font-bold uppercase tracking-widest text-violet-300/90 mt-4 mb-2 font-mono',
            )}
          >
            {t(
              'pullRequestHero.eyebrow',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} · pull request review · v3.2' },
            )}
          </p>
          <h2 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-tight')}>
            {t('pullRequestHero.headline', {}, { defaultValue: 'Code in a new light' })}
          </h2>
          <p className={cm.cn('text-sm md:text-base text-white/85 mt-3 max-w-xl leading-relaxed')}>
            {t(
              'pullRequestHero.subline',
              { count: prCount },
              {
                defaultValue:
                  "{{count}} pull requests reviewed this week. AI catches the bugs you don't want production catching first.",
              },
            )}
          </p>

          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), 'mt-6')}>
            <Link
              to="/repos"
              className={cm.cn(
                'inline-flex items-center gap-2 px-7 py-3 font-semibold text-sm bg-violet-600 text-white rounded-full hover:bg-violet-500 transition-colors shadow-lg shadow-violet-500/30',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                add_link
              </span>
              {t('pullRequestHero.connectRepoCta', {}, { defaultValue: 'Connect repository' })}
            </Link>
            <Link
              to="/history"
              className={cm.cn(
                'inline-flex items-center gap-2 px-7 py-3 font-semibold text-sm rounded-full border border-surface/20 hover:bg-surface/10 transition-colors',
              )}
            >
              {t('pullRequestHero.browseHistoryCta', {}, { defaultValue: 'Browse review history' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>

          <div className={cm.cn(cm.grid({ cols: 4, gap: 'md' }), 'mt-6 max-w-xl')}>
            {stats.map((stat) => (
              <div
                key={stat.key}
                className={cm.cn('bg-surface/10 backdrop-blur-md rounded-xl p-3')}
              >
                <p
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-widest text-white/60 font-mono',
                  )}
                >
                  {stat.label}
                </p>
                <p
                  className={cm.cn(
                    'text-2xl font-extrabold tabular-nums mt-1 font-mono',
                    stat.color,
                  )}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className={cm.cn('lg:col-span-5')}>
          <div
            className={cm.cn(
              'rounded-2xl shadow-2xl shadow-black/40 overflow-hidden border border-surface/10',
            )}
            style={{ backgroundColor: 'var(--color-ink-deep)' }}
          >
            <div className={cm.cn('flex items-center gap-2 px-4 py-2 border-b border-surface/10')}>
              <span className={cm.cn('w-3 h-3 rounded-full bg-red-400/70')} aria-hidden="true" />
              <span className={cm.cn('w-3 h-3 rounded-full bg-amber-400/70')} aria-hidden="true" />
              <span
                className={cm.cn('w-3 h-3 rounded-full bg-emerald-400/70')}
                aria-hidden="true"
              />
              <span className={cm.cn('ml-3 text-[10px] font-mono text-white/50')}>
                {sampleRepo} · {sampleBranch}
              </span>
            </div>
            <div className={cm.cn('p-4 font-mono text-[12px] leading-relaxed space-y-1.5')}>
              <p className={cm.cn('text-white/70')}>@@ -42,6 +42,8 @@ src/auth/oauth.ts</p>
              <p className={cm.cn('text-white/85')}>
                <span className={cm.cn('text-white/60 mr-3 select-none')}>42</span>
                export function rotateToken(user: User) &#123;
              </p>
              <p className={cm.cn('bg-red-500/15 border-l-2 border-red-400 -mx-4 px-4')}>
                <span className={cm.cn('text-red-400 mr-3 select-none')}>43</span>
                <span className={cm.cn('text-red-300')}>- const fresh = sql`SELECT … `</span>
              </p>
              <p className={cm.cn('bg-emerald-500/15 border-l-2 border-emerald-400 -mx-4 px-4')}>
                <span className={cm.cn('text-emerald-400 mr-3 select-none')}>43</span>
                <span className={cm.cn('text-emerald-300')}>
                  + const fresh = await users.rotate(user.id)
                </span>
              </p>
              <p className={cm.cn('text-white/85')}>
                <span className={cm.cn('text-white/60 mr-3 select-none')}>44</span>
                return signJwt(fresh)
              </p>
              <div className={cm.cn('border-t border-surface/10 my-2')} />
              <div className={cm.cn('flex items-start gap-2')}>
                <span
                  className={cm.cn('material-symbols-outlined text-violet-300 text-[14px] mt-0.5')}
                  aria-hidden="true"
                >
                  auto_awesome
                </span>
                <p className={cm.cn('text-violet-200/90')}>
                  {t(
                    'pullRequestHero.aiNote',
                    {},
                    {
                      defaultValue:
                        'AI: parameterised query closes a SQLi vector seen in audit log #2199.',
                    },
                  )}
                </p>
              </div>
              <div className={cm.cn('flex items-center gap-3 text-[11px] mt-2')}>
                <span
                  className={cm.cn(
                    'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold',
                  )}
                >
                  +24
                </span>
                <span className={cm.cn('px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold')}>
                  -18
                </span>
                <span className={cm.cn('ml-auto text-white/60')}>
                  score <span className={cm.cn('text-emerald-300 font-bold')}>9.1</span> / 10
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
