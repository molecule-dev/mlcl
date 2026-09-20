import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { QuoteForm } from '../components/QuoteForm.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Quote {
  id: string
  customer_id: string
  title: string
  status: string
  valid_until: string | null
  notes: string
  items: Array<{ id: string; description: string; qty: number; unit: string; rate_cents: number }>
}

export function QuoteEdit() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/quotes/${id}`).then((r) => unwrapSingle<Quote>(r)),
      http.get('/api/customers').then((r) => unwrapList<{ id: string; name: string }>(r)),
    ])
      .then(([q, cs]) => {
        if (cancelled) return
        setQuote(q)
        setCustomers(cs.map((c) => ({ id: c.id, name: c.name })))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('quotes.detail.loadError', {}, { defaultValue: 'Failed to load quote.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto)}>
      <nav className={cm.sp('mb', 4)}>
        <Link
          to={id ? `/quotes/${id}` : '/quotes'}
          className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}
        >
          ← {t('quotes.backToQuote', {}, { defaultValue: 'Back to quote' })}
        </Link>
      </nav>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('quotes.edit.heading', {}, { defaultValue: 'Edit quote' })}
      </h1>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('quotes.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : quote && quote.status === 'draft' ? (
        <QuoteForm
          customers={customers}
          initial={quote}
          submitLabel={t('quotes.edit.submit', {}, { defaultValue: 'Save changes' })}
          submitting={submitting}
          error={error}
          onSubmit={async (payload) => {
            if (!id) return
            setSubmitting(true)
            setError(null)
            try {
              await http.put(`/api/quotes/${id}`, payload)
              navigate(`/quotes/${id}`)
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : t('quotes.edit.error', {}, { defaultValue: 'Failed to save quote.' }),
              )
            } finally {
              setSubmitting(false)
            }
          }}
        />
      ) : (
        <p className={cm.cn(cm.card(), cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('quotes.edit.notEditable', {}, { defaultValue: 'Only draft quotes can be edited.' })}
        </p>
      )}
    </div>
  )
}
