import { useCallback, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { SearchAutocomplete, type SuggestionItem } from '@molecule/app-search-autocomplete-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Hit = { id: string; title: string; excerpt?: string }

/**
 * The answer the page holds for ONE query — the query it answers, the hits, and
 * whether the search FAILED.
 *
 * The input changes and the request's debounce runs before any response can
 * arrive, so "no hits in state yet" is not "this query matched nothing": the
 * results list started empty, and rendering its empty state until a response
 * landed answered "No matches for …" for every query the moment it was typed
 * (and again for a search that failed, whose body carries no `hits`). Keeping
 * the query alongside the hits is what lets the render below tell the three
 * apart: pending, answered-empty, and failed.
 */
type SearchState = { query: string; hits: Hit[]; failed: boolean }

export function SearchPage({ index }: { index: string }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState | null>(null)

  // Every keystroke fires its own request; only the NEWEST may write the state
  // the list below renders. Without this ticket a slow response for "ca" lands
  // after "cat"'s and the list shows results for a query the input no longer
  // holds (the "No matches for {{query}}" line then contradicts them).
  const searchSeq = useRef(0)

  // `SearchAutocomplete` runs its debounced search from an effect whose deps
  // include `onSearch` ITSELF (`[value, onSearch, debounceMs, minChars]`), so
  // this handler must keep ONE identity across renders. Handed a fresh closure
  // each render — which is what an inline function is — every response
  // (`setResults` with a new array) re-rendered the page, re-armed that effect and
  // scheduled the SAME search again: typing one character fetched
  // `/api/search` roughly every debounce interval, forever, until the field was
  // cleared. `useCallback` keys it on the only real input, the `index` prop.
  const handleSearch = useCallback(
    async (q: string): Promise<SuggestionItem<Hit>[]> => {
      const trimmed = q.trim()
      // The shared component does not call `onSearch` for an empty value (its
      // effect returns early below `minChars`), so there is nothing to ask and
      // nothing to invalidate here — the state the render compares against the
      // input is what keeps a previous query's answer from standing in for the
      // current one.
      if (!trimmed) return []
      const ticket = ++searchSeq.current
      // What this request answers, assigned on BOTH paths (a rejected fetch is an
      // answer too — a failed one).
      let answer: { hits: Hit[]; failed: boolean }
      try {
        const res = await fetch(
          `/api/search?index=${encodeURIComponent(index)}&q=${encodeURIComponent(q)}`,
        )
        // An error body ({ error }) carries no `hits` — never let it stand in for
        // results. A non-2xx is a FAILED search, not "no matches": coercing its
        // missing `hits` to an empty list told the reader the query matched
        // nothing. Coerce the success shape too, so a non-array `hits` cannot
        // reach `hits.map`.
        const payload = (res.ok ? await res.json() : null) as { hits?: unknown } | null
        answer = {
          hits: Array.isArray(payload?.hits) ? (payload.hits as Hit[]) : [],
          failed: !res.ok,
        }
      } catch (_error) {
        // A rejected fetch (offline) is a failure the reader must see rather than
        // an empty result set. The shared component catches a rejection at its
        // own call site, which would leave the page showing what it showed
        // before, so the failure is recorded here instead.
        answer = { hits: [], failed: true }
      }
      if (ticket === searchSeq.current) setState({ query: trimmed, ...answer })
      return answer.hits.map((h) => ({
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

  const trimmedQuery = query.trim()
  // The hits that answer what the input currently holds, or null while the
  // answer is still pending (no response yet, or one for a previous query).
  const answered = state !== null && state.query === trimmedQuery ? state : null

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
      {!trimmedQuery ? (
        <p className={cm.textMuted}>
          {t('search.emptyPrompt', undefined, { defaultValue: 'Start typing to search.' })}
        </p>
      ) : answered === null ? (
        <p className={cm.textMuted}>
          {t('search.searching', undefined, { defaultValue: 'Searching…' })}
        </p>
      ) : answered.failed ? (
        <p className={cm.textError}>
          {t('search.failed', undefined, { defaultValue: 'Search failed — try again.' })}
        </p>
      ) : answered.hits.length === 0 ? (
        <p className={cm.textMuted}>
          {t(
            'search.noResults',
            { query: trimmedQuery },
            { defaultValue: 'No matches for "{{query}}"' },
          )}
        </p>
      ) : (
        <ul className={cm.flex({ direction: 'col', gap: 'sm' })}>
          {answered.hits.map((h) => (
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
