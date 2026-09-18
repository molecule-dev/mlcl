import { useEffect, useMemo, useState } from 'react'

import { unwrapList } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SampleTable } from '../components/SampleTable.js'

interface Sample {
  id: string
  name: string
  pack: string
  bpm: number
  key: string
  duration_seconds: number
  category: string
  cover_index: number
  is_loop?: boolean
}

const CATEGORIES = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'drums', defaultLabel: 'Drums' },
  { key: 'bass', defaultLabel: 'Bass' },
  { key: 'synth', defaultLabel: 'Synths' },
  { key: 'vocal', defaultLabel: 'Vocals' },
  { key: 'fx', defaultLabel: 'FX' },
] as const

type CategoryKey = (typeof CATEGORIES)[number]['key']

export function Samples() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [samples, setSamples] = useState<Sample[]>([])
  const [category, setCategory] = useState<CategoryKey>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<unknown>('/api/samples')
      .then((res) => {
        if (cancelled) return
        setSamples(unwrapList<Sample>(res.data))
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('samples.loadError', {}, { defaultValue: 'Failed to load sample library.' }))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    return samples.filter((s) => {
      if (category !== 'all' && s.category !== category) return false
      if (
        search.trim() &&
        !`${s.name} ${s.pack}`.toLowerCase().includes(search.trim().toLowerCase())
      )
        return false
      return true
    })
  }, [samples, category, search])

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 8), 'space-y-8')}>
      <header className={cm.cn('flex items-end justify-between gap-4 flex-wrap')}>
        <div>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('nav.library', {}, { defaultValue: 'Library' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight mt-1')}>
            {t('samples.title', {}, { defaultValue: 'Samples & loops' })}
          </h1>
          <p className={cm.cn('text-sm text-on-surface-variant mt-2')}>
            {t(
              'samples.subtitle',
              { count: samples.length },
              { defaultValue: '{{count}} royalty-free assets · drag straight onto a track' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            'flex items-center gap-2 px-3 py-2 rounded-full bg-surface-container-lowest border border-outline-variant min-w-[260px]',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-on-surface-variant')}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'samples.searchPlaceholder',
              {},
              { defaultValue: 'Search by name, pack, or key' },
            )}
            className={cm.cn(
              'flex-1 bg-transparent border-0 outline-none text-sm text-on-surface placeholder:text-on-surface-variant',
            )}
          />
        </div>
      </header>

      <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={cm.cn(
              'px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-colors',
              category === c.key
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
            )}
          >
            {t(`samples.category.${c.key}`, {}, { defaultValue: c.defaultLabel })}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className={cm.cn(
            'text-sm text-on-error-container bg-error-container px-3 py-2 rounded-lg',
          )}
        >
          {error}
        </p>
      )}
      {loading ? (
        <p className={cm.cn('text-sm', cm.textMuted)}>
          {t('samples.loading', {}, { defaultValue: 'Loading library…' })}
        </p>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(
            'rounded-2xl border border-dashed border-outline-variant px-6 py-12 text-center',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant')}
            aria-hidden="true"
          >
            queue_music
          </span>
          <p className={cm.cn('text-sm font-semibold text-on-surface-variant mt-3')}>
            {t('samples.empty', {}, { defaultValue: 'No samples match your filter.' })}
          </p>
        </div>
      ) : (
        <>
          {/* The table rows are real links (keyboard + SR reachable); the old
              delegated click handler only mirrored the navigation the links
              already perform, so it was removed rather than given a fake role. */}
          <SampleTable samples={visible} />
        </>
      )}
    </div>
  )
}
