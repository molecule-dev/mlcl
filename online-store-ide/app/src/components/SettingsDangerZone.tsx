import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, Modal } from '@molecule/app-ui-react'
export default function SettingsDangerZone() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth<{ id?: string }>()
  const http = useHttpClient()
  const [showModal, setShowModal] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function handleDelete(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await http.delete(`/api/users/${user?.id}`, { data: { password } })
      await logout()
      navigate('/login')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settingsDangerZone.deleteError', {}, { defaultValue: 'Failed to delete account' }),
      )
    } finally {
      setLoading(false)
    }
  }
  return (
    <>
      <section
        className={cm.cn(cm.sp('p', 8), 'bg-error-light/50 rounded-xl border border-red-100')}
        data-mol-id="section-danger"
      >
        <h2
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 2), 'text-sale')}
        >
          {t('settingsDangerZone.title', {}, { defaultValue: 'Danger Zone' })}
        </h2>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('mb', 6),
            'text-error/70',
          )}
        >
          {t(
            'settingsDangerZone.warning',
            {},
            {
              defaultValue:
                'Once you delete your account, there is no going back. Please be certain.',
            },
          )}
        </p>
        <button
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'bg-sale text-white rounded-lg shadow-sm hover:bg-red-700 transition-all',
          )}
          data-mol-id="delete-account"
          onClick={() => setShowModal(true)}
        >
          {t('settingsDangerZone.deleteAccount', {}, { defaultValue: 'Delete My Account' })}
        </button>
      </section>
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={t('settingsDangerZone.modalTitle', {}, { defaultValue: 'Delete Account' })}
        data-mol-id="delete-account-modal"
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
          {t(
            'settingsDangerZone.confirmMessage',
            {},
            {
              defaultValue:
                'Are you sure you want to delete your account? This action cannot be undone.',
            },
          )}
        </p>
        {error && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleDelete} className={cm.stack(4)}>
          <Input
            type="password"
            label={t(
              'settingsDangerZone.passwordLabel',
              {},
              { defaultValue: 'Enter your password to confirm' },
            )}
            value={password}
            onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
            automationId="delete-account-password"
            required
          />
          <Button type="submit" color="error" fullWidth loading={loading}>
            {loading
              ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
              : t('settingsDangerZone.deleteAccount', {}, { defaultValue: 'Delete My Account' })}
          </Button>
        </form>
      </Modal>
    </>
  )
}
export { SettingsDangerZone }
