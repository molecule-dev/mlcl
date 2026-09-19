import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BookCover } from '../components/BookCover.js'

const GENRE_OPTIONS = [
  'fiction',
  'nonfiction',
  'sci-fi',
  'fantasy',
  'mystery',
  'history',
  'biography',
  'science',
  'poetry',
  'classics',
  'mythology',
  'nature',
] as const

const SHELF_OPTIONS = [
  { id: 'want_to_read', label: 'Want to read' },
  { id: 'reading', label: 'Reading' },
  { id: 'read', label: 'Read' },
] as const

export function AddBook() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [pageCount, setPageCount] = useState('300')
  const [coverStyle, setCoverStyle] = useState<string>('teal')
  const [genres, setGenres] = useState<string[]>([])
  const [shelf, setShelf] = useState<(typeof SHELF_OPTIONS)[number]['id']>('want_to_read')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleGenre = (g: string) => {
    setGenres((curr) => (curr.includes(g) ? curr.filter((x) => x !== g) : [...curr, g]))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !author.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const resp = await http.post('/api/books', {
        title: title.trim(),
        author: author.trim(),
        page_count: Math.max(1, Number(pageCount) || 300),
        genres,
        cover_style: coverStyle,
        description: description.trim() || undefined,
        shelf,
      })
      const created =
        (resp && (resp as { data?: { id?: string } }).data) ?? (resp as { id?: string })
      const id = (created as { id?: string })?.id
      navigate(id ? `/books/${id}` : '/books')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('addBook.eyebrow', {}, { defaultValue: 'Grow the library' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {t('addBook.heading', {}, { defaultValue: 'Add a book' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'addBook.subheading',
            {},
            { defaultValue: 'Enter it by hand, pick a cover, shelve it. Two minutes.' },
          )}
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className={cm.cn(
          'bg-surface-container-lowest rounded-2xl shadow-sm border-t-4 border-primary',
          cm.sp('p', 8),
          'space-y-7',
        )}
      >
        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('books.title', {}, { defaultValue: 'Title' })}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t(
              'addBook.titlePlaceholder',
              {},
              { defaultValue: 'e.g. The Left Hand of Darkness' },
            )}
            data-mol-id="add-book-title"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.sp('mt', 2),
              'w-full text-lg font-semibold text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors',
            )}
          />
        </div>

        <div className={cm.grid({ cols: 2, gap: 'md' })}>
          <div>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('books.author', {}, { defaultValue: 'Author' })}
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={t(
                'addBook.authorPlaceholder',
                {},
                { defaultValue: 'e.g. Ursula K. Le Guin' },
              )}
              data-mol-id="add-book-author"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.sp('mt', 2),
                'w-full text-base text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors',
              )}
            />
          </div>
          <div>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('books.pageCount', {}, { defaultValue: 'Page count' })}
            </label>
            <input
              type="number"
              min={1}
              max={20000}
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
              data-mol-id="add-book-pages"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.sp('mt', 2),
                'w-full text-base text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors',
              )}
            />
          </div>
        </div>

        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('addBook.coverLabel', {}, { defaultValue: 'Cover' })}
          </label>
          <div className={cm.cn(cm.sp('mt', 3), cm.flex({ align: 'start', gap: 'lg' }))}>
            <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap flex-1')}>
              {(
                ['teal', 'amber', 'wine', 'indigo', 'forest', 'slate', 'plum', 'clay'] as const
              ).map((style) => {
                const active = coverStyle === style
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setCoverStyle(style)}
                    aria-label={t(
                      'addBook.coverSwatch',
                      { style },
                      { defaultValue: 'Cover style {{style}}' },
                    )}
                    aria-pressed={active}
                    className={cm.cn(
                      'w-9 h-12 rounded-r-md rounded-l-sm transition-transform hover:scale-110',
                    )}
                    style={{
                      background: `var(--color-cover-${style})`,
                      boxShadow: active
                        ? `0 0 0 3px var(--color-surface), 0 0 0 5px var(--color-cover-${style})`
                        : 'none',
                    }}
                  />
                )
              })}
            </div>
            <BookCover
              title={title || t('addBook.previewTitle', {}, { defaultValue: 'Untitled' })}
              author={author || '—'}
              coverStyle={coverStyle}
              size="md"
            />
          </div>
        </div>

        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('addBook.genresLabel', {}, { defaultValue: 'Genres' })}
          </label>
          <div className={cm.cn(cm.sp('mt', 3), cm.flex({ gap: 'sm' }), 'flex-wrap')}>
            {GENRE_OPTIONS.map((g) => {
              const active = genres.includes(g)
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  aria-pressed={active}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'rounded-full transition-all',
                    active
                      ? 'bg-primary text-on-primary shadow-md'
                      : 'border border-outline-variant hover:border-primary text-on-surface',
                  )}
                >
                  {t(`genre.${g}`, {}, { defaultValue: g })}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('addBook.shelfLabel', {}, { defaultValue: 'Shelve as' })}
          </label>
          <div className={cm.cn(cm.sp('mt', 3), cm.flex({ gap: 'sm' }), 'flex-wrap')}>
            {SHELF_OPTIONS.map((s) => {
              const active = shelf === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setShelf(s.id)}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    'rounded-full text-sm font-bold transition-all',
                    active
                      ? 'text-on-primary shadow-md'
                      : 'border border-outline-variant hover:border-primary text-on-surface',
                  )}
                  style={
                    active
                      ? {
                          background:
                            'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
                        }
                      : undefined
                  }
                >
                  {t(`shelf.${s.id}`, {}, { defaultValue: s.label })}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.description', {}, { defaultValue: 'Description' })}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t(
              'addBook.descriptionPlaceholder',
              {},
              { defaultValue: 'One line about why it is on your list.' },
            )}
            rows={3}
            data-mol-id="add-book-description"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.sp('mt', 2),
              'w-full text-base text-on-surface bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors resize-none',
            )}
          />
        </div>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('pt', 2),
          )}
        >
          <button
            type="button"
            onClick={() => navigate('/books')}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-full border-2 border-outline-variant hover:border-primary text-on-surface',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !author.trim()}
            data-mol-id="add-book-submit"
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'inline-flex items-center gap-2 rounded-full text-on-primary shadow-md hover:shadow-lg transition-shadow disabled:opacity-50',
            )}
            style={{
              background:
                'linear-gradient(90deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
            }}
          >
            {submitting
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('addBook.createButton', {}, { defaultValue: 'Add book' })}
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        {error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error', cm.sp('mt', 2))}>{error}</p>
        ) : null}
      </form>
    </div>
  )
}
