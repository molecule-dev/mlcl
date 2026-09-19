import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BookCover } from '../components/BookCover.js'
import { Stars } from '../components/ReviewCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface MyShelf {
  id: string
  shelf: 'want_to_read' | 'reading' | 'read' | 'dnf'
  current_page: number
  rating: number | null
  percent: number
}

interface Book {
  id: string
  title: string
  author: string
  page_count: number
  genres: string[]
  cover_style: string
  my: MyShelf | null
}

const SHELVES = ['all', 'reading', 'want_to_read', 'read', 'dnf'] as const
type ShelfFilter = (typeof SHELVES)[number]

const SHELF_LABEL: Record<ShelfFilter, string> = {
  all: 'All',
  reading: 'Reading',
  want_to_read: 'Want to read',
  read: 'Read',
  dnf: 'Did not finish',
}

const SHELF_TONE: Record<Exclude<ShelfFilter, 'all'>, string> = {
  reading: 'bg-primary-container text-on-primary-container',
  read: 'bg-success-container text-on-success-container',
  want_to_read: 'bg-secondary-container text-on-secondary-container',
  dnf: 'bg-error-container text-on-error-container',
}

export function Books() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shelf, setShelf] = useState<ShelfFilter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/books')
      .then((res) => {
        if (!cancelled) setBooks(unwrapList<Book>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('books.loadError', {}, { defaultValue: 'Failed to load books.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return books.filter((b) => {
      if (shelf !== 'all' && b.my?.shelf !== shelf) return false
      if (needle) {
        const hay = `${b.title} ${b.author}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [books, shelf, search])

  const genreOptions = useMemo(() => {
    const set = new Set<string>()
    for (const b of books) for (const g of b.genres) set.add(g)
    return Array.from(set).sort()
  }, [books])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('books.heading', {}, { defaultValue: 'Your shelves' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'books.subheading',
              { count: books.length },
              { defaultValue: '{{count}} books tracked' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/books/new')}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
          aria-label={t('books.addAria', {}, { defaultValue: 'Add a new book' })}
          data-mol-id="books-add-new"
        >
          + {t('books.addLabel', {}, { defaultValue: 'Add book' })}
        </button>
      </header>

      <div className={cm.flex({ gap: 'sm', align: 'center' })}>
        <div className={cm.cn(cm.flex1, 'relative')}>
          <span
            className={cm.cn(
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant',
            )}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'books.searchPlaceholder',
              {},
              { defaultValue: 'Search title or author' },
            )}
            aria-label={t('books.searchAria', {}, { defaultValue: 'Search books' })}
            data-mol-id="books-search"
            className={cm.cn(
              cm.sp('px', 10),
              cm.sp('py', 2),
              'w-full bg-surface-container-lowest border border-outline-variant rounded-full text-on-surface focus:border-primary focus:outline-none transition-colors',
            )}
          />
        </div>
      </div>

      <nav
        aria-label={t('books.filterLabel', {}, { defaultValue: 'Filter books by shelf' })}
        className={cm.flex({ gap: 'xs', align: 'center' })}
      >
        {SHELVES.map((s) => {
          const active = shelf === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setShelf(s)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'rounded-full',
                active
                  ? 'bg-primary text-on-primary'
                  : cm.cn('bg-surface border border-outline-variant', 'text-on-surface-variant'),
              )}
              aria-pressed={active}
            >
              {t(`shelf.${s}`, {}, { defaultValue: SHELF_LABEL[s] })}
            </button>
          )
        })}
        {genreOptions.length > 0 ? (
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant ml-auto')}>
            {t(
              'books.genreCount',
              { count: genreOptions.length },
              { defaultValue: '{{count}} genres' },
            )}
          </span>
        ) : null}
      </nav>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('books.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {shelf === 'all' && !search
            ? t('books.empty', {}, { defaultValue: 'No books yet. Add one to start your library.' })
            : t(
                'books.emptyFiltered',
                {},
                { defaultValue: 'No books match this shelf or search.' },
              )}
        </p>
      ) : (
        <ul className={cm.grid({ cols: 4, gap: 'md' })}>
          {visible.map((b) => (
            <li key={b.id}>
              <Link
                to={`/books/${b.id}`}
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 5),
                  'block hover:bg-surface-container space-y-3 h-full',
                )}
              >
                <div className={cm.flex({ align: 'start', justify: 'between', gap: 'md' })}>
                  <BookCover
                    title={b.title}
                    author={b.author}
                    coverStyle={b.cover_style}
                    size="md"
                  />
                  <div className={cm.cn(cm.flex1, 'min-w-0')}>
                    <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                      {b.title}
                    </h3>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant truncate',
                      )}
                    >
                      {b.author}
                    </p>
                    {b.my ? (
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          'inline-block mt-2',
                          cm.textSize('xs'),
                          'rounded-full',
                          SHELF_TONE[b.my.shelf],
                        )}
                      >
                        {t(
                          `shelf.${b.my.shelf}`,
                          {},
                          {
                            defaultValue: SHELF_LABEL[b.my.shelf],
                          },
                        )}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                    {b.my?.rating != null ? <Stars rating={b.my.rating} /> : null}
                  </div>
                  {b.my && b.my.shelf === 'reading' ? (
                    <span
                      className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      {b.my.percent}%
                    </span>
                  ) : (
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t('books.pages', { count: b.page_count }, { defaultValue: '{{count}} pp' })}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
