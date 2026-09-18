import { useEffect, useRef, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface ProfileForm {
  name: string
  headline: string
  location: string
  skills: string
  bio: string
  willing_to_relocate: boolean
}

interface UserProfileRow {
  user_id: string
  headline: string | null
  bio: string | null
  resume_url: string | null
  skills: string[] | null
  location: string | null
  willing_to_relocate: boolean | null
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const initial = ((user?.name || user?.email || '?') as string).slice(0, 1).toUpperCase()
  const userId = (user?.id as string | undefined) ?? ''

  const [form, setForm] = useState<ProfileForm>({
    name: (user?.name as string) || '',
    headline: '',
    location: '',
    skills: '',
    bio: '',
    willing_to_relocate: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [resumeUploading, setResumeUploading] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/user-profiles/me')
      .then((res) => {
        if (cancelled) return
        const profile = unwrapSingle<UserProfileRow>(res)
        setForm((f) => ({
          ...f,
          headline: profile?.headline ?? '',
          location: profile?.location ?? '',
          bio: profile?.bio ?? '',
          skills: Array.isArray(profile?.skills) ? profile.skills.join(', ') : '',
          willing_to_relocate: !!profile?.willing_to_relocate,
        }))
        setResumeUrl(profile?.resume_url ?? null)
        initialized.current = true
      })
      .catch(() => {
        if (!cancelled) initialized.current = true
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
    setError(null)
  }

  async function handleResumeUpload(file: File) {
    setResumeError(null)
    setResumeUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      // Use fetch directly so we don't fight the http client's JSON
      // content-type defaults; the server route is at /api/uploads/resume.
      const res = await fetch('/api/uploads/resume', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      if (!res.ok) {
        let message = `Upload failed (${res.status})`
        try {
          const body = (await res.json()) as { error?: string }
          if (body?.error) message = body.error
        } catch (_error) {
          // body wasn't JSON; ignore and use the status-based message
        }
        throw new Error(message)
      }
      const body = (await res.json()) as { url?: string }
      if (!body?.url) throw new Error('Server did not return an upload URL.')
      setResumeUrl(body.url)
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : 'Could not upload resume.')
    } finally {
      setResumeUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleResumeRemove() {
    setResumeError(null)
    try {
      await http.put('/api/user-profiles/me', { resume_url: null })
      setResumeUrl(null)
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : 'Could not remove resume.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const skills = form.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      await http.put('/api/user-profiles/me', {
        headline: form.headline || null,
        bio: form.bio || null,
        location: form.location || null,
        willing_to_relocate: form.willing_to_relocate,
        skills,
      })
      if (userId && form.name && form.name !== (user?.name as string)) {
        await http.patch(`/api/users/${userId}`, { name: form.name })
      }
      setSaved(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save'
      setError(
        t('profile.saveError', {}, { defaultValue: 'Could not save profile: {{message}}' }).replace(
          '{{message}}',
          message,
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/20',
        )}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -top-20 h-64 w-64 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute -left-12 -bottom-16 h-48 w-48 rounded-full bg-success/30 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('relative z-10', cm.flex({ align: 'center', gap: 'lg' }))}>
          <span
            aria-hidden="true"
            className={cm.cn(
              'grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-surface/15 backdrop-blur-md border border-surface/20 text-3xl font-extrabold',
            )}
          >
            {initial}
          </span>
          <div>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-white/70')}>
              {t('profile.eyebrow', {}, { defaultValue: 'Seeker profile' })}
            </p>
            <h1 className={cm.cn('mt-1 text-3xl md:text-4xl font-extrabold tracking-tight')}>
              {form.name ||
                (user?.email as string) ||
                t('profile.headingFallback', {}, { defaultValue: 'Your profile' })}
            </h1>
            <p className={cm.cn(cm.sp('mt', 2), 'text-base font-medium text-white/85')}>
              {form.headline ||
                t(
                  'profile.subheading',
                  {},
                  {
                    defaultValue:
                      'Tell employers what you\u2019re looking for, what you\u2019ve shipped, and where you want to go next.',
                  },
                )}
            </p>
          </div>
        </div>
      </header>

      {saved ? (
        <p
          role="status"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-success/10 text-success font-semibold text-sm',
          )}
        >
          {t('profile.savedNotice', {}, { defaultValue: 'Profile updated.' })}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error/10 text-error font-semibold text-sm',
          )}
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('profile.loading', {}, { defaultValue: 'Loading\u2026' })}
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            cm.stack(6),
          )}
        >
          <ProfileField
            id="name"
            label={t('form.displayName', {}, { defaultValue: 'Display name' })}
            placeholder={t('settings.displayNamePlaceholder', {}, { defaultValue: 'Maya Chen' })}
            value={form.name}
            onChange={(v) => update('name', v)}
          />
          <ProfileField
            id="headline"
            label={t('profile.headlineLabel', {}, { defaultValue: 'Headline' })}
            placeholder={t(
              'profile.headlinePlaceholder',
              {},
              { defaultValue: 'Senior Full-stack Engineer \u2014 React, Node, Postgres' },
            )}
            value={form.headline}
            onChange={(v) => update('headline', v)}
          />
          <ProfileField
            id="location"
            label={t('form.location', {}, { defaultValue: 'Location' })}
            placeholder={t(
              'profile.locationPlaceholder',
              {},
              { defaultValue: 'San Francisco, CA \u2014 open to remote' },
            )}
            value={form.location}
            onChange={(v) => update('location', v)}
          />
          <ProfileField
            id="skills"
            label={t('profile.skillsLabel', {}, { defaultValue: 'Skills (comma separated)' })}
            placeholder="React, TypeScript, Postgres, Kubernetes"
            value={form.skills}
            onChange={(v) => update('skills', v)}
          />
          <div className={cm.cn('flex flex-col gap-2')}>
            <label
              htmlFor="bio"
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.summary', {}, { defaultValue: 'Summary' })}
            </label>
            <textarea
              id="bio"
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
              rows={6}
              placeholder={t(
                'profile.summaryPlaceholder',
                {},
                {
                  defaultValue:
                    'A few sentences on what you\u2019ve shipped, what you\u2019re great at, what you\u2019d want to work on next.',
                },
              )}
              className={cm.cn(
                'rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm font-medium text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
              )}
            />
          </div>
          <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
            <input
              id="willing_to_relocate"
              type="checkbox"
              checked={form.willing_to_relocate}
              onChange={(e) => update('willing_to_relocate', e.target.checked)}
              className={cm.cn(
                'h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/30',
              )}
            />
            <span className={cm.cn('text-sm font-medium text-on-surface')}>
              {t('profile.willingToRelocate', {}, { defaultValue: 'Open to relocation' })}
            </span>
          </label>

          <div className={cm.cn('flex flex-col gap-2')}>
            <span
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('common.resume', {}, { defaultValue: 'Resume' })}
            </span>
            <div
              className={cm.cn(
                cm.sp('p', 4),
                'flex flex-col gap-3 rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-lowest sm:flex-row sm:items-center sm:justify-between',
              )}
            >
              <div className={cm.cn('flex items-center gap-3 text-sm text-on-surface')}>
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    'material-symbols-outlined text-2xl',
                    resumeUrl ? 'text-success' : 'text-on-surface-variant',
                  )}
                >
                  {resumeUrl ? 'description' : 'upload_file'}
                </span>
                <div className={cm.cn('flex flex-col')}>
                  <span className={cm.cn('font-semibold text-on-surface')}>
                    {resumeUrl
                      ? t('profile.resumeAttached', {}, { defaultValue: 'Resume on file' })
                      : t('profile.resumeNone', {}, { defaultValue: 'No resume uploaded yet' })}
                  </span>
                  {resumeUrl ? (
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cm.cn(
                        'text-xs font-medium text-primary underline truncate max-w-[18rem]',
                      )}
                    >
                      {resumeUrl}
                    </a>
                  ) : (
                    <span className={cm.cn('text-xs text-on-surface-variant')}>
                      {t(
                        'profile.resumeHint',
                        {},
                        { defaultValue: 'PDF, Word, or plain text. Up to 10 MB.' },
                      )}
                    </span>
                  )}
                </div>
              </div>
              <div className={cm.cn('flex flex-wrap items-center gap-2')}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                  className={cm.cn('hidden')}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleResumeUpload(file)
                  }}
                  data-testid="resume-file-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={resumeUploading}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'rounded-xl bg-primary text-on-primary shadow-sm hover:opacity-90 disabled:opacity-50',
                  )}
                >
                  {resumeUploading
                    ? t('profile.resumeUploading', {}, { defaultValue: 'Uploading\u2026' })
                    : resumeUrl
                      ? t('profile.resumeReplace', {}, { defaultValue: 'Replace resume' })
                      : t('profile.resumeUpload', {}, { defaultValue: 'Upload resume' })}
                </button>
                {resumeUrl ? (
                  <button
                    type="button"
                    onClick={handleResumeRemove}
                    disabled={resumeUploading}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container disabled:opacity-50',
                    )}
                  >
                    {t('common.remove', {}, { defaultValue: 'Remove' })}
                  </button>
                ) : null}
              </div>
            </div>
            {resumeError ? (
              <p role="alert" className={cm.cn('text-xs font-medium text-error')}>
                {resumeError}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'self-start rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50',
            )}
          >
            {saving
              ? t('profile.saving', {}, { defaultValue: 'Saving\u2026' })
              : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
          </button>
        </form>
      )}
    </div>
  )
}

function ProfileField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('flex flex-col gap-2')}>
      <label
        htmlFor={id}
        className={cm.cn(
          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cm.cn(
          'rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm font-medium text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
        )}
      />
    </div>
  )
}
