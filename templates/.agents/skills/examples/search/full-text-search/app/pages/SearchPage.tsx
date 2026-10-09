import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { SearchAutocomplete, type SuggestionItem } from '@molecule/app-search-autocomplete-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Hit = { id: string; title: string; excerpt?: string }

export function SearchPage({ index }: { index: string }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Hit[]>([])

  async function handleSearch(q: string): Promise<SuggestionItem<Hit>[]> {
    if (!q.trim()) return []
    const res = await fetch(
      `/api/search?index=${encodeURIComponent(index)}&q=${encodeURIComponent(q)}`,
    )
    const payload = await res.json()
    const results: Hit[] = payload.hits ?? []
    setHits(results)
    return results.map((h) => ({
      id: h.id,
      label: h.title,
      meta: h.excerpt,
      data: h,
    }))
  }

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
