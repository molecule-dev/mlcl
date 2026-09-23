import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface EndpointPlaygroundHeroProps {
  endpointCount: number
  guideCount: number
  sdkCount: number
  uptimePct: number
  /** Optional sample request line for the terminal block (method + path). */
  sampleMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  samplePath?: string
}

const METHOD_TINT: Record<
  NonNullable<EndpointPlaygroundHeroProps['sampleMethod']>,
  { bg: string; text: string }
> = {
  GET: {
    bg: 'color-mix(in srgb, var(--color-method-get) 20%, transparent)',
    text: 'var(--color-method-get)',
  },
  POST: {
    bg: 'color-mix(in srgb, var(--color-method-post) 20%, transparent)',
    text: 'var(--color-method-post)',
  },
  PUT: {
    bg: 'color-mix(in srgb, var(--color-method-put) 20%, transparent)',
    text: 'var(--color-method-put)',
  },
  DELETE: {
    bg: 'color-mix(in srgb, var(--color-method-delete) 20%, transparent)',
    text: 'var(--color-method-delete)',
  },
  PATCH: {
    bg: 'color-mix(in srgb, var(--color-method-patch) 20%, transparent)',
    text: 'var(--color-method-patch)',
  },
}

/**
 * Dark dev-tools hero — terminal-style background with a "Try it" code
 * block, syntax-highlighted method+URL line, faint scanlines / dotted
 * grid overlay. Translated from ai-chatbot-builder's BotAnalyticsKpiRow
 * gradient + lms's WelcomeBanner pattern, recoloured to Prism's deep-slate
 * + emerald-primary palette.
 */
export function EndpointPlaygroundHero({
  endpointCount,
  guideCount,
  sdkCount,
  uptimePct,
  sampleMethod = 'GET',
  samplePath = '/v3/accounts?limit=25',
}: EndpointPlaygroundHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tint = METHOD_TINT[sampleMethod]

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10',
      )}
      style={{ backgroundColor: 'var(--mol-color-secondary)', minHeight: '420px' }}
    >
      {/* Background gradient + dotted grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 35%, color-mix(in srgb, var(--color-method-get) 32%, transparent) 0%, transparent 38%),' +
            'radial-gradient(circle at 75% 65%, color-mix(in srgb, var(--color-method-patch) 28%, transparent) 0%, transparent 35%),' +
            'linear-gradient(135deg, var(--mol-color-secondary) 0%, var(--mol-color-surface) 100%)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            'radial-gradient(circle, color-mix(in srgb, var(--color-method-get) 60%, transparent) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden="true"
      />

      <div
        className={cm.cn(
          'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute right-12 top-12 w-20 h-20 rounded-full bg-violet-500/30 blur-2xl',
        )}
        aria-hidden="true"
      />

      <div
        className={cm.cn(
          'relative z-10 p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center min-h-[420px]',
        )}
      >
        {/* Left: marketing-style headline */}
        <div className={cm.cn('lg:col-span-7')}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span className={cm.cn('relative flex h-3 w-3')} aria-hidden="true">
              <span
                className={cm.cn(
                  'absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping',
                )}
              />
              <span className={cm.cn('relative inline-flex rounded-full h-3 w-3 bg-emerald-400')} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">
              {t(
                'endpointPlaygroundHero.live',
                { pct: uptimePct.toFixed(2) },
                { defaultValue: '{{pct}}% uptime · live' },
              )}
            </span>
          </div>

          <p
            className={cm.cn(
              'text-[11px] font-bold uppercase tracking-widest text-emerald-300/80 mt-4 mb-2 font-mono',
            )}
          >
            {t(
              'endpointPlaygroundHero.eyebrow',
              {},
              { defaultValue: 'API v3.2 · REST · OpenAPI 3.1' },
            )}
          </p>
          <h2 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-tight')}>
            {t(
              'endpointPlaygroundHero.headline',
              {},
              { defaultValue: 'Illuminate every endpoint' },
            )}
          </h2>
          <p className={cm.cn('text-sm md:text-base text-white/85 mt-3 max-w-xl leading-relaxed')}>
            {t(
              'endpointPlaygroundHero.subline',
              { count: endpointCount },
              {
                defaultValue:
                  '{{count}} endpoints. Live try-it console. Bring your bearer token, get a live response in under 100 ms.',
              },
            )}
          </p>

          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), 'mt-6')}>
            <Link
              to="/playground"
              className={cm.cn(
                'inline-flex items-center gap-2 px-7 py-3 font-semibold text-sm bg-emerald-400 text-on-surface rounded-full hover:bg-emerald-300 transition-colors shadow-lg shadow-emerald-500/30',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                play_arrow
              </span>
              {t('endpointPlaygroundHero.openPlayground', {}, { defaultValue: 'Open playground' })}
            </Link>
            <Link
              to="/docs/endpoints"
              className={cm.cn(
                'inline-flex items-center gap-2 px-7 py-3 font-semibold text-sm rounded-full border border-surface/20 hover:bg-surface/10 transition-colors',
              )}
            >
              {t(
                'endpointPlaygroundHero.browseEndpoints',
                {},
                { defaultValue: 'Browse endpoints' },
              )}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>

          <div className={cm.cn(cm.grid({ cols: 4, gap: 'md' }), 'mt-6 max-w-xl')}>
            <div className={cm.cn('bg-surface/10 backdrop-blur-md rounded-xl p-3')}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 font-mono">
                {t('endpointPlaygroundHero.endpoints', {}, { defaultValue: 'Endpoints' })}
              </p>
              <p
                className={cm.cn(
                  'text-2xl font-extrabold tabular-nums mt-1 font-mono text-emerald-300',
                )}
              >
                {endpointCount}
              </p>
            </div>
            <div className={cm.cn('bg-surface/10 backdrop-blur-md rounded-xl p-3')}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 font-mono">
                {t('endpointPlaygroundHero.guides', {}, { defaultValue: 'Guides' })}
              </p>
              <p
                className={cm.cn(
                  'text-2xl font-extrabold tabular-nums mt-1 font-mono text-violet-300',
                )}
              >
                {guideCount}
              </p>
            </div>
            <div className={cm.cn('bg-surface/10 backdrop-blur-md rounded-xl p-3')}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 font-mono">
                {t('endpointPlaygroundHero.sdks', {}, { defaultValue: 'SDKs' })}
              </p>
              <p
                className={cm.cn(
                  'text-2xl font-extrabold tabular-nums mt-1 font-mono text-cyan-300',
                )}
              >
                {sdkCount}
              </p>
            </div>
            <div className={cm.cn('bg-surface/10 backdrop-blur-md rounded-xl p-3')}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 font-mono">
                {t('endpointPlaygroundHero.uptime', {}, { defaultValue: 'Uptime' })}
              </p>
              <p
                className={cm.cn(
                  'text-2xl font-extrabold tabular-nums mt-1 font-mono text-emerald-300',
                )}
              >
                {uptimePct.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Right: terminal-style request/response preview */}
        <div className={cm.cn('lg:col-span-5')}>
          <div
            className={cm.cn(
              'rounded-2xl shadow-2xl shadow-black/40 overflow-hidden border border-surface/10',
            )}
            style={{ backgroundColor: 'var(--mol-color-secondary)' }}
          >
            <div className={cm.cn('flex items-center gap-2 px-4 py-2 border-b border-surface/10')}>
              <span className={cm.cn('w-3 h-3 rounded-full bg-red-400/70')} aria-hidden="true" />
              <span className={cm.cn('w-3 h-3 rounded-full bg-amber-400/70')} aria-hidden="true" />
              <span
                className={cm.cn('w-3 h-3 rounded-full bg-emerald-400/70')}
                aria-hidden="true"
              />
              <span className={cm.cn('ml-3 text-[10px] font-mono text-white/50')}>
                curl · live test
              </span>
            </div>
            <div className={cm.cn('p-4 font-mono text-[12px] leading-relaxed space-y-2')}>
              <div className={cm.cn('flex items-center gap-2')}>
                <span
                  className={cm.cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-widest',
                  )}
                  style={{ backgroundColor: tint.bg, color: tint.text }}
                >
                  {sampleMethod}
                </span>
                <span className="text-white/90">{samplePath}</span>
              </div>
              <p className="text-white/70">
                $ Authorization: <span className="text-emerald-300">Bearer prsm_•••••</span>
              </p>
              <div className={cm.cn('border-t border-surface/10 my-2')} />
              <p className="text-emerald-300">
                200 OK <span className={cm.cn('text-white/70 ml-2')}>· 47ms · 2.3KB</span>
              </p>
              <pre className="text-white/85 [overflow-wrap:anywhere] whitespace-pre-wrap">
                {`{
  "data": [
    {
      "id": "acc_8w2j",
      "type": "checking",
      "currency": "USD",
      "balance_cents": 142090,
      "status": "active"
    }
  ],
  "next_cursor": "Y3Jzcj0xMA"
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
