import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SideNavBar from '../components/SideNavBar.js'

/**
 * IssueEditor — write an issue: subject + preview text + markdown body, with
 * save-draft / schedule / publish actions. Publishing fans delivery out to
 * every subscribed subscriber server-side (the sends-table fan-out; no real
 * email is sent by this template — see the API's _deliver.ts for the
 * emails-bond integration point).
 */
function IssueEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id: routeId } = useParams<{ id: string }>()
  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [bodyMd, setBodyMd] = useState('')
  const [issueId, setIssueId] = useState<string | null>(routeId ?? null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [scheduleAt, setScheduleAt] = useState('')
  const http = useHttpClient()
  const navigate = useNavigate()

  // Hydrate when navigated to via /issues/:id/edit so users can actually
  // update existing issues (without this, the form starts empty and "Save
  // Draft" creates a duplicate).
  useEffect(() => {
    if (!routeId) return
    let active = true
    setLoading(true)
    http
      .get(`/api/issues/${routeId}`)
      .then((res: unknown) => {
        if (!active) return
        const r = res as { data?: Record<string, unknown> } | Record<string, unknown> | null
        const row = (r && typeof r === 'object' && 'data' in r ? r.data : r) as Record<
          string,
          unknown
        > | null
        if (!row) return
        setIssueId((row.id as string) ?? routeId)
        setSubject((row.subject as string) ?? '')
        setPreviewText((row.preview_text as string) ?? '')
        setBodyMd((row.body_md as string) ?? '')
        setStatus((row.status as string) ?? null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(
          err instanceof Error
            ? err.message
            : t('issueEditor.loadFailed', {}, { defaultValue: 'Failed to load issue' }),
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [routeId, http, t])

  async function persistAsDraft(): Promise<void> {
    if (issueId) {
      await http.put(`/api/issues/${issueId}`, {
        subject,
        preview_text: previewText,
        body_md: bodyMd,
      })
    } else {
      const res = await http.post('/api/issues', {
        subject,
        preview_text: previewText,
        body_md: bodyMd,
        status: 'draft',
      })
      const payload =
        res && typeof res === 'object' ? (res as { data?: { id?: string }; id?: string }) : null
      const newId = payload?.data?.id ?? payload?.id
      if (newId) setIssueId(newId)
    }
    setStatus('draft')
    setSavedAt(new Date().toLocaleTimeString())
  }

  async function handleSaveDraft() {
    if (!subject.trim()) {
      setError(t('issueEditor.subjectRequired', {}, { defaultValue: 'Write a subject first.' }))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await persistAsDraft()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('issueEditor.saveFailed', {}, { defaultValue: 'Save failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  async function handlePublish() {
    if (!subject.trim()) {
      setError(t('issueEditor.subjectRequired', {}, { defaultValue: 'Write a subject first.' }))
      return
    }
    setLoading(true)
    setError(null)
    try {
      // If we already have an issueId (loaded from /issues/:id/edit OR a
      // previously-saved draft) update it and publish through the dedicated
      // route so delivery fan-out happens server-side. Otherwise create +
      // publish in one shot via the status=published payload.
      if (issueId) {
        await http.put(`/api/issues/${issueId}`, {
          subject,
          preview_text: previewText,
          body_md: bodyMd,
        })
        await http.post(`/api/issues/${issueId}/publish`)
      } else {
        const res = await http.post('/api/issues', {
          subject,
          preview_text: previewText,
          body_md: bodyMd,
          status: 'published',
        })
        const payload =
          res && typeof res === 'object' ? (res as { data?: { id?: string }; id?: string }) : null
        const newId = payload?.data?.id ?? payload?.id
        if (newId) setIssueId(newId)
      }
      navigate('/issues')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('issueEditor.publishFailed', {}, { defaultValue: 'Publish failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleSchedule() {
    if (!issueId) {
      setError(
        t(
          'issueEditor.saveBeforeSchedule',
          {},
          { defaultValue: 'Save the draft before scheduling.' },
        ),
      )
      return
    }
    if (!scheduleAt) {
      setError(t('issueEditor.pickTime', {}, { defaultValue: 'Pick a send time first.' }))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await http.put(`/api/issues/${issueId}`, {
        subject,
        preview_text: previewText,
        body_md: bodyMd,
      })
      await http.post(`/api/issues/${issueId}/schedule`, {
        publish_at: new Date(scheduleAt).toISOString(),
      })
      navigate('/issues')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('issueEditor.scheduleFailed', {}, { defaultValue: 'Schedule failed' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <SideNavBar />
      <main
        aria-label={t('issueEditor.title', {}, { defaultValue: 'Issue editor' })}
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center' }),
          cm.sp('px', 6),
          'ml-[240px] pt-24 pb-24',
        )}
      >
        <div className={cm.cn(cm.w('full'), 'max-w-[720px]', cm.stack(8))}>
          {/* Header + actions */}
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
            <div>
              <h2
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('bold'),
                  "font-['Newsreader'] text-on-background",
                )}
              >
                {routeId
                  ? t('issueEditor.editing', {}, { defaultValue: 'Edit issue' })
                  : t('issueEditor.newIssue', {}, { defaultValue: 'New issue' })}
              </h2>
              {status && (
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(`issues.status_${status}`, {}, { defaultValue: status })}
                  {savedAt
                    ? t(
                        'issueEditor.savedAt',
                        { time: savedAt },
                        { defaultValue: ' · saved {{time}}' },
                      )
                    : ''}
                </p>
              )}
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <button
                type="button"
                data-mol-id="issue-editor-save-draft"
                disabled={loading}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'bg-surface-container text-on-surface hover:bg-surface-container-high disabled:opacity-50',
                )}
                onClick={() => void handleSaveDraft()}
              >
                {t('issueEditor.saveDraft', {}, { defaultValue: 'Save draft' })}
              </button>
              <button
                type="button"
                data-mol-id="issue-editor-publish"
                disabled={loading}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.roundedFull,
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50',
                )}
                onClick={() => void handlePublish()}
              >
                {t('issueEditor.publish', {}, { defaultValue: 'Publish' })}
              </button>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="issue-subject" className="sr-only">
              {t('issueEditor.subjectLabel', {}, { defaultValue: 'Subject' })}
            </label>
            <input
              id="issue-subject"
              type="text"
              data-mol-id="issue-editor-subject"
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                "font-['Newsreader']",
                'bg-transparent border-b border-outline-variant focus:border-primary outline-none',
              )}
              placeholder={t(
                'issueEditor.subjectPlaceholder',
                {},
                { defaultValue: 'Issue subject' },
              )}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Preview text */}
          <div>
            <label htmlFor="issue-preview" className="sr-only">
              {t('issueEditor.previewLabel', {}, { defaultValue: 'Preview text' })}
            </label>
            <input
              id="issue-preview"
              type="text"
              data-mol-id="issue-editor-preview"
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'bg-transparent border-b border-outline-variant focus:border-primary outline-none',
              )}
              placeholder={t(
                'issueEditor.previewPlaceholder',
                {},
                { defaultValue: 'Preview text (the line after the subject in the inbox)' },
              )}
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
            />
          </div>

          {/* Markdown body */}
          <div>
            <label htmlFor="issue-body" className="sr-only">
              {t('issueEditor.bodyLabel', {}, { defaultValue: 'Body (markdown)' })}
            </label>
            <textarea
              id="issue-body"
              data-mol-id="issue-editor-body"
              rows={18}
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 6),
                cm.textSize('base'),
                'rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary outline-none leading-relaxed',
              )}
              placeholder={t(
                'issueEditor.bodyPlaceholder',
                {},
                { defaultValue: 'Write the issue in markdown — ## for section headings.' },
              )}
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
            />
          </div>

          {/* Schedule */}
          <div
            data-mol-id="issue-editor-schedule"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('p', 6),
              'rounded-xl bg-surface-container-low',
            )}
          >
            <div className={cm.flex1}>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
                {t('issueEditor.scheduleTitle', {}, { defaultValue: 'Schedule for later' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'issueEditor.scheduleHint',
                  {},
                  {
                    defaultValue:
                      'Saved drafts publish + deliver automatically once the send time passes.',
                  },
                )}
              </p>
            </div>
            <label htmlFor="issue-schedule-at" className="sr-only">
              {t('issueEditor.scheduleAtLabel', {}, { defaultValue: 'Send time' })}
            </label>
            <input
              id="issue-schedule-at"
              type="datetime-local"
              data-mol-id="issue-editor-schedule-at"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg bg-surface-container-lowest border border-outline-variant',
              )}
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
            <button
              type="button"
              data-mol-id="issue-editor-schedule-submit"
              disabled={loading}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'bg-secondary-container text-on-secondary-container hover:opacity-80 disabled:opacity-50',
              )}
              onClick={() => void handleSchedule()}
            >
              {t('issueEditor.schedule', {}, { defaultValue: 'Schedule' })}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-lg bg-error-container text-on-error-container',
                cm.textSize('sm'),
              )}
            >
              {error}
            </div>
          )}
        </div>
      </main>
    </>
  )
}

export default IssueEditor
export { IssueEditor, IssueEditor as IssueEditorPage }
