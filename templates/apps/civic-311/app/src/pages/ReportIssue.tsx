import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CITY_NAME } from '../branding.js'
import MiniMap from '../components/MiniMap.js'
import SideNavBar from '../components/SideNavBar.js'
import { PageHeader } from '../components/StatusBadge.js'
import { deriveAddress } from '../lib/geo.js'
import { categoryIcon, ISSUE_CATEGORIES, type IssueCategory } from '../lib/issues.js'

interface DuplicateCandidate {
  id: string
  category: string
  description: string
  derived_address: string
  status: string
  distance_blocks: number
  confirmation_count: number
}

/**
 * ReportIssue — the signature flow. Category picker → description → photo
 * upload → map pin → duplicate suggestions → submit anyway. The address
 * preview next to the pin uses the same deterministic derivation the API
 * persists server-side (lib/geo.ts is the contract).
 */
export function ReportIssuePage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [category, setCategory] = useState<IssueCategory | ''>('')
  const [description, setDescription] = useState('')
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([])
  const [dupAcknowledged, setDupAcknowledged] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = t(
      'reportIssue.pageTitle',
      { city: CITY_NAME },
      { defaultValue: 'Report an issue — {{city}} 311' },
    )
  }, [t])

  const addressPreview = pin ? deriveAddress(pin.x, pin.y) : null

  // Duplicate detection re-runs whenever the draft becomes complete
  // (category + pin) — the same category+radius rule the API applies.
  const checkDuplicates = useCallback(async () => {
    if (!category || !pin) {
      setDuplicates([])
      setDupAcknowledged(false)
      return
    }
    try {
      const res = await http.get(
        `/api/issues/duplicates?category=${encodeURIComponent(category)}&x=${pin.x}&y=${pin.y}`,
      )
      const raw = Array.isArray(res)
        ? (res as DuplicateCandidate[])
        : Array.isArray((res as { data?: unknown })?.data)
          ? (res as { data: DuplicateCandidate[] }).data
          : []
      setDuplicates(raw)
      setDupAcknowledged(false)
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      // Duplicate detection is advisory — a failed check must not block
      // reporting the issue.
      setDuplicates([])
      setDupAcknowledged(true)
    }
  }, [category, pin, http])

  useEffect(() => {
    void checkDuplicates()
  }, [checkDuplicates])

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('photo', file)
      const res = await http.post<{ url?: string }>('/api/issues/photo', form)
      const url = (res as { url?: string })?.url
      if (url) {
        setPhotoUrl(url)
        setPhotoName(file.name)
      }
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setError(
        err instanceof Error && err.message
          ? err.message
          : t('reportIssue.photoError', {}, { defaultValue: 'Could not upload photo. Try again.' }),
      )
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!category || !description.trim() || !pin || submitting) return
    if (duplicates.length > 0 && !dupAcknowledged) return
    setSubmitting(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        category,
        description: description.trim(),
        x: pin.x,
        y: pin.y,
      }
      if (photoUrl) payload.photo_url = photoUrl
      const res = await http.post<unknown>('/api/issues', payload)
      const o = res as { id?: string; data?: { id?: string } }
      const id = o?.id ?? o?.data?.id
      if (id) {
        navigate(`/reports/${id}`)
        return
      }
      navigate('/my-reports')
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      const message =
        err instanceof Error && err.message
          ? err.message
          : t('reportIssue.error', {}, { defaultValue: 'Could not submit report. Try again.' })
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const ready = Boolean(category && description.trim() && pin)
  const blockedByDuplicates = duplicates.length > 0 && !dupAcknowledged

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface')}>
      <div className={cm.cn(cm.flex(), cm.minH('screen'))}>
        <SideNavBar />
        <main className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0 ml-[240px]')}>
          <div
            className={cm.cn(cm.sp('p', 8), cm.maxW('3xl'), cm.mxAuto, cm.w('full'), cm.stack(6))}
          >
            <PageHeader
              molId="report-issue-title"
              title={t(
                'reportIssue.title',
                { city: CITY_NAME },
                { defaultValue: 'Report an issue' },
              )}
              subtitle={t(
                'reportIssue.subtitle',
                { city: CITY_NAME },
                {
                  defaultValue:
                    'Tell {{city}} what broke. Pick a category, add a photo if you have one, and drop a pin where it is.',
                },
              )}
            />

            {error && (
              <div
                role="alert"
                data-mol-id="report-issue-error"
                className={cm.cn(
                  cm.sp('p', 4),
                  'rounded-lg bg-error-container text-on-error-container',
                )}
              >
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{error}</p>
              </div>
            )}

            <form data-mol-id="report-issue-form" className={cm.stack(6)} onSubmit={handleSubmit}>
              {/* 1. Category */}
              <fieldset className={cm.stack(3)}>
                <legend
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.sp('pb', 2))}
                >
                  {t('reportIssue.categoryLabel', {}, { defaultValue: 'What is it?' })}
                </legend>
                <div
                  role="radiogroup"
                  aria-label={t('reportIssue.categoryLabel', {}, { defaultValue: 'What is it?' })}
                  className={cm.cn(cm.flex({ wrap: 'wrap', gap: 3 }))}
                >
                  {ISSUE_CATEGORIES.map((c) => {
                    const selected = category === c
                    return (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        data-mol-id={`report-category-${c}`}
                        data-selected={selected}
                        onClick={() => setCategory(c)}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 2 }),
                          cm.sp('px', 4),
                          'rounded-lg border py-2 text-sm font-medium transition-colors',
                          selected
                            ? 'border-primary bg-primary-container/30 text-primary'
                            : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
                        )}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ color: `var(--color-cat-${c})` }}
                          aria-hidden
                        >
                          {categoryIcon(c)}
                        </span>
                        {t(`category.${c}`, {}, { defaultValue: categoryDefaultLabel(c) })}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {/* 2. Description */}
              <div className={cm.stack(2)}>
                <label
                  htmlFor="report-description"
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                >
                  {t('reportIssue.descriptionLabel', {}, { defaultValue: 'Describe it' })}
                </label>
                <textarea
                  id="report-description"
                  data-mol-id="report-description"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'w-full min-h-[120px] rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary',
                  )}
                  required
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t(
                    'reportIssue.descriptionPlaceholder',
                    {},
                    {
                      defaultValue:
                        'What happened, how long has it been there, anything unsafe about it…',
                    },
                  )}
                />
              </div>

              {/* 3. Photo */}
              <div className={cm.stack(2)}>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {t('reportIssue.photoLabel', {}, { defaultValue: 'Photo (optional)' })}
                </span>
                <input
                  ref={fileInputRef}
                  id="report-photo"
                  data-mol-id="report-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                  onChange={handlePhoto}
                  disabled={uploading}
                />
                {uploading && (
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('reportIssue.uploading', {}, { defaultValue: 'Uploading…' })}
                  </p>
                )}
                {photoUrl && !uploading && (
                  <p
                    data-mol-id="report-photo-attached"
                    className={cm.cn(cm.textSize('xs'), 'text-primary')}
                  >
                    {t(
                      'reportIssue.photoAttached',
                      { name: photoName ?? '' },
                      { defaultValue: 'Attached: {{name}}' },
                    )}
                  </p>
                )}
              </div>

              {/* 4. Map pin */}
              <div className={cm.stack(2)}>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {t(
                    'reportIssue.pinLabel',
                    { city: CITY_NAME },
                    { defaultValue: 'Where is it? Pin it on the {{city}} grid.' },
                  )}
                </span>
                <div className={cm.cn(cm.flex({ gap: 4 }), 'flex-wrap')}>
                  <div className={cm.cn(cm.flex1, 'min-w-[280px]')}>
                    <MiniMap
                      data-mol-id="report-map"
                      activePin={pin}
                      onPick={(x, y) => setPin({ x, y })}
                    />
                  </div>
                  <div
                    data-mol-id="report-address-preview"
                    className={cm.cn(
                      cm.stack(2),
                      cm.sp('p', 4),
                      'min-w-[180px] rounded-lg bg-surface-container-low self-start',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'font-semibold uppercase tracking-wide text-on-surface-variant',
                      )}
                    >
                      {t('reportIssue.addressPreview', {}, { defaultValue: 'Nearest address' })}
                    </span>
                    {addressPreview ? (
                      <span
                        data-mol-id="report-address-value"
                        className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
                      >
                        {addressPreview}
                      </span>
                    ) : (
                      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {t(
                          'reportIssue.noPin',
                          {},
                          { defaultValue: 'Click the map (or use arrow keys) to place a pin.' },
                        )}
                      </span>
                    )}
                    {pin && (
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'reportIssue.pinCoords',
                          { x: pin.x, y: pin.y },
                          { defaultValue: 'grid {{x}}, {{y}}' },
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. Duplicate suggestions */}
              {duplicates.length > 0 && (
                <section
                  data-mol-id="report-duplicates"
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.stack(3),
                    'rounded-lg bg-tertiary-container/40 border border-tertiary-container',
                  )}
                >
                  <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                    {t(
                      'reportIssue.duplicatesTitle',
                      { count: duplicates.length },
                      {
                        defaultValue:
                          'Looks like this may already be reported — {{count}} open report(s) of the same kind within 5 blocks',
                      },
                    )}
                  </h2>
                  <ul className={cm.stack(2)}>
                    {duplicates.map((d) => (
                      <li
                        key={d.id}
                        data-mol-id="report-duplicate-item"
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between', gap: 3 }),
                          cm.sp('p', 3),
                          'rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-sm',
                        )}
                      >
                        <span className={cm.stack(1)}>
                          <span className="font-medium">
                            {d.derived_address} ·{' '}
                            {t(
                              'reportIssue.blocksAway',
                              { blocks: d.distance_blocks },
                              { defaultValue: '{{blocks}} blocks away' },
                            )}
                          </span>
                          <span className="text-on-surface-variant line-clamp-2">
                            {d.description}
                          </span>
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'whitespace-nowrap text-on-surface-variant',
                          )}
                        >
                          {t(
                            'reportIssue.confirmations',
                            { count: d.confirmation_count },
                            { defaultValue: '{{count}} confirmations' },
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <label className={cm.flex({ align: 'center', gap: 2 })}>
                    <input
                      type="checkbox"
                      data-mol-id="report-duplicates-acknowledge"
                      checked={dupAcknowledged}
                      onChange={(e) => setDupAcknowledged(e.target.checked)}
                    />
                    {t(
                      'reportIssue.submitAnyway',
                      {},
                      { defaultValue: 'This is a different issue — submit anyway' },
                    )}
                  </label>
                </section>
              )}

              {/* Actions */}
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 3 }))}>
                <button
                  type="button"
                  data-mol-id="report-cancel"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low',
                  )}
                  onClick={() => navigate('/explore')}
                  disabled={submitting}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  data-mol-id="report-submit"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-lg bg-primary text-on-primary hover:opacity-90 disabled:opacity-50',
                  )}
                  disabled={submitting || !ready || blockedByDuplicates}
                  title={blockedByDuplicates ? 'Acknowledge the duplicate notice first' : undefined}
                >
                  {submitting
                    ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                    : t('reportIssue.submit', {}, { defaultValue: 'Submit report' })}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}

/** English fallbacks for the t(`category.${c}`) keys (typed dynamic keys). */
function categoryDefaultLabel(c: IssueCategory): string {
  switch (c) {
    case 'pothole':
      return 'Pothole'
    case 'streetlight':
      return 'Streetlight'
    case 'graffiti':
      return 'Graffiti'
    case 'trash':
      return 'Trash & dumping'
    case 'tree':
      return 'Tree'
    case 'parking':
      return 'Parking'
    default:
      return 'Other'
  }
}

export default ReportIssuePage
