import { useCallback, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { SearchAutocomplete, type SuggestionItem } from '@molecule/app-search-autocomplete-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Hit = { id: string; title: string; excerpt?: string }

export function SearchPage({ index }: { index: string }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Hit[]>([])

  // Every keystroke fires its own request; only the NEWEST may write the state
  // the list below renders. Without this ticket a slow response for "ca" lands
  // after "cat"'s and the list shows results for a query the input no longer
  // holds (the "No matches for {{query}}" line then contradicts them).
  const searchSeq = useRef(0)

  // `SearchAutocomplete` runs its debounced search from an effect whose deps
  // include `onSearch` ITSELF (`[value, onSearch, debounceMs, minChars]`), so
  // this handler must keep ONE identity across renders. Handed a fresh closure
  // each render — which is what an inline function is — every response
  // (`setHits` with a new array) re-rendered the page, re-armed that effect and
  // scheduled the SAME search again: typing one character fetched
  // `/api/search` roughly every debounce interval, forever, until the field was
  // cleared. `useCallback` keys it on the only real input, the `index` prop.
  const handleSearch = useCallback(
    async (q: string): Promise<SuggestionItem<Hit>[]> => {
      if (!q.trim()) return []
      const ticket = ++searchSeq.current
      const res = await fetch(
        `/api/search?index=${encodeURIComponent(index)}&q=${encodeURIComponent(q)}`,
      )
      // An error body ({ error }) carries no `hits` — never let it stand in for
      // results. Coerce the shape so a non-array `hits` cannot reach `hits.map`.
      const payload = (res.ok ? await res.json() : null) as { hits?: unknown } | null
      const results: Hit[] = Array.isArray(payload?.hits) ? (payload.hits as Hit[]) : []
      if (ticket === searchSeq.current) setHits(results)
      return results.map((h) => ({
        id: h.id,
        label: h.title,
        meta: h.excerpt,
        data: h,
      }))
    },
    [index],
  )

  function handleSelect(item: SuggestionItem<Hit>): void {
    // Navigate to the selected item's detail page.
    // Replace with your router's navigate() call as needed.
    window.location.href = `/${index}/${item.id}`
  }

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.maxW('lg'))}
      style={cm.sp({ p: 4 })}
    >
      <SearchAutocomplete
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        onSelect={handleSelect}
        placeholder={t('search.placeholder', undefined, { defaultValue: 'Search…' })}
        debounceMs={150}
      />
      {!query.trim() ? (
        <p className={cm.textMuted}>
          {t('search.emptyPrompt', undefined, { defaultValue: 'Start typing to search.' })}
        </p>
      ) : hits.length === 0 ? (
        <p className={cm.textMuted}>
          {t('search.noResults', { query }, { defaultValue: 'No matches for "{{query}}"' })}
        </p>
      ) : (
        <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
          {hits.map((h) => (
            <li key={h.id} className={cm.card({})}>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{h.title}</h3>
              {h.excerpt ? <p className={cm.textMuted}>{h.excerpt}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
