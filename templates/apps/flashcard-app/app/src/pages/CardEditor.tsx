import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface Card {
  id?: string
  deck_id: string
  front: string
  back: string
  tags: string[]
}

export function CardEditor({ mode }: { mode: 'new' | 'edit' }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { deckId = '', cardId = '' } = useParams<{ deckId: string; cardId?: string }>()
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'edit' || !cardId) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/cards/${cardId}`)
      .then((res) => {
        if (cancelled) return
        const card = unwrapSingle<Card>(res)
        if (card) {
          setFront(card.front)
          setBack(card.back)
          setTagsInput(card.tags.join(', '))
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('cardEditor.loadError', {}, { defaultValue: 'Failed to load card.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, mode, cardId, t])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload: Card = {
      deck_id: deckId,
      front: front.trim(),
      back: back.trim(),
      tags: tagsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    try {
      if (mode === 'new') await http.post('/api/cards', payload)
      else await http.put(`/api/cards/${cardId}`, payload)
      navigate(`/decks/${deckId}`)
    } catch (_error) {
      setError(t('cardEditor.saveError', {}, { defaultValue: 'Failed to save.' }))
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (
      !window.confirm(
        t('cards.confirmDelete', {}, { defaultValue: 'Delete this card? This cannot be undone.' }),
      )
    ) {
      return
    }
    setDeleting(true)
    setError(null)
    try {
      await http.delete(`/api/cards/${cardId}`)
      navigate(`/decks/${deckId}`)
    } catch (_error) {
      setError(t('cardEditor.deleteError', {}, { defaultValue: 'Failed to delete card.' }))
      setDeleting(false)
    }
  }

  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to={`/decks/${deckId}`}
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
      >
        ← {t('cardEditor.backLink', {}, { defaultValue: 'Back to deck' })}
      </Link>

      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {mode === 'new'
            ? t('cardEditor.newHeading', {}, { defaultValue: 'New card' })
            : t('cardEditor.editHeading', {}, { defaultValue: 'Edit card' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'cardEditor.subheading',
            {},
            { defaultValue: 'Markdown supported. Use {{cloze::word}} to create cloze deletions.' },
          )}
        </p>
      </header>

      <form onSubmit={submit} className={cm.cn('space-y-4')}>
        <div className="block">
          <label
            htmlFor="card-editor-front"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('cardEditor.frontLabel', {}, { defaultValue: 'Front' })}
          </label>
          <textarea
            id="card-editor-front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            rows={4}
            required
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
            style={{ fontFamily: 'var(--mol-font-serif)' }}
          />
        </div>

        <div className="block">
          <label
            htmlFor="card-editor-back"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('common.back', {}, { defaultValue: 'Back' })}
          </label>
          <textarea
            id="card-editor-back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            rows={4}
            required
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
            style={{ fontFamily: 'var(--mol-font-serif)' }}
          />
        </div>

        <div className="block">
          <label
            htmlFor="card-editor-tags"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('cardEditor.tagsLabel', {}, { defaultValue: 'Tags (comma-separated)' })}
          </label>
          <input
            id="card-editor-tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
          />
        </div>

        {/* Live preview */}
        <section>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
              'uppercase tracking-wider',
              cm.sp('mb', 2),
            )}
          >
            {t('cardEditor.previewHeading', {}, { defaultValue: 'Preview' })}
          </h2>
          <div className={cm.grid({ cols: 2, gap: 'md' })}>
            <PreviewSide
              title={t('cardEditor.frontLabel', {}, { defaultValue: 'Front' })}
              content={
                front || t('cardEditor.frontPlaceholder', {}, { defaultValue: 'Front of card' })
              }
              background="var(--color-card-front)"
            />
            <PreviewSide
              title={t('common.back', {}, { defaultValue: 'Back' })}
              content={
                back || t('cardEditor.backPlaceholder', {}, { defaultValue: 'Back of card' })
              }
              background="var(--color-card-back)"
            />
          </div>
        </section>

        {error && <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>}

        <div className={cm.flex({ align: 'center', gap: 'sm', justify: 'end' })}>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting || saving}
              data-mol-id="card-delete"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'mr-auto border border-error/40 text-error rounded-md hover:bg-error-container/30 disabled:opacity-50',
              )}
            >
              {deleting
                ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                : t('cards.delete', {}, { defaultValue: 'Delete card' })}
            </button>
          )}
          <Link
            to={`/decks/${deckId}`}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'border border-outline-variant rounded-md',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : mode === 'new'
                ? t('cardEditor.createLabel', {}, { defaultValue: 'Create card' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
          </button>
        </div>
      </form>
    </div>
  )
}

function PreviewSide({
  title,
  content,
  background,
}: {
  title: string
  content: string
  background: string
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.card(), cm.sp('p', 5))}
      style={{ backgroundColor: background, minHeight: '160px' }}
    >
      <p
        className={cm.cn(
          cm.textSize('xs'),
          'text-on-surface-variant',
          'uppercase tracking-wider',
          cm.sp('mb', 3),
        )}
      >
        {title}
      </p>
      <p
        className={cm.cn(cm.textSize('lg'))}
        style={{ fontFamily: 'var(--mol-font-serif)', whiteSpace: 'pre-wrap' }}
      >
        {content}
      </p>
    </div>
  )
}
