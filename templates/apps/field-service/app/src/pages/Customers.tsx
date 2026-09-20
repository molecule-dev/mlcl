import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string
}

export function Customers() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/customers')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Customer>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('customers.loadError', {}, { defaultValue: 'Failed to load customers.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q),
    )
  }, [list, search])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('customers.heading', {}, { defaultValue: 'Customers' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'customers.subheading',
              { count: visible.length, total: list.length },
              { defaultValue: '{{count}} of {{total}} customers' },
            )}
          </p>
        </div>
        <Link
          to="/customers/new"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          + {t('customers.addLabel', {}, { defaultValue: 'New customer' })}
        </Link>
      </header>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t(
          'customers.searchPlaceholder',
          {},
          { defaultValue: 'Name, email, or address…' },
        )}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'border border-outline-variant rounded-md max-w-md w-full',
          cm.textSize('sm'),
        )}
      />

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('customers.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('customers.empty', {}, { defaultValue: 'No customers match.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
          <table className={'w-full text-left text-sm'}>
            <thead>
              <tr className={'border-b border-outline-variant'}>
                <Th>{t('customers.col.name', {}, { defaultValue: 'Customer' })}</Th>
                <Th>{t('customers.col.contact', {}, { defaultValue: 'Contact' })}</Th>
                <Th>{t('form.address', {}, { defaultValue: 'Address' })}</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr
                  key={c.id}
                  className={'border-b border-outline-variant hover:bg-surface-container'}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('medium'))}>
                    <Link to={`/customers/${c.id}`}>{c.name}</Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {c.email ?? '—'}
                    {c.phone ? ` · ${c.phone}` : ''}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {c.address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <th
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'text-on-surface-variant',
        'uppercase tracking-wider',
      )}
    >
      {children}
    </th>
  )
}
