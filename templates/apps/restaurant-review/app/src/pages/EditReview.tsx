import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'
import { WriteReview } from './WriteReview.js'

interface ApiReview {
  id: string
  restaurant_id: string
  rating: number
  body: string
  title?: string | null
  photos?: string[] | string | null
  created_at: string
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch (_error) {
      // JSON.parse failed on a malformed string; fall back to empty array
      return []
    }
  }
  return []
}

export function EditReview() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [review, setReview] = useState<ApiReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/reviews/${id}`)
      .then((res) => {
        if (cancelled) return
        const r = unwrapSingle<ApiReview>(res)
        if (!r) {
          setError(t('editReview.notFound', {}, { defaultValue: 'Review not found.' }))
          return
        }
        setReview(r)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('editReview.loadError', {}, { defaultValue: 'Failed to load review.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading) {
    return (
      <main
        className={cm.cn(cm.maxW('2xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto, cm.textCenter)}
      >
        <p className={'text-on-surface-variant'}>
          {t('editReview.loading', {}, { defaultValue: 'Loading review…' })}
        </p>
      </main>
    )
  }

  if (error || !review) {
    return (
      <main
        className={cm.cn(cm.maxW('2xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto, cm.textCenter)}
      >
        <p className={'text-error'}>
          {error ?? t('editReview.notFound', {}, { defaultValue: 'Review not found.' })}
        </p>
      </main>
    )
  }

  return (
    <WriteReview
      initial={{
        rating: review.rating,
        body: review.body,
        photoUrls: asArray(review.photos),
        headingOverride: t('editReview.heading', {}, { defaultValue: 'Edit your review' }),
        submitOverride: t('common.saveChanges', {}, { defaultValue: 'Save changes' }),
        showDelete: true,
        reviewId: review.id,
        restaurantId: review.restaurant_id,
      }}
    />
  )
}
