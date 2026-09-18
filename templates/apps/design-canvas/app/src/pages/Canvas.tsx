/**
 * Stub redirect — INVENTORY marks `Canvas` as an EXTRA page (no route in
 * screen-map). The real canvas lives at `/editor/:id` (Editor.tsx). This
 * file remains in `pages/` as a small forwarding component so historical
 * deep-links (or stray imports) resolve to the canonical editor.
 */

import { Navigate, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'

export function CanvasPage() {
  const { t } = useTranslation()
  const params = useParams<{ id?: string }>()
  const fallbackTitle = t('canvas.redirecting', {}, { defaultValue: 'Opening editor…' })
  if (params.id) {
    return <Navigate to={`/editor/${params.id}`} replace state={{ message: fallbackTitle }} />
  }
  return <Navigate to="/dashboard" replace state={{ message: fallbackTitle }} />
}

export default CanvasPage
