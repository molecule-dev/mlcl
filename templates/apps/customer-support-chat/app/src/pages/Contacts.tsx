import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { get, post } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { InboxLayout } from '../components/InboxLayout.js'
import { StatusPill } from '../components/StatusPill.js'

interface ContactRow {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  company: string | null
  total_conversations: number
  last_seen_at: string | null
  first_seen_at: string | null
}

const PRESENCE_DOT = {
  online: 'bg-success',
  away: 'bg-warning',
  offline: 'bg-[var(--color-text-muted)]',
} as const

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  const ms = Date.now() - then
  if (ms < 60_000) return 'just now'
  const m = Math.floor(ms / 60_000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function presenceFromLastSeen(iso: string | null): 'online' | 'away' | 'offline' {
  if (!iso) return 'offline'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 5 * 60_000) return 'online'
  if (ms < 60 * 60_000) return 'away'
  return 'offline'
}

function ContactsBody() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formCompany, setFormCompany] = useState('')

  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await get<ContactRow[]>('/api/contacts')
      setContacts(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formName.trim() && !formEmail.trim()) {
      setError(
        t(
          'contacts.form.nameOrEmailRequired',
          {},
          { defaultValue: 'Provide at least a name or email' },
        ),
      )
      return
    }
    setCreating(true)
    setError(null)
    try {
      const created = await post<{ id: string }>('/api/contacts', {
        name: formName.trim() || undefined,
        email: formEmail.trim() || undefined,
        company: formCompany.trim() || undefined,
      })
      void track({
        name: 'contact.created',
        properties: { contact_id: (created.data as { id?: string })?.id },
      })
      setFormName('')
      setFormEmail('')
      setFormCompany('')
      setShowForm(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact')
    } finally {
      setCreating(false)
    }
  }

  const subheadingCount = useMemo(() => contacts.length, [contacts])

  return (
    <div className={cm.cn(cm.stack(6), cm.sp('p', 6))}>
      <header
        className={cm.cn(
          cm.flex({ direction: 'row', justify: 'between', align: 'start', gap: 4 }),
          'flex-wrap',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-primary-dark',
            )}
          >
            {t('contacts.eyebrow', {}, { defaultValue: 'Customer directory' })}
          </span>
          <h1
            className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('contacts.heading', {}, { defaultValue: 'Contacts' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'contacts.subheading',
              { count: subheadingCount },
              {
                defaultValue:
                  'Showing {{count}} customers across all channels. Click any row to open the profile.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'rounded-lg bg-primary text-on-primary hover:bg-primary/90',
          )}
        >
          {showForm
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('contacts.add', {}, { defaultValue: '+ Add contact' })}
        </button>
      </header>
      {showForm ? (
        <form
          onSubmit={handleCreate}
          className={cm.cn(
            cm.sp('p', 4),
            cm.flex({ direction: 'col', gap: 3 }),
            'rounded-xl border border-[color:var(--color-border)] bg-surface',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }), 'md:flex-row')}>
            <input
              type="text"
              placeholder={t('form.name', {}, { defaultValue: 'Name' })}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-full md:flex-1 rounded-md border border-[color:var(--color-border)] bg-surface text-on-surface',
              )}
            />
            <input
              type="email"
              placeholder={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-full md:flex-1 rounded-md border border-[color:var(--color-border)] bg-surface text-on-surface',
              )}
            />
            <input
              type="text"
              placeholder={t('form.company', {}, { defaultValue: 'Company' })}
              value={formCompany}
              onChange={(e) => setFormCompany(e.target.value)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-full md:flex-1 rounded-md border border-[color:var(--color-border)] bg-surface text-on-surface',
              )}
            />
          </div>
          <div className={cm.cn(cm.flex({ justify: 'end' }))}>
            <button
              type="submit"
              disabled={creating}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'rounded-lg bg-primary text-on-primary disabled:opacity-50',
              )}
            >
              {creating
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('contacts.form.save', {}, { defaultValue: 'Save contact' })}
            </button>
          </div>
        </form>
      ) : null}
      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-error-container)] text-[color:var(--color-on-error-container)]',
          )}
        >
          {error}
        </div>
      ) : null}
      <div
        className={cm.cn(
          'overflow-x-auto rounded-xl border border-[color:var(--color-border)] bg-surface',
        )}
      >
        <table className={cm.cn('w-full min-w-[640px] text-left text-sm')}>
          <thead className="bg-surface-secondary">
            <tr>
              {[
                t('nav.customer', {}, { defaultValue: 'Customer' }),
                t('form.company', {}, { defaultValue: 'Company' }),
                t('form.phone', {}, { defaultValue: 'Phone' }),
                t('contacts.col.conversations', {}, { defaultValue: 'Conversations' }),
                t('contacts.col.lastSeen', {}, { defaultValue: 'Last seen' }),
              ].map((label) => (
                <th
                  key={label}
                  scope="col"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={'divide-y divide-[color:var(--color-border-secondary)]'}>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 6),
                    cm.textSize('sm'),
                    'text-center text-on-surface-variant',
                  )}
                >
                  {t('contacts.loading', {}, { defaultValue: 'Loading contacts…' })}
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 8),
                    cm.textSize('sm'),
                    'text-center text-on-surface-variant',
                  )}
                >
                  {t(
                    'contacts.empty',
                    {},
                    { defaultValue: 'No contacts yet. Add your first contact above.' },
                  )}
                </td>
              </tr>
            ) : (
              contacts.map((contact) => {
                const presence = presenceFromLastSeen(contact.last_seen_at)
                const displayName =
                  contact.name ||
                  contact.email ||
                  t('contacts.unnamed', {}, { defaultValue: 'Unnamed contact' })
                return (
                  <tr key={contact.id} className={'hover:bg-surface-secondary transition-colors'}>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <Link
                        to={`/contacts/${contact.id}`}
                        className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}
                      >
                        <div className="relative">
                          <div
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'center' }),
                              cm.w(9),
                              cm.h(9),
                              cm.roundedFull,
                              cm.fontWeight('bold'),
                              cm.textSize('xs'),
                              'bg-primary/15 text-primary-dark',
                            )}
                          >
                            {displayName
                              .split(/\s+/)
                              .map((p) => p[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <span
                            aria-hidden="true"
                            className={cm.cn(
                              'absolute -bottom-0.5 -right-0.5 ring-2 ring-[color:var(--color-surface)]',
                              cm.w(2),
                              cm.h(2),
                              cm.roundedFull,
                              PRESENCE_DOT[presence],
                            )}
                          />
                        </div>
                        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                          <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                            {displayName}
                          </span>
                          {contact.email ? (
                            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                              {contact.email}
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <StatusPill
                        variant={contact.company ? 'unread' : 'offline'}
                        label={contact.company || '—'}
                      />
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                      )}
                    >
                      {contact.phone || '—'}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.fontWeight('semibold'),
                        'tabular-nums text-on-surface',
                      )}
                    >
                      {contact.total_conversations ?? 0}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                      )}
                    >
                      {relativeTime(contact.last_seen_at)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Contacts() {
  return <InboxLayout main={<ContactsBody />} />
}

export default Contacts
export { Contacts, Contacts as ContactsPage }
