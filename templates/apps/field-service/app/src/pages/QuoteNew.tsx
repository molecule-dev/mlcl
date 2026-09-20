import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { QuoteForm } from '../components/QuoteForm.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

export function QuoteNew() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/customers')
      .then((res) => {
        if (!cancelled)
          setCustomers(
            unwrapList<{ id: string; name: string }>(res).map((c) => ({ id: c.id, name: c.name })),
          )
      })
      .catch(() => {
        if (!cancelled)
          setError(t('quotes.new.loadCustomers', {}, { defaultValue: 'Failed to load customers.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto)}>
      <nav className={cm.sp('mb', 4)}>
        <Link to="/quotes" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('quotes.backToList', {}, { defaultValue: 'Back to quotes' })}
        </Link>
      </nav>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('quotes.new.heading', {}, { defaultValue: 'New quote' })}
      </h1>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('quotes.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <QuoteForm
          customers={customers}
          submitLabel={t('quotes.new.submit', {}, { defaultValue: 'Save draft' })}
          submitting={submitting}
          error={error}
          onSubmit={async (payload) => {
            setSubmitting(true)
            setError(null)
            try {
              const res = await http.post('/api/quotes', payload)
              const created = unwrapSingle<{ id?: string }>(res)
              navigate(created?.id ? `/quotes/${created.id}` : '/quotes')
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : t('quotes.new.error', {}, { defaultValue: 'Failed to create quote.' }),
              )
            } finally {
              setSubmitting(false)
            }
          }}
        />
      )}
    </div>
  )
}
