import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ModelEditActionBarProps {
  onSave?: () => void | Promise<void>
  onCancel?: () => void | Promise<void>
  onDelete?: () => void | Promise<void>
  saving?: boolean
  savedAt?: number | null
  error?: string | null
}

function ModelEditActionBar(props: ModelEditActionBarProps = {}) {
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const cm = getClassMap()
  const [internalLoading, setLoading] = useState(false)
  const loading = props.saving ?? internalLoading

  const handleDelete = async () => {
    if (props.onDelete) {
      await props.onDelete()
      return
    }
    setLoading(true)
    try {
      await http.delete(`/api/models/${id}`)
      navigate('/models')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (props.onSave) {
      await props.onSave()
      return
    }
    setLoading(true)
    try {
      await http.put(`/api/models/${id}`, {})
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (props.onCancel) {
      void props.onCancel()
      return
    }
    navigate(-1)
  }

  return (
    <div
      data-mol-id="model-edit-action-bar"
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('py', 4),
        cm.sp('px', 8),
        'fixed bottom-0 left-[260px] right-0 bg-surface/90 backdrop-blur-md border-t border-outline-variant/20 z-30 shadow-[0_-4px_24px_rgba(26,26,46,0.04)]',
      )}
    >
      <button
        data-mol-id="model-edit-delete"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'rounded-xl text-error hover:bg-error/10 transition-colors',
        )}
        onClick={handleDelete}
        disabled={loading}
      >
        <span className="material-symbols-outlined text-[18px]" data-icon="delete">
          delete
        </span>
        {t('modelEditActionBar.deleteModel', {}, { defaultValue: 'Delete Model' })}
      </button>
      <div className={cm.flex({ align: 'center', gap: 4 })}>
        {props.savedAt ? (
          <span data-mol-id="model-edit-saved" className={cm.cn(cm.textSize('xs'), 'text-primary')}>
            {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
          </span>
        ) : null}
        {props.error ? (
          <span
            data-mol-id="model-edit-error-inline"
            role="alert"
            className={cm.cn(cm.textSize('xs'), 'text-error')}
          >
            {props.error}
          </span>
        ) : null}
        <button
          data-mol-id="model-edit-cancel"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors',
          )}
          onClick={handleCancel}
        >
          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
        </button>
        <button
          data-mol-id="model-edit-save"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 6),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-xl gradient-cta text-on-primary hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-[1px] active:translate-y-0 transition-all',
          )}
          onClick={handleSave}
          disabled={loading}
        >
          <span className="material-symbols-outlined text-[18px]" data-icon="save">
            save
          </span>
          {loading
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('common.saveChanges', {}, { defaultValue: 'Save Changes' })}
        </button>
      </div>
    </div>
  )
}

export default ModelEditActionBar
export { ModelEditActionBar }
