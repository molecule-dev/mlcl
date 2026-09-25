import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import type { CompanyProfile } from '../components/CompanyProfileCard.js'
import { CompanyProfileCard } from '../components/CompanyProfileCard.js'
import { unwrapList } from '../lib/unwrap.js'

export function Companies() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [companies, setCompanies] = useState<CompanyProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [query, setQuery] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    http
      .get('/api/companies?limit=50')
      .then((res) => {
        if (cancelled) return
        setCompanies(unwrapList<CompanyProfile>(res))
      })
      .catch(() => {
        if (!cancelled) {
          setCompanies([])
          setLoadError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, reloadKey])

  const filtered = companies.filter((c) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.location ?? '').toLowerCase().includes(q) ||
      (c.industry ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header
        className={cm.flex({
          align: 'end',
          justify: 'between',
          wrap: 'wrap',
          gap: 'md',
        })}
      >
        <div>
          <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
            {t('companies.eyebrow', {}, { defaultValue: 'Featured employers' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t(
              'companies.heading',
              { app: APP_NAME },
              { defaultValue: 'Companies hiring on {{app}}' },
            )}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'companies.subheading',
              {},
              {
                defaultValue: 'Browse company profiles \u2014 culture, benefits, every open role.',
              },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            'w-full min-w-0 rounded-full border border-outline-variant/30 bg-surface-container-lowest md:w-auto',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-[18px] text-on-surface-variant')}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'companies.searchPlaceholder',
              {},
              { defaultValue: 'Search by name, industry, location' },
            )}
            className={cm.cn(
              'w-full min-w-0 bg-transparent outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant md:w-72',
            )}
            aria-label={t(
              'companies.searchPlaceholder',
              {},
              { defaultValue: 'Search by name, industry, location' },
            )}
          />
        </div>
      </header>

      {loading ? (
        <p
          className={cm.cn(
            cm.sp('py', 12),
            cm.textCenter,
            cm.textSize('sm'),
            'text-on-surface-variant',
          )}
        >
          {t('companies.loading', {}, { defaultValue: 'Loading\u2026' })}
        </p>
      ) : loadError ? (
        <LoadErrorBanner
          message={t(
            'companies.loadError',
            {},
            { defaultValue: 'Companies could not be loaded \u2014 check your connection.' },
          )}
          onRetry={() => {
            setReloadKey((k) => k + 1)
          }}
        />
      ) : filtered.length === 0 ? (
        <p
          className={cm.cn(
            cm.sp('py', 12),
            cm.textCenter,
            cm.textSize('sm'),
            'rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/30 text-on-surface-variant',
          )}
        >
          {t(
            'companies.empty',
            {},
            {
              defaultValue: 'No companies match your search \u2014 try a different term.',
            },
          )}
        </p>
      ) : (
        <div className={cm.grid({ cols: 3, gap: 'md' })}>
          {filtered.map((c) => (
            <CompanyProfileCard key={c.id} company={c} />
          ))}
        </div>
      )}
    </div>
  )
}
