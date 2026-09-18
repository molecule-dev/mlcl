import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, Modal } from '@molecule/app-ui-react'

interface AuthUser {
  id?: string
}

function SettingsDangerZoneSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user, logout } = useAuth<AuthUser>()

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) {
      setError(t('settingsDangerZone.notSignedIn', {}, { defaultValue: 'You are not signed in.' }))
      return
    }
    setLoading(true)
    setError('')
    try {
      await http.delete(`/api/users/${user.id}`, { data: { password } })
      await logout()
      navigate('/login')
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'settingsDangerZone.deleteError',
              {},
              { defaultValue: 'Failed to delete account. Please try again.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Danger Zone Section */}
      <section>
        <h3
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 4),
            cm.sp('ml', 2),
            'font-headline tracking-tight text-error',
          )}
        >
          {t('settingsDangerZone.sectionTitle', {}, { defaultValue: 'Critical Actions' })}
        </h3>
        <div
          className={cm.cn(
            cm.sp('p', 8),
            'bg-surface-container-lowest rounded-3xl ambient-shadow ring-1 ring-error/10',
          )}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <div>
              <h4
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 1),
                  'text-on-surface',
                )}
              >
                {t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete Account' })}
              </h4>
              <p className={cm.cn(cm.textSize('sm'), cm.maxW('md'), 'text-on-surface-variant')}>
                {t(
                  'settingsDangerZone.deleteAccountDescription',
                  {},
                  {
                    defaultValue:
                      'Once you delete your account, there is no going back. All AI models, training data, and integrations will be permanently purged.',
                  },
                )}
              </p>
            </div>
            <button
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl border-2 border-error/20 text-error hover:bg-error/5 transition-all',
              )}
              onClick={() => {
                setError('')
                setPassword('')
                setShowModal(true)
              }}
              disabled={loading}
              data-mol-id="user-menu-delete-account"
            >
              {t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete Account' })}
            </button>
          </div>
        </div>
      </section>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete Account' })}
        data-mol-id="delete-account-modal"
      >
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
          {t(
            'settings.deleteAccountModal.warning',
            {},
            {
              defaultValue:
                'This action is permanent and cannot be undone. Enter your password to confirm.',
            },
          )}
        </p>
        {error && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleDeleteAccount} className={cm.stack(4)}>
          <div>
            <label htmlFor="delete-account-password" className={cm.formLabel}>
              {t('settings.deleteAccountModal.password', {}, { defaultValue: 'Password' })}
            </label>
            <Input
              id="delete-account-password"
              type="password"
              value={password}
              onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
              required
            />
          </div>
          <Button type="submit" color="error" fullWidth loading={loading}>
            {loading
              ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
              : t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete Account' })}
          </Button>
        </form>
      </Modal>
    </>
  )
}

export default SettingsDangerZoneSection
export { SettingsDangerZoneSection }
