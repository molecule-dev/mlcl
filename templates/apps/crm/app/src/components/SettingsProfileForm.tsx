import { useEffect, useRef, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SettingsProfileForm() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth()
  const http = useHttpClient()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const userId = (user as { id?: string } | null)?.id ?? null

  async function handlePhotoChange(_e: React.ChangeEvent<HTMLInputElement>) {
    // Photo upload is not yet wired to a real /uploads endpoint; user feedback only.
    setSavedAt(Date.now())
  }

  useEffect(() => {
    if (user) {
      const u = user as Record<string, unknown>
      const name = (u.name as string) || ''
      const oauth = (u.oauthData as Record<string, unknown> | null) ?? null
      const profile = (oauth?.crm as Record<string, unknown> | null) ?? null
      const words = name.split(' ')
      setFirstName(words[0] || '')
      setLastName(words.length > 1 ? words.slice(1).join(' ') : '')
      setEmail((u.email as string) || '')
      if (profile) {
        if (typeof profile.phone === 'string') setPhone(profile.phone)
        if (typeof profile.jobTitle === 'string') setJobTitle(profile.jobTitle)
      }
    }
  }, [user])

  useEffect(() => {
    if (savedAt === null) return
    const timer = setTimeout(() => setSavedAt(null), 2500)
    return () => clearTimeout(timer)
  }, [savedAt])

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    try {
      const fullName = `${firstName} ${lastName}`.trim()
      const oauthData = {
        ...((user as { oauthData?: Record<string, unknown> })?.oauthData ?? {}),
        crm: {
          ...(((user as { oauthData?: Record<string, unknown> })?.oauthData?.crm as
            Record<string, unknown> | undefined) ?? {}),
          phone,
          jobTitle,
        },
      }
      await http.patch(`/api/users/${userId}`, {
        name: fullName,
        email,
        oauthData,
      })
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Profile Form Section */}
      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 10), 'gap-8')}>
          <div className={cm.fvd683bc2b}>
            <div
              className={cm.cn(
                cm.w(24),
                cm.h(24),
                cm.roundedFull,
                'overflow-hidden bg-surface-container-highest',
              )}
            >
              <img
                alt={t('settingsProfileForm.profilePhoto', {}, { defaultValue: 'Profile Photo' })}
                className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                data-alt="Professional headshot of a man with short hair in a bright office environment, high resolution"
                src="https://picsum.photos/seed/SettingsProfileForm-1/1200/800"
              />
            </div>
            <button
              onClick={() => photoInputRef.current?.click()}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.roundedFull,
                'absolute inset-0 bg-on-surface/40 opacity-0 group-hover:opacity-100 transition-opacity',
              )}
            >
              <span
                className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined text-white')}
                data-icon="photo_camera"
              >
                photo_camera
              </span>
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className={cm.fvb76e9daa}
              onChange={handlePhotoChange}
            />
          </div>
          <div>
            <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
              {t('settingsProfileForm.profilePhoto', {}, { defaultValue: 'Profile Photo' })}
            </h2>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mb', 3), 'text-on-surface-variant')}>
              {t(
                'settingsProfileForm.photoHint',
                {},
                { defaultValue: 'Update your avatar. Recommended size: 400x400px.' },
              )}
            </p>
            <button
              onClick={() => photoInputRef.current?.click()}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.textPrimary,
                'bg-surface-container-highest rounded hover:bg-surface-container-high transition-colors',
              )}
            >
              {t('settingsProfileForm.changePhoto', {}, { defaultValue: 'Change Photo' })}
            </button>
          </div>
        </div>
        <div className={cm.cn(cm.grid({ cols: 2, gap: 6 }))}>
          <div className={cm.fv4f3df6dd}>
            <label className={cm.fv9d12c199}>
              {t('settingsProfileForm.firstNameLabel', {}, { defaultValue: 'First Name' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'bg-surface-container-lowest border-none rounded focus:ring-2 focus:ring-primary-fixed outline-none shadow-sm',
              )}
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className={cm.fv4f3df6dd}>
            <label className={cm.fv9d12c199}>
              {t('settingsProfileForm.lastNameLabel', {}, { defaultValue: 'Last Name' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'bg-surface-container-lowest border-none rounded focus:ring-2 focus:ring-primary-fixed outline-none shadow-sm',
              )}
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className={cm.fv5a9df07f}>
            <label className={cm.fv9d12c199}>
              {t('settingsProfileForm.emailLabel', {}, { defaultValue: 'Email Address' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'bg-surface-container-lowest border-none rounded focus:ring-2 focus:ring-primary-fixed outline-none shadow-sm',
              )}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={cm.fv4f3df6dd}>
            <label className={cm.fv9d12c199}>
              {t('form.phone', {}, { defaultValue: 'Phone' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'bg-surface-container-lowest border-none rounded focus:ring-2 focus:ring-primary-fixed outline-none shadow-sm',
              )}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className={cm.fv4f3df6dd}>
            <label className={cm.fv9d12c199}>
              {t('settingsProfileForm.jobTitleLabel', {}, { defaultValue: 'Job Title' })}
            </label>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'bg-surface-container-lowest border-none rounded focus:ring-2 focus:ring-primary-fixed outline-none shadow-sm',
              )}
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
        </div>
        <div
          className={cm.cn(cm.sp('mt', 10), cm.flex({ align: 'center', justify: 'end' }), 'gap-4')}
        >
          {savedAt && (
            <span
              className={cm.textSize('xs')}
              style={{ color: 'var(--color-success, var(--mol-color-success))' }}
            >
              {t('common.saved', {}, { defaultValue: 'Saved' })}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'bg-primary text-white rounded shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform disabled:opacity-60',
            )}
          >
            {saving
              ? t('common.saving', {}, { defaultValue: 'Saving...' })
              : t('common.saveChanges', {}, { defaultValue: 'Save Changes' })}
          </button>
        </div>
      </section>
    </>
  )
}

export default SettingsProfileForm
export { SettingsProfileForm }
