import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AVATAR_BG } from '../lib/avatarColors.js'
import { unwrapList } from '../lib/unwrap.js'

interface Contact {
  id: string
  contact_user_id: string
  name: string
  initials: string
  avatar_index: number
}

export function NewGroup() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/contacts')
      .then((res) => {
        if (!cancelled) setContacts(unwrapList<Contact>(res))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? contacts.filter((c) => c.name.toLowerCase().includes(q)) : contacts
  }, [contacts, search])

  const toggle = (cid: string) => {
    setSelected((curr) => {
      const next = new Set(curr)
      if (next.has(cid)) next.delete(cid)
      else next.add(cid)
      return next
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      // selected holds contact row ids; map them back to the underlying
      // user ids that the API needs as participants.
      const memberIds = contacts.filter((c) => selected.has(c.id)).map((c) => c.contact_user_id)
      await http.post('/api/groups', {
        name: name.trim(),
        description: description.trim() || undefined,
        member_ids: memberIds,
      })
      track({
        name: 'group.created',
        properties: { member_count: memberIds.length },
      })
      navigate('/groups')
    } catch (error) {
      logError('newGroup.create', error)
      setError(
        t('newGroup.createError', {}, { defaultValue: 'Could not create the group. Try again.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to="/groups"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
      >
        ← {t('newGroup.backLink', {}, { defaultValue: 'All groups' })}
      </Link>

      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('newGroup.heading', {}, { defaultValue: 'New group' })}
        </h1>
      </header>

      <form onSubmit={submit} className={'space-y-4'}>
        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('newGroup.nameLabel', {}, { defaultValue: 'Group name' })}
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
          />
        </label>

        <label className="block">
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
          >
            {t('form.descriptionOptional', {}, { defaultValue: 'Description (optional)' })}
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
            )}
          />
        </label>

        <fieldset className={'space-y-2'}>
          <legend className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.sp('mb', 1))}>
            {t(
              'newGroup.membersLabel',
              { count: selected.size },
              { defaultValue: 'Members ({{count}})' },
            )}
          </legend>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('newGroup.searchPlaceholder', {}, { defaultValue: 'Search contacts…' })}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'w-full border border-outline-variant rounded-md',
              cm.sp('mb', 2),
            )}
          />
          {loading ? (
            <p className={cm.cn(cm.textCenter, 'text-on-surface-variant', cm.sp('py', 4))}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : (
            <ul className={'space-y-1 max-h-64 overflow-y-auto'}>
              {visible.map((c) => {
                const isSel = selected.has(c.id)
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => toggle(c.id)}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'block w-full rounded text-left',
                        isSel ? 'bg-primary-container' : 'hover:bg-surface-container',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSel}
                        readOnly
                        className={cm.cn(cm.h(4), cm.w(4))}
                      />
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.h(8),
                          cm.w(8),
                          'rounded-full text-white',
                          cm.fontWeight('semibold'),
                        )}
                        style={{
                          backgroundColor: AVATAR_BG[c.avatar_index % AVATAR_BG.length],
                          fontSize: '12px',
                        }}
                      >
                        {c.initials}
                      </div>
                      <span className={cm.cn(cm.flex1, cm.textSize('sm'))}>{c.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </fieldset>

        {error && (
          <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
            {error}
          </p>
        )}

        <div className={cm.flex({ align: 'center', gap: 'sm', justify: 'end' })}>
          <Link
            to="/groups"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'border border-outline-variant rounded-md',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            disabled={saving || !name.trim() || selected.size === 0}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {saving
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('newGroup.createLabel', {}, { defaultValue: 'Create group' })}
          </button>
        </div>
      </form>
    </div>
  )
}
