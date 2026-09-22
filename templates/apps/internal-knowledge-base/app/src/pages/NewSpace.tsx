import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface CreatedSpace {
  id: string
  key: string
}

const ICON_OPTIONS: { key: string; label: string }[] = [
  { key: 'engineering', label: 'Engineering' },
  { key: 'group', label: 'People' },
  { key: 'lightbulb', label: 'Product' },
  { key: 'shield', label: 'Security' },
  { key: 'palette', label: 'Design' },
  { key: 'support_agent', label: 'Support' },
  { key: 'menu_book', label: 'Library' },
  { key: 'campaign', label: 'Marketing' },
]

const COLOR_OPTIONS = [
  '#0f766e',
  '#d97706',
  '#7c3aed',
  '#b91c1c',
  '#16a34a',
  '#0d9488',
  '#2563eb',
  '#db2777',
]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export function NewSpace() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [keyTouched, setKeyTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState<string>(ICON_OPTIONS[0].key)
  const [color, setColor] = useState<string>(COLOR_OPTIONS[0])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function handleNameChange(value: string) {
    setName(value)
    if (!keyTouched) setKey(slugify(value))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !key.trim()) {
      setError(t('newSpace.required', {}, { defaultValue: 'Name and key are required.' }))
      return
    }
    setSaving(true)
    try {
      const res = await http.post('/spaces', {
        key,
        name,
        description,
        icon,
        color,
      })
      const space = unwrapSingle<CreatedSpace>(res)
      const target = space?.key ?? key
      void track({
        name: 'space.created',
        properties: { space_id: space?.id, space_key: target },
      })
      navigate(`/spaces/${target}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('newSpace.createFailed', {}, { defaultValue: 'Could not create space' }),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'mx-auto w-full max-w-2xl space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('extrabold'),
            'uppercase tracking-widest text-secondary',
          )}
        >
          {t('newSpace.eyebrow', {}, { defaultValue: 'Open a knowledge space' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 1),
            cm.textSize('3xl'),
            cm.fontWeight('extrabold'),
            'tracking-tight',
          )}
        >
          {t('newSpace.heading', {}, { defaultValue: 'New space' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'newSpace.subtitle',
            {},
            {
              defaultValue:
                'Spaces group articles for a team or topic. Pick a name and an icon — you can change them later.',
            },
          )}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant space-y-5',
        )}
      >
        <div>
          <label
            htmlFor="space-name"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-on-surface-variant block',
            )}
          >
            {t('form.name', {}, { defaultValue: 'Name' })}
          </label>
          <input
            id="space-name"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t('newSpace.namePlaceholder', {}, { defaultValue: 'Engineering' })}
            required
            className={cm.cn(
              cm.sp('mt', 2),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.w('full'),
              'rounded-xl border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary',
            )}
          />
        </div>

        <div>
          <label
            htmlFor="space-key"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-on-surface-variant block',
            )}
          >
            {t('newSpace.keyLabel', {}, { defaultValue: 'URL key' })}
          </label>
          <input
            id="space-key"
            type="text"
            value={key}
            onChange={(e) => {
              setKey(slugify(e.target.value))
              setKeyTouched(true)
            }}
            placeholder={t('newSpace.keyPlaceholder', {}, { defaultValue: 'engineering' })}
            required
            className={cm.cn(
              cm.sp('mt', 2),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.w('full'),
              'rounded-xl border border-outline bg-surface font-mono text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary',
            )}
          />
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'newSpace.keyHint',
              { key: key || 'engineering' },
              {
                defaultValue:
                  'Lives at /spaces/{{key}} — lowercase letters, numbers, and dashes only.',
              },
            )}
          </p>
        </div>

        <div>
          <label
            htmlFor="space-description"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-on-surface-variant block',
            )}
          >
            {t('form.description', {}, { defaultValue: 'Description' })}
          </label>
          <textarea
            id="space-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t(
              'newSpace.descriptionPlaceholder',
              {},
              { defaultValue: 'Runbooks, on-call playbooks, postmortems\u2026' },
            )}
            rows={3}
            className={cm.cn(
              cm.sp('mt', 2),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.w('full'),
              'rounded-xl border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary',
            )}
          />
        </div>

        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('newSpace.iconLabel', {}, { defaultValue: 'Icon' })}
          </p>
          <div className={cm.cn(cm.sp('mt', 2), cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
            {ICON_OPTIONS.map((opt) => {
              const active = icon === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setIcon(opt.key)}
                  aria-pressed={active}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'rounded-full border transition-colors',
                    active
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-outline bg-surface text-on-surface hover:bg-surface-container',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    aria-hidden="true"
                    style={{ fontSize: '1rem' }}
                  >
                    {opt.key}
                  </span>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('newSpace.colorLabel', {}, { defaultValue: 'Accent colour' })}
          </p>
          <div className={cm.cn(cm.sp('mt', 2), cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
            {COLOR_OPTIONS.map((c) => {
              const active = color === c
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={t(
                    'newSpace.colorAria',
                    { color: c },
                    { defaultValue: 'Pick colour {{color}}' },
                  )}
                  aria-pressed={active}
                  style={{ backgroundColor: c }}
                  className={cm.cn(
                    'h-9 w-9 rounded-full ring-2 transition-transform hover:-translate-y-0.5',
                    active ? 'ring-on-surface' : 'ring-transparent',
                  )}
                />
              )
            })}
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-lg bg-error/10 text-error',
            )}
          >
            {error}
          </p>
        ) : null}

        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
          <Link
            to="/spaces"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('extrabold'),
              cm.textSize('sm'),
              'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0',
            )}
          >
            {saving
              ? t('newSpace.saving', {}, { defaultValue: 'Creating\u2026' })
              : t('newSpace.submit', {}, { defaultValue: 'Create space' })}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewSpace
