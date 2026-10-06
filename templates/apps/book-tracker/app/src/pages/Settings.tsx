import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import {
  useAuth,
  useChangePassword,
  useHttpClient,
  usePush,
  useTranslation,
} from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, LanguagePicker, Modal, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = [
  'account',
  'reminders',
  'reading',
  'appearance',
  'hardware',
  'data',
  'security',
  'language',
] as const
type Section = (typeof SECTIONS)[number]

const SECTION_LABELS: Record<Section, string> = {
  account: 'Account',
  reminders: 'Reminders',
  reading: 'Reading rules',
  appearance: 'Appearance',
  hardware: 'Hardware & ledgers',
  data: 'Data & archive',
  security: 'Security',
  language: 'Language',
}

interface Prefs {
  timezone: string | null
  startOfWeek: 'sunday' | 'monday'
  dailyGoalPages: number
  countDnfInStats: boolean
  pauseThresholdDays: number
  cadenceUnit: 'seasons' | 'pages_per_sitting' | 'hearthlight_hours' | 'chapter_arc'
  remindDaily: boolean
  remindStalled: boolean
  remindWeekly: boolean
  remindChallenge: boolean
  remindLending: boolean
  bio: string
}

interface ProfileMe {
  id: string
  name: string | null
  email: string | null
  username: string | null
  planKey: string
  createdAt: string
  preferences: Prefs
}

interface AccountUser {
  id?: string
  oauthServer?: string | null
}

interface DeviceRow {
  id: string
  name?: string | null
  pushPlatform?: string | null
  createdAt?: string | null
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

const DEFAULT_PREFS: Prefs = {
  timezone: null,
  startOfWeek: 'monday',
  dailyGoalPages: 20,
  countDnfInStats: false,
  pauseThresholdDays: 14,
  cadenceUnit: 'seasons',
  remindDaily: true,
  remindStalled: true,
  remindWeekly: true,
  remindChallenge: true,
  remindLending: true,
  bio: '',
}

const CADENCE_UNIT_OPTIONS = [
  { value: 'seasons', label: "Seasons (e.g., 'Late November / First Snow')" },
  { value: 'pages_per_sitting', label: 'Pages per quiet sitting' },
  { value: 'hearthlight_hours', label: 'Hours of hearthlight' },
  { value: 'chapter_arc', label: 'Chapter arc reflection' },
] as const

const PAUSE_THRESHOLD_OPTIONS = [
  { value: 7, label: '7 days (a gentle rest)' },
  { value: 14, label: '14 days (two quiet weeks)' },
  { value: 30, label: '30 days (a moon cycle)' },
  { value: 90, label: '90 days (a full season)' },
] as const

const HARDWARE_CARDS = [
  {
    key: 'marginPen',
    icon: 'ink_pen',
    chip: 'Marginalia',
    title: 'Notebook OCR & Margin Pen',
    body: 'Transcribes physical margin underlinings and pencil stars straight into your notes.',
    status: 'Bring your own notebook',
  },
  {
    key: 'ereader',
    icon: 'tablet_mac',
    chip: 'E-ink',
    title: 'Kobo Clara 2E / Kindle Paperwhite',
    body: 'Imports reading progression percentage without tracking velocity or eye movements.',
    status: 'Passive sync',
  },
  {
    key: 'almanac',
    icon: 'receipt_long',
    chip: 'PDF / Print',
    title: 'Physical Desk Almanac',
    body: 'A quarterly book-plate and reading ledger sheet for your bound journal.',
    status: 'Print any season',
  },
] as const

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const auth = useAuth<AccountUser>()
  const isOAuth = Boolean(auth.user?.oauthServer)
  const push = usePush()
  const {
    status: pwStatus,
    error: pwError,
    changePassword,
    reset: resetChangePassword,
  } = useChangePassword()
  const [section, setSection] = useState<Section>('account')

  const [me, setMe] = useState<ProfileMe | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // C5 — browser push enable (subscribe/unsubscribe via @molecule/app-push)
  const [pushEnabled, setPushEnabled] = useState(push.permission === 'granted')

  // C7 — registered devices (with per-device revoke / sign out)
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)

  // C4 — change-password modal
  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // C10 — delete-account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Data & archive — local export + legacy CSV migration
  const [exporting, setExporting] = useState(false)
  const [exportNote, setExportNote] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importNote, setImportNote] = useState<string | null>(null)

  const loadDevices = useCallback(async () => {
    try {
      const res = await http.get('/devices')
      setDevices(unwrapList<DeviceRow>(res))
    } catch (_error) {
      // Devices endpoint is optional — the list simply renders empty when unavailable.
    } finally {
      setDevicesLoading(false)
    }
  }, [http])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  // Revoke (sign out) a device: deleting the row triggers server-side session
  // revocation, then we refetch so the list reflects the change.
  async function revokeDevice(id: string) {
    setRevokingDeviceId(id)
    try {
      await http.delete(`/devices/${id}`)
      setConfirmingDeviceId(null)
      await loadDevices()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      setRevokingDeviceId(null)
    }
  }

  async function handlePushToggle(next: boolean) {
    try {
      if (next) {
        await push.requestPermission()
        await push.register()
        setPushEnabled(true)
      } else {
        await push.unregister()
        setPushEnabled(false)
      }
    } catch (_error) {
      // Browser permission denied or service worker unavailable — leave the toggle
      // in its previous state; no data loss, no broken state.
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowPwModal(false)
      setCurrentPassword('')
      setNewPassword('')
      resetChangePassword()
    } catch (_error) {
      // Error surfaced via `pwError` from useChangePassword — keep the modal open.
    }
  }

  async function handleDeleteAccount(e: FormEvent) {
    e.preventDefault()
    if (deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await http.delete(`/users/${auth.user?.id}`, { data: { password: deletePassword } })
      await auth.logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t('settings.failedToDeleteAccount', {}, { defaultValue: 'Failed to delete account.' }),
      )
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const res = await http.get('/profile/me')
        if (cancelled) return
        const data = unwrapSingle<ProfileMe>(res)
        if (!data) throw new Error('Empty profile')
        setMe(data)
        setName(data.name ?? '')
        setEmail(data.email ?? '')
        setPrefs({ ...DEFAULT_PREFS, ...(data.preferences ?? {}) })
        setError(null)
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [http])

  const dirty = useMemo(() => {
    if (!me) return false
    if (name !== (me.name ?? '')) return true
    if (email !== (me.email ?? '')) return true
    const stored = me.preferences ?? DEFAULT_PREFS
    const current = prefs as unknown as Record<string, unknown>
    const compare = stored as unknown as Record<string, unknown>
    for (const k of Object.keys(current)) {
      if (current[k] !== compare[k]) return true
    }
    return false
  }, [me, name, email, prefs])

  function downloadTextFile(contents: string, filename: string, type: string) {
    const blob = new Blob([contents], { type })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  /** Export the whole reading archive as plain JSON — no lock-in. */
  async function exportArchive() {
    if (exporting) return
    setExporting(true)
    setExportNote(null)
    try {
      const [books, reviews, challenge] = await Promise.all([
        http.get('/books?limit=1000'),
        http.get('/reviews'),
        http.get(`/challenge?year=${new Date().getFullYear()}`),
      ])
      const payload = {
        exported_at: new Date().toISOString(),
        books: unwrapList(books),
        reviews: unwrapList(reviews),
        challenge: unwrapSingle(challenge),
      }
      downloadTextFile(JSON.stringify(payload, null, 2), 'reading-archive.json', 'application/json')
      setExportNote(
        t(
          'settings.data.exportDone',
          { count: (payload.books as unknown[]).length },
          { defaultValue: 'Archive downloaded — {{count}} books exported.' },
        ),
      )
    } catch (err) {
      setExportNote(err instanceof Error ? err.message : String(err))
    } finally {
      setExporting(false)
    }
  }

  /** Legacy migration: import a Goodreads/StoryGraph-style CSV ledger. */
  async function importLegacyCsv(file: File) {
    if (importing) return
    setImporting(true)
    setImportNote(null)
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
      if (lines.length < 2)
        throw new Error(t('settings.data.csvEmpty', {}, { defaultValue: 'That CSV has no rows.' }))
      const parseCsvLine = (line: string): string[] => {
        const cells: string[] = []
        let cur = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"'
              i++
            } else {
              inQuotes = !inQuotes
            }
          } else if (ch === ',' && !inQuotes) {
            cells.push(cur)
            cur = ''
          } else {
            cur += ch
          }
        }
        cells.push(cur)
        return cells.map((c) => c.trim())
      }
      const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
      const idx = (...names: string[]) =>
        header.findIndex((h) => names.some((n) => h === n || h.includes(n)))
      const iTitle = idx('title')
      const iAuthor = idx('author')
      const iPages = idx('number of pages', 'pages')
      const iShelf = idx('bookshelves', 'shelves', 'status', 'exclusive shelf')
      if (iTitle === -1 || iAuthor === -1) {
        throw new Error(
          t(
            'settings.data.csvColumns',
            {},
            { defaultValue: 'CSV needs at least Title and Author columns.' },
          ),
        )
      }
      const shelfOf = (raw: string): string => {
        const v = raw.toLowerCase()
        if (v.includes('currently') || v.includes('reading')) return 'reading'
        if (v === 'read' || v.includes('read')) return 'read'
        return 'want_to_read'
      }
      let imported = 0
      let failed = 0
      for (const line of lines.slice(1)) {
        const cells = parseCsvLine(line)
        const title = cells[iTitle]
        const author = cells[iAuthor]
        if (!title || !author) continue
        const pageCount = iPages !== -1 ? Math.max(1, Number(cells[iPages]) || 1) : 1
        const shelf = iShelf !== -1 ? shelfOf(cells[iShelf]) : 'want_to_read'
        try {
          await http.post('/books', { title, author, page_count: pageCount, shelf })
          imported++
        } catch (_error) {
          // Counted as failed below; the loop carries on with the next one.
          failed++
        }
      }
      setImportNote(
        failed > 0
          ? t(
              'settings.data.importDonePartial',
              { imported, failed },
              { defaultValue: 'Imported {{imported}} books · {{failed}} rows skipped.' },
            )
          : t(
              'settings.data.importDone',
              { imported },
              { defaultValue: 'Imported {{imported}} books to your shelves.' },
            ),
      )
    } catch (err) {
      setImportNote(err instanceof Error ? err.message : String(err))
    } finally {
      setImporting(false)
    }
  }

  async function save() {
    if (saving || !me) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {}
      if (name !== (me.name ?? '')) body.name = name
      if (email !== (me.email ?? '')) body.email = email
      body.preferences = prefs
      const res = await http.put('/profile/me', body)
      const updated = unwrapSingle<ProfileMe>(res)
      if (updated) {
        setMe(updated)
        setName(updated.name ?? '')
        setEmail(updated.email ?? '')
        setPrefs({ ...DEFAULT_PREFS, ...(updated.preferences ?? {}) })
      }
      setSavedAt(Date.now())
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.grid({ cols: 12, gap: 'lg' }))}>
      <aside className={cm.cn('col-span-12 md:col-span-3')}>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <nav
          className={cm.cn('space-y-1')}
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
        >
          {SECTIONS.map((s) => {
            const isActive = section === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block w-full text-left rounded-md',
                  isActive
                    ? cm.cn('bg-primary-container', cm.textPrimary)
                    : cm.cn(
                        'text-on-surface-variant',
                        'hover:bg-surface-container hover:text-on-surface',
                      ),
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(`settings.section.${s}`, {}, { defaultValue: SECTION_LABELS[s] })}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className={cm.cn('col-span-12 md:col-span-9 space-y-4')}>
        {loading ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t('settings.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : !me ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>
            {error ?? 'Failed to load profile.'}
          </p>
        ) : (
          <>
            {section === 'account' && (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.account', {}, { defaultValue: 'Account' })}
                </h2>
                <Field
                  label={t('form.displayName', {}, { defaultValue: 'Display name' })}
                  value={name}
                  onChange={setName}
                />
                <Field
                  label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  value={email}
                  onChange={setEmail}
                  type="email"
                  disabled
                />
                <Field
                  label={t('form.timezone', {}, { defaultValue: 'Timezone' })}
                  value={prefs.timezone ?? ''}
                  onChange={(v) => setPrefs((p) => ({ ...p, timezone: v || null }))}
                />
                <TextArea
                  label={t('form.bio', {}, { defaultValue: 'Bio' })}
                  value={prefs.bio}
                  onChange={(v) => setPrefs((p) => ({ ...p, bio: v }))}
                />
              </section>
            )}

            {section === 'reminders' && (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.reminders.heading', {}, { defaultValue: 'Reminders' })}
                </h2>
                <div className={cm.cn(cm.sp('pb', 3), 'border-b border-outline-variant')}>
                  <Toggle
                    label={t(
                      'settings.pushNotifications',
                      {},
                      { defaultValue: 'Enable push notifications on this device' },
                    )}
                    checked={pushEnabled}
                    onChange={handlePushToggle}
                  />
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mt', 1),
                      cm.sp('pl', 6),
                      'text-on-surface-variant',
                    )}
                  >
                    {t(
                      'settings.pushNotificationsHint',
                      {},
                      {
                        defaultValue: 'Allow this browser to receive the reminders selected below.',
                      },
                    )}
                  </p>
                </div>
                <Toggle
                  label={t(
                    'settings.reminders.daily',
                    {},
                    { defaultValue: 'Daily reading reminder (8:00pm)' },
                  )}
                  checked={prefs.remindDaily}
                  onChange={(v) => setPrefs((p) => ({ ...p, remindDaily: v }))}
                />
                <Toggle
                  label={t(
                    'settings.reminders.stalled',
                    {},
                    { defaultValue: 'Stalled-book nudge (nothing logged for 5 days)' },
                  )}
                  checked={prefs.remindStalled}
                  onChange={(v) => setPrefs((p) => ({ ...p, remindStalled: v }))}
                />
                <Toggle
                  label={t(
                    'settings.reminders.weekly',
                    {},
                    { defaultValue: 'Weekly pages summary (Sunday evenings)' },
                  )}
                  checked={prefs.remindWeekly}
                  onChange={(v) => setPrefs((p) => ({ ...p, remindWeekly: v }))}
                />
                <Toggle
                  label={t(
                    'settings.reminders.challenge',
                    {},
                    { defaultValue: 'Challenge milestones' },
                  )}
                  checked={prefs.remindChallenge}
                  onChange={(v) => setPrefs((p) => ({ ...p, remindChallenge: v }))}
                />
                {/* Lending circle prompts — seasonal, courteous loan check-ins */}
                <div
                  className={cm.cn(
                    cm.flex({ align: 'start', justify: 'between', gap: 'sm' }),
                    cm.sp('p', 4),
                    'bg-surface-container-low rounded-lg border border-outline-variant',
                  )}
                >
                  <div className={cm.sp('pr', 4)}>
                    <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
                      <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                        {t(
                          'settings.reminders.lendingTitle',
                          {},
                          { defaultValue: 'Lending Circle Prompts' },
                        )}
                      </h3>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-fixed">
                        {t(
                          'settings.reminders.lendingChip',
                          {},
                          { defaultValue: 'Courteous by design' },
                        )}
                      </span>
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        cm.sp('mt', 1),
                      )}
                    >
                      {t(
                        'settings.reminders.lendingBody',
                        {},
                        {
                          defaultValue:
                            'Seasonal, gentle check-in prompts about volumes you lent to friends — never a demand for their return.',
                        },
                      )}
                    </p>
                  </div>
                  <label
                    className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}
                  >
                    <input
                      type="checkbox"
                      checked={prefs.remindLending}
                      onChange={(e) => setPrefs((p) => ({ ...p, remindLending: e.target.checked }))}
                      aria-label={t(
                        'settings.reminders.lendingTitle',
                        {},
                        { defaultValue: 'Lending Circle Prompts' },
                      )}
                      className={cm.cn(cm.h(4), cm.w(4))}
                    />
                  </label>
                </div>
                {/* Zero red badges — the standing policy */}
                <div
                  className={cm.cn(
                    cm.flex({ align: 'start', justify: 'between', gap: 'sm' }),
                    cm.sp('p', 4),
                    'bg-surface-container-low rounded-lg border border-outline-variant',
                  )}
                >
                  <div>
                    <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                      {t(
                        'settings.reminders.redBadgesTitle',
                        {},
                        { defaultValue: 'Zero Red Badges Policy' },
                      )}
                    </h3>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        cm.sp('mt', 1),
                      )}
                    >
                      {t(
                        'settings.reminders.redBadgesBody',
                        {},
                        {
                          defaultValue:
                            'This app will never render crimson notification counters, push alarms, or streak-shaming pings.',
                        },
                      )}
                    </p>
                  </div>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 1.5 }),
                      cm.textSize('xs'),
                      'text-secondary shrink-0',
                      cm.sp('pt', 1),
                    )}
                  >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">
                      check_circle
                    </span>
                    <span>
                      {t(
                        'settings.reminders.redBadgesChip',
                        {},
                        { defaultValue: 'Enforced by the app itself' },
                      )}
                    </span>
                  </span>
                </div>
              </section>
            )}

            {section === 'language' && (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'common.chooseTheLanguage',
                    {},
                    { defaultValue: 'Choose the language used throughout the app.' },
                  )}
                </p>
                <LanguagePicker />
              </section>
            )}

            {section === 'reading' && (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.reading.heading', {}, { defaultValue: 'Reading rules' })}
                </h2>
                <label className="block">
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'block',
                      cm.sp('mb', 1),
                    )}
                  >
                    {t('settings.reading.startOfWeek', {}, { defaultValue: 'Start of week' })}
                  </span>
                  <select
                    value={prefs.startOfWeek}
                    onChange={(e) =>
                      setPrefs((p) => ({
                        ...p,
                        startOfWeek: e.target.value as Prefs['startOfWeek'],
                      }))
                    }
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'w-full border border-outline-variant rounded-md',
                    )}
                  >
                    <option value="monday">
                      {t('settings.reading.monday', {}, { defaultValue: 'Monday' })}
                    </option>
                    <option value="sunday">
                      {t('settings.reading.sunday', {}, { defaultValue: 'Sunday' })}
                    </option>
                  </select>
                </label>
                <Field
                  label={t(
                    'settings.reading.dailyGoalPages',
                    {},
                    { defaultValue: 'Daily page goal' },
                  )}
                  type="number"
                  value={String(prefs.dailyGoalPages)}
                  onChange={(v) =>
                    setPrefs((p) => ({
                      ...p,
                      dailyGoalPages: Math.max(0, Math.min(2000, Number(v) || 0)),
                    }))
                  }
                />
                <Toggle
                  label={t(
                    'settings.reading.countDnf',
                    {},
                    { defaultValue: 'Count did-not-finish books in stats' },
                  )}
                  checked={prefs.countDnfInStats}
                  onChange={(v) => setPrefs((p) => ({ ...p, countDnfInStats: v }))}
                />
                {/* Cadence unit & horizon — contemplative pacing, not speedometers */}
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    'bg-surface-container-low rounded-xl border border-outline-variant',
                  )}
                >
                  <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-primary')}>
                    {t(
                      'settings.reading.cadenceTitle',
                      {},
                      { defaultValue: 'Cadence Unit & Horizon' },
                    )}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}
                  >
                    {t(
                      'settings.reading.cadenceBody',
                      {},
                      {
                        defaultValue:
                          'Replace sterile speedometers with contemplative temporal horizons.',
                      },
                    )}
                  </p>
                  <label className="block">
                    <span className="sr-only">
                      {t(
                        'settings.reading.cadenceTitle',
                        {},
                        { defaultValue: 'Cadence Unit & Horizon' },
                      )}
                    </span>
                    <select
                      value={prefs.cadenceUnit}
                      onChange={(e) =>
                        setPrefs((p) => ({
                          ...p,
                          cadenceUnit: e.target.value as Prefs['cadenceUnit'],
                        }))
                      }
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.sp('mt', 2),
                        'w-full border border-outline-variant rounded-md bg-surface text-on-surface',
                      )}
                    >
                      {CADENCE_UNIT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {t(
                            `settings.reading.cadenceOption.${o.value}`,
                            {},
                            { defaultValue: o.label },
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {/* Guilt-free pause threshold */}
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    'bg-surface-container-low rounded-xl border border-outline-variant',
                  )}
                >
                  <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-primary')}>
                    {t(
                      'settings.reading.pauseTitle',
                      {},
                      { defaultValue: 'Guilt-Free Pause Threshold' },
                    )}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}
                  >
                    {t(
                      'settings.reading.pauseBody',
                      {},
                      {
                        defaultValue:
                          'Dormant days before an open book is gracefully offered rest — without lowering your pace.',
                      },
                    )}
                  </p>
                  <label className="block">
                    <span className="sr-only">
                      {t(
                        'settings.reading.pauseTitle',
                        {},
                        { defaultValue: 'Guilt-Free Pause Threshold' },
                      )}
                    </span>
                    <select
                      value={prefs.pauseThresholdDays}
                      onChange={(e) =>
                        setPrefs((p) => ({
                          ...p,
                          pauseThresholdDays: Number(e.target.value) || 14,
                        }))
                      }
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.sp('mt', 2),
                        'w-full border border-outline-variant rounded-md bg-surface text-on-surface',
                      )}
                    >
                      {PAUSE_THRESHOLD_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {t(
                            `settings.reading.pauseOption.${o.value}`,
                            {},
                            { defaultValue: o.label },
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
            )}

            {section === 'appearance' && (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.appearance.description',
                    {},
                    { defaultValue: 'Toggle between light and dark mode.' },
                  )}
                </p>
                <ThemeToggle />
              </section>
            )}

            {section === 'hardware' && (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
                <div>
                  <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                    {t(
                      'settings.hardware.heading',
                      {},
                      { defaultValue: '4. Connected Hardware & Physical Ledgers' },
                    )}
                  </h2>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}
                  >
                    {t(
                      'settings.hardware.sub',
                      {},
                      {
                        defaultValue:
                          'Bridging the tactile desk, archival notebooks, and distraction-free e-ink screens.',
                      },
                    )}
                  </p>
                </div>
                <div className={cm.grid({ cols: 3, gap: 'md' })}>
                  {HARDWARE_CARDS.map((card) => (
                    <div
                      key={card.key}
                      className={cm.cn(
                        cm.sp('p', 4),
                        'border border-outline-variant rounded-lg bg-surface flex flex-col justify-between',
                      )}
                    >
                      <div>
                        <div className={cm.flex({ align: 'center', justify: 'between' })}>
                          <span
                            className="material-symbols-outlined text-primary text-xl"
                            aria-hidden="true"
                          >
                            {card.icon}
                          </span>
                          <span
                            className={cm.cn(
                              cm.sp('px', 2),
                              cm.sp('py', 1),
                              cm.textSize('xs'),
                              'rounded bg-surface-container text-on-surface-variant',
                            )}
                          >
                            {t(
                              `settings.hardware.chip.${card.key}`,
                              {},
                              { defaultValue: card.chip },
                            )}
                          </span>
                        </div>
                        <h3
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('bold'),
                            'text-primary',
                            cm.sp('mt', 2),
                          )}
                        >
                          {t(
                            `settings.hardware.title.${card.key}`,
                            {},
                            { defaultValue: card.title },
                          )}
                        </h3>
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant',
                            cm.sp('mt', 1),
                          )}
                        >
                          {t(`settings.hardware.body.${card.key}`, {}, { defaultValue: card.body })}
                        </p>
                      </div>
                      <div
                        className={cm.cn(
                          cm.sp('mt', 3),
                          cm.sp('pt', 2),
                          'border-t border-outline-variant flex items-center justify-between',
                        )}
                      >
                        <span className={cm.cn(cm.textSize('xs'), 'text-secondary')}>
                          {t(
                            `settings.hardware.status.${card.key}`,
                            {},
                            { defaultValue: card.status },
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {section === 'data' && (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
                <div>
                  <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                    {t(
                      'settings.data.heading',
                      {},
                      { defaultValue: '5. Data Sovereignty & Archive Portability' },
                    )}
                  </h2>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}
                  >
                    {t(
                      'settings.data.sub',
                      {},
                      {
                        defaultValue:
                          'Your thoughts belong to you in plain text. No platform lock-in, zero algorithmic harvesting.',
                      },
                    )}
                  </p>
                </div>
                <div className={cm.grid({ cols: 2, gap: 'md' })}>
                  {/* Export complete archive — real JSON download */}
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      'border border-outline-variant rounded-lg bg-surface flex flex-col justify-between',
                    )}
                  >
                    <div>
                      <h3
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'sm' }),
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                        )}
                      >
                        <span className="material-symbols-outlined text-base" aria-hidden="true">
                          download_for_offline
                        </span>
                        {t(
                          'settings.data.exportTitle',
                          {},
                          { defaultValue: 'Export Complete Archive' },
                        )}
                      </h3>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          cm.sp('mt', 1),
                        )}
                      >
                        {t(
                          'settings.data.exportBody',
                          {},
                          {
                            defaultValue:
                              'Download every book log, review, and challenge record as standard JSON you can keep forever.',
                          },
                        )}
                      </p>
                    </div>
                    <div className={cm.sp('mt', 3)}>
                      <button
                        type="button"
                        onClick={() => void exportArchive()}
                        disabled={exporting}
                        data-mol-id="settings-export-archive"
                        className="w-full border border-outline-variant hover:border-primary text-primary px-3 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-base" aria-hidden="true">
                          archive
                        </span>
                        {exporting
                          ? t('settings.data.exporting', {}, { defaultValue: 'Gathering…' })
                          : t(
                              'settings.data.exportCta',
                              {},
                              { defaultValue: 'Download reading archive' },
                            )}
                      </button>
                      {exportNote ? (
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant',
                            cm.sp('mt', 2),
                          )}
                          role="status"
                          data-testid="settings-export-note"
                        >
                          {exportNote}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {/* Legacy migration — real CSV import */}
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      'border border-outline-variant rounded-lg bg-surface flex flex-col justify-between',
                    )}
                  >
                    <div>
                      <h3
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'sm' }),
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                        )}
                      >
                        <span className="material-symbols-outlined text-base" aria-hidden="true">
                          publish
                        </span>
                        {t(
                          'settings.data.importTitle',
                          {},
                          { defaultValue: 'Legacy Migration Tool' },
                        )}
                      </h3>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          cm.sp('mt', 1),
                        )}
                      >
                        {t(
                          'settings.data.importBody',
                          {},
                          {
                            defaultValue:
                              'Bring a Goodreads / StoryGraph-style CSV ledger — Title, Author, Pages, Shelf — and move your history over cleanly.',
                          },
                        )}
                      </p>
                    </div>
                    <div className={cm.sp('mt', 3)}>
                      <label className="w-full bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface px-3 py-2 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                        <span className="material-symbols-outlined text-base" aria-hidden="true">
                          file_upload
                        </span>
                        {importing
                          ? t('settings.data.importing', {}, { defaultValue: 'Importing…' })
                          : t(
                              'settings.data.importCta',
                              {},
                              { defaultValue: 'Upload reading CSV ledger' },
                            )}
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          disabled={importing}
                          data-mol-id="settings-import-csv-input"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) void importLegacyCsv(file)
                            e.target.value = ''
                          }}
                        />
                      </label>
                      {importNote ? (
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant',
                            cm.sp('mt', 2),
                          )}
                          role="status"
                          data-testid="settings-import-note"
                        >
                          {importNote}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-secondary-container/40 border border-secondary-container rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      className="material-symbols-outlined text-secondary text-2xl"
                      aria-hidden="true"
                    >
                      workspace_premium
                    </span>
                    <div>
                      <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                        {t('settings.data.accountTitle', {}, { defaultValue: 'Account status' })}
                      </h3>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'settings.data.accountBody',
                          { plan: me.planKey === 'free' ? 'Free reader' : me.planKey },
                          {
                            defaultValue:
                              'Current plan: {{plan}} — your archive stays exportable at any moment.',
                          },
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {section === 'security' && (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-6')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.security.heading', {}, { defaultValue: 'Account & security' })}
                </h2>

                {!isOAuth && (
                  <div className={cm.cn('space-y-2')}>
                    <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {t('settings.password', {}, { defaultValue: 'Password' })}
                    </h3>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(
                        'settings.passwordHint',
                        {},
                        { defaultValue: 'Update the password you use to sign in.' },
                      )}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setShowPwModal(true)}>
                      {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
                    </Button>
                  </div>
                )}

                <div
                  className={cm.cn('space-y-2', cm.sp('pt', 4), 'border-t border-outline-variant')}
                >
                  <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t('settings.devices', {}, { defaultValue: 'Devices' })}
                  </h3>
                  {devicesLoading ? (
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                    </p>
                  ) : devices.length === 0 ? (
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t('settings.noDevices', {}, { defaultValue: 'No devices registered yet.' })}
                    </p>
                  ) : (
                    <ul className={cm.cn('space-y-2')}>
                      {devices.map((device) => {
                        const isConfirming = confirmingDeviceId === device.id
                        const isRevoking = revokingDeviceId === device.id
                        const deviceLabel =
                          device.name ||
                          device.pushPlatform ||
                          t('settings.unnamedDevice', {}, { defaultValue: 'Device' })
                        return (
                          <li
                            key={device.id}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 2),
                              cm.textSize('sm'),
                              'rounded-md bg-surface-container',
                            )}
                          >
                            <div
                              className={cm.flex({
                                align: 'center',
                                gap: 'sm',
                                justify: 'between',
                              })}
                            >
                              <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                                <span className="material-symbols-outlined text-on-surface-variant text-base">
                                  devices
                                </span>
                                <span className={cm.fontWeight('medium')}>{deviceLabel}</span>
                                {device.isCurrent ? (
                                  <span
                                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                                  >
                                    {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
                                  </span>
                                ) : null}
                              </span>
                              {device.isCurrent ? null : isConfirming ? (
                                <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isRevoking}
                                    onClick={() => setConfirmingDeviceId(null)}
                                  >
                                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                                  </Button>
                                  <Button
                                    color="error"
                                    size="sm"
                                    loading={isRevoking}
                                    onClick={() => revokeDevice(device.id)}
                                    data-testid="device-revoke-confirm"
                                  >
                                    {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                                  </Button>
                                </span>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmingDeviceId(device.id)}
                                  data-testid="device-revoke"
                                >
                                  {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                                </Button>
                              )}
                            </div>
                            {isConfirming && !device.isCurrent ? (
                              <p
                                className={cm.cn(
                                  cm.textSize('xs'),
                                  cm.sp('mt', 1),
                                  'text-on-surface-variant',
                                )}
                              >
                                {t(
                                  'settings.revokeDeviceWarning',
                                  {},
                                  {
                                    defaultValue:
                                      "This device's access will be revoked shortly. Sign it out?",
                                  },
                                )}
                              </p>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                <div
                  className={cm.cn('space-y-2', cm.sp('pt', 4), 'border-t border-outline-variant')}
                >
                  <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-error')}>
                    {t('settings.dangerZone', {}, { defaultValue: 'Danger zone' })}
                  </h3>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'settings.deleteAccountModal.warning',
                      {},
                      {
                        defaultValue:
                          'Deleting your account permanently removes your shelves, reviews, and reading history. This cannot be undone.',
                      },
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    data-testid="settings-delete-account"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'rounded-md border border-error text-error hover:bg-error hover:text-on-error',
                    )}
                  >
                    {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
                  </button>
                </div>
              </section>
            )}

            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 4))}>
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saving}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-md bg-primary text-on-primary disabled:opacity-50',
                )}
                data-testid="settings-save"
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
              {error ? (
                <span className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</span>
              ) : savedAt ? (
                <span
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                  data-testid="settings-saved"
                >
                  {t('common.saved', {}, { defaultValue: 'Saved' })}
                </span>
              ) : null}
            </div>
          </>
        )}
      </main>

      <Modal
        open={showPwModal}
        onClose={() => {
          setShowPwModal(false)
          resetChangePassword()
        }}
        title={t('settings.changePasswordModal.title', {}, { defaultValue: 'Change password' })}
      >
        {pwError && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {pwError.message ||
              t(
                'settings.changePasswordModal.error',
                {},
                { defaultValue: 'Password could not be changed.' },
              )}
          </Alert>
        )}
        <form onSubmit={handleChangePassword} className={cm.cn('space-y-4')}>
          <div>
            <label
              htmlFor="settings-current-pw"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t(
                'settings.changePasswordModal.currentPassword',
                {},
                { defaultValue: 'Current password' },
              )}
            </label>
            <Input
              id="settings-current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label
              htmlFor="settings-new-pw"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t('settings.changePasswordModal.newPassword', {}, { defaultValue: 'New password' })}
            </label>
            <Input
              id="settings-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" fullWidth loading={pwStatus === 'pending'}>
            {pwStatus === 'pending'
              ? t('settings.changePasswordModal.changing', {}, { defaultValue: 'Changing…' })
              : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </form>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete account' })}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
          {t(
            'settings.deleteAccountModal.warning',
            {},
            {
              defaultValue:
                'Deleting your account permanently removes your shelves, reviews, and reading history. This cannot be undone.',
            },
          )}
        </p>
        {deleteError && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {deleteError}
          </Alert>
        )}
        <form onSubmit={handleDeleteAccount} className={cm.cn('space-y-4')}>
          <div>
            <label
              htmlFor="settings-delete-pw"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t(
                'settings.deleteAccountModal.password',
                {},
                { defaultValue: 'Confirm your password' },
              )}
            </label>
            <Input
              id="settings-delete-pw"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword((e.target as HTMLInputElement).value)}
              required
            />
          </div>
          <Button type="submit" color="error" fullWidth loading={deleting}>
            {deleting
              ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
              : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  disabled?: boolean
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md disabled:opacity-50',
        )}
      />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md resize-none',
        )}
      />
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cm.cn(cm.h(4), cm.w(4))}
      />
      <span className={cm.cn(cm.textSize('sm'))}>{label}</span>
    </label>
  )
}
