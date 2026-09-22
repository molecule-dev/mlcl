import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter.js'
import type { VaultCategoryId } from '../components/VaultItemRow.js'

const CATEGORY_TILES: {
  id: VaultCategoryId
  icon: string
  labelKey: string
  defaultLabel: string
  apiType: string
}[] = [
  {
    id: 'login',
    icon: 'lock',
    labelKey: 'newItem.cat.login',
    defaultLabel: 'Login',
    apiType: 'login',
  },
  {
    id: 'card',
    icon: 'credit_card',
    labelKey: 'newItem.cat.card',
    defaultLabel: 'Credit Card',
    apiType: 'card',
  },
  {
    id: 'identity',
    icon: 'badge',
    labelKey: 'newItem.cat.identity',
    defaultLabel: 'Identity',
    apiType: 'identity',
  },
  {
    id: 'note',
    icon: 'description',
    labelKey: 'newItem.cat.note',
    defaultLabel: 'Secure Note',
    apiType: 'note',
  },
  {
    id: 'api',
    icon: 'vpn_key',
    labelKey: 'newItem.cat.api',
    defaultLabel: 'API Key',
    apiType: 'api_key',
  },
  {
    id: 'wifi',
    icon: 'wifi',
    labelKey: 'newItem.cat.wifi',
    defaultLabel: 'Wi-Fi',
    apiType: 'wifi',
  },
]

export function NewItem() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const http = useHttpClient()
  // The Generator's "Use in new login" button hands its output over via
  // router state so it pre-fills the password field here.
  const generatedPassword =
    (location.state as { generatedPassword?: string } | null)?.generatedPassword ?? ''
  const [category, setCategory] = useState<VaultCategoryId>('login')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState(generatedPassword)
  const [uri, setUri] = useState('')
  const [notes, setNotes] = useState('')
  const [folder, setFolder] = useState('personal')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const segments: 1 | 2 | 3 | 4 | null = !password
    ? null
    : password.length >= 16
      ? 4
      : password.length >= 12
        ? 3
        : password.length >= 8
          ? 2
          : 1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('auth.signup.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSaving(true)
    setError(null)
    try {
      const apiType = CATEGORY_TILES.find((c) => c.id === category)?.apiType ?? 'login'
      const payload: Record<string, unknown> = {
        name: name.trim(),
        type: apiType,
        username: username.trim() || null,
        url: uri.trim() || null,
        password: password || null,
        notes: notes.trim() || null,
        folder,
      }
      const res = await http.post<unknown>('/api/items', payload)
      const data = (
        res && typeof res === 'object' && 'data' in res
          ? (res as { data: { id: string } }).data
          : res
      ) as { id?: string }
      if (data?.id) {
        // Domain analytics — ids/metadata only, never the secret itself.
        void track({ name: 'credential.added', properties: { item_id: data.id, type: apiType } })
        navigate(`/vault/${data.id}`, { replace: true })
      } else {
        navigate('/vault', { replace: true })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save item'
      setError(message)
      setSaving(false)
    }
  }

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'rounded-lg border border-primary-light/40 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all',
  )

  return (
    <form
      onSubmit={handleSubmit}
      className={cm.cn(
        'p-4 md:p-8',
        cm.flex({ direction: 'col', gap: 'xl' }),
        cm.maxW('4xl'),
        'mx-auto',
      )}
    >
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        <Link to="/vault" className={cm.cn('hover:text-primary transition-colors')}>
          {t('newItem.breadcrumb.vault', {}, { defaultValue: 'Vault' })}
        </Link>
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          chevron_right
        </span>
        <span className="text-on-surface font-medium">
          {t('newItem.breadcrumb.new', {}, { defaultValue: 'New item' })}
        </span>
      </nav>

      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('newItem.eyebrow', {}, { defaultValue: 'Vault · New entry' })}
        </span>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('newItem.heading', {}, { defaultValue: 'Add a new vault entry' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
          {t(
            'newItem.subhead',
            {},
            {
              defaultValue:
                'Choose a type, fill in what you have, and we will encrypt the rest locally before it leaves your device.',
            },
          )}
        </p>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ direction: 'col', gap: 'md' }),
          'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
        )}
      >
        <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
          {t('form.type', {}, { defaultValue: 'Type' })}
        </h2>
        <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-2 md:grid-cols-3')}>
          {CATEGORY_TILES.map((tile) => {
            const active = category === tile.id
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => setCategory(tile.id)}
                data-testid={`new-item-cat-${tile.id}`}
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'start', gap: 'sm' }),
                  cm.sp('p', 4),
                  cm.cursorPointer,
                  'rounded-xl border transition-all hover:-translate-y-0.5',
                  active
                    ? 'bg-primary-light border-primary text-primary'
                    : 'bg-surface-container-low/60 border-primary-light/30 text-on-surface-variant',
                )}
              >
                <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
                  {tile.icon}
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {t(tile.labelKey, {}, { defaultValue: tile.defaultLabel })}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ direction: 'col', gap: 'md' }),
          'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
        )}
      >
        <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
          {t('nav.details', {}, { defaultValue: 'Details' })}
        </h2>

        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.name', {}, { defaultValue: 'Name' })}
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('newItem.namePlaceholder', {}, { defaultValue: 'GitHub work account' })}
            className={inputClass}
            data-testid="new-item-name"
            required
          />
        </label>

        <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 md:grid-cols-2')}>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.username', {}, { defaultValue: 'Username' })}
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t(
                'auth.passwordPlaceholderEmail',
                {},
                { defaultValue: 'you@example.com' },
              )}
              className={inputClass}
              data-testid="new-item-username"
            />
          </label>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.login.password', {}, { defaultValue: 'Password' })}
            </span>
            <div className="relative">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className={cm.cn(inputClass, 'font-mono pr-10')}
                data-testid="new-item-password"
              />
              <Link
                to="/generator"
                className={cm.cn(
                  'absolute right-2 top-1/2 -translate-y-1/2 p-1 text-primary hover:bg-primary-light rounded-md',
                )}
                aria-label={t('newItem.openGenerator', {}, { defaultValue: 'Open generator' })}
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  auto_awesome
                </span>
              </Link>
            </div>
            {segments && <PasswordStrengthMeter segments={segments} width="full" />}
          </label>
        </div>

        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('newItem.uri', {}, { defaultValue: 'Site / URI' })}
          </span>
          <input
            type="url"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="https://github.com/login"
            className={inputClass}
            data-testid="new-item-url"
          />
        </label>

        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.notes', {}, { defaultValue: 'Notes' })}
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t(
              'newItem.notesPlaceholder',
              {},
              { defaultValue: 'Any relevant detail (encrypted on save).' },
            )}
            className={cm.cn(inputClass, 'min-h-[80px] resize-y')}
            data-testid="new-item-notes"
            rows={3}
          />
        </label>

        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('newItem.folder', {}, { defaultValue: 'Folder' })}
          </span>
          <select value={folder} onChange={(e) => setFolder(e.target.value)} className={inputClass}>
            <option value="personal">
              {t('newItem.folder.personal', {}, { defaultValue: 'Personal' })}
            </option>
            <option value="work">{t('newItem.folder.work', {}, { defaultValue: 'Work' })}</option>
            <option value="family">
              {t('newItem.folder.family', {}, { defaultValue: 'Family' })}
            </option>
          </select>
        </label>

        {error && (
          <p className={cm.cn(cm.textSize('xs'), 'text-error')} data-testid="new-item-error">
            {error}
          </p>
        )}
      </section>

      <footer
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <p
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            'text-on-surface-variant',
          )}
        >
          <span className="material-symbols-outlined text-[16px] text-success" aria-hidden="true">
            lock
          </span>
          {t(
            'newItem.encryptedHint',
            {},
            { defaultValue: 'Encrypted with your master key before it ever leaves this device.' },
          )}
        </p>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <button
            type="button"
            onClick={() => navigate('/vault')}
            className={cm.cn(
              cm.sp('px', 4),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg py-2 bg-surface border border-primary-light/40 text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            data-testid="new-item-save"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg py-2 bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-60',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {saving ? 'progress_activity' : 'save'}
            </span>
            {saving
              ? t('newItem.saving', {}, { defaultValue: 'Sealing…' })
              : t('newItem.save', {}, { defaultValue: 'Seal & save' })}
          </button>
        </div>
      </footer>
    </form>
  )
}

export default NewItem
