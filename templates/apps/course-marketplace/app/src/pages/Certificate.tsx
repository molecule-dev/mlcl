/**
 * Certificate — owner-only certificate detail page.
 *
 * Reads /api/certificates/course/:courseId. Triggers POST /api/certificates
 * if the course is fully completed but no certificate exists yet (the
 * server-side check requires `enrollment.completed_at`). Download fetches
 * /api/certificates/:id/download as a PDF blob and forces the browser to
 * save it.
 */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CertificateBadge } from '../components/CertificateBadge.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { api } from '../lib/api.js'

interface ServerCertificate {
  id: string
  certificate_number: string
  course_id: string
  course_title: string
  user_id: string
  recipient_name: string
  instructor_name: string
  issued_at: string | null
  download_url: string
}

export function Certificate() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams<{ courseId?: string }>()
  const courseId = params.courseId ?? ''

  const [cert, setCert] = useState<ServerCertificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [issuing, setIssuing] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const c = await api<ServerCertificate>(`/certificates/course/${courseId}`)
      setCert(c)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Certificate not found'
      setError(message)
      setCert(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (courseId) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const issueCertificate = async () => {
    setIssuing(true)
    setError(null)
    try {
      await api<ServerCertificate>('/certificates', {
        method: 'POST',
        body: { course_id: courseId },
      })
      await load()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not issue certificate'
      setError(message)
    } finally {
      setIssuing(false)
    }
  }

  const downloadPdf = async () => {
    if (!cert) return
    try {
      const url = `/api/certificates/${cert.id}/download`
      const response = await fetch(url, { credentials: 'include' })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Download failed')
      }
      const blob = await response.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `certificate-${cert.certificate_number}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed'
      alert(message)
    }
  }

  const copyShareLink = async () => {
    const link = window.location.href
    try {
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
      // intentional noop: clipboard rejection falls through to window.prompt fallback
    } catch (_error) {
      // Fallback if clipboard API rejects (insecure context etc.)
      window.prompt(t('certificate.copyPrompt', {}, { defaultValue: 'Copy this link:' }), link)
    }
  }

  return (
    <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
      <Header />
      <main className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'max-w-5xl mx-auto w-full flex-1')}>
        <header className={cm.cn('mb-10 text-center')}>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
            )}
          >
            {t('certificate.eyebrow', {}, { defaultValue: 'Achievement unlocked' })}
          </p>
          <h1
            className={cm.cn(
              'text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-3',
            )}
          >
            {t('certificate.title', {}, { defaultValue: 'Congratulations, scholar.' })}
          </h1>
          <p className={cm.cn('text-on-surface-variant max-w-xl mx-auto leading-relaxed')}>
            {t(
              'certificate.body',
              {},
              {
                defaultValue:
                  'Your certificate is signed and ready. Share it with the world or keep it as a reminder of the work it took to earn.',
              },
            )}
          </p>
        </header>

        {loading ? (
          <p
            data-mol-id="certificate-loading"
            className={cm.cn('text-center text-on-surface-variant text-sm')}
          >
            {t('certificate.loading', {}, { defaultValue: 'Loading certificate…' })}
          </p>
        ) : cert ? (
          <>
            <div className={cm.cn('mb-10')}>
              <CertificateBadge
                recipient={cert.recipient_name}
                courseTitle={cert.course_title}
                completedAt={cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : '—'}
                certificateId={cert.certificate_number}
                instructor={cert.instructor_name || `${APP_NAME} instructor`}
              />
            </div>

            <div className={cm.cn('flex flex-wrap justify-center gap-4 mb-12')}>
              <button
                type="button"
                onClick={downloadPdf}
                data-mol-id="cert-download"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-primary-container text-on-primary shadow-[0px_8px_24px_rgba(99,54,224,0.25)] hover:bg-primary hover:-translate-y-0.5 transition-all',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>download</span>
                {t('certificate.download', {}, { defaultValue: 'Download PDF' })}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                data-mol-id="cert-print"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>print</span>
                {t('certificate.print', {}, { defaultValue: 'Print' })}
              </button>
              <button
                type="button"
                onClick={copyShareLink}
                data-mol-id="cert-share-link"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>link</span>
                {linkCopied
                  ? t('certificate.linkCopied', {}, { defaultValue: 'Link copied!' })
                  : t('certificate.copyLink', {}, { defaultValue: 'Copy share link' })}
              </button>
            </div>
          </>
        ) : (
          <div
            data-mol-id="certificate-missing"
            className={cm.cn(
              'bg-surface-container-lowest rounded-2xl shadow-sm p-12 text-center max-w-2xl mx-auto',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant mb-3')}
            >
              workspace_premium
            </span>
            <p className={cm.cn('text-lg font-bold text-on-surface mb-2')}>
              {t(
                'certificate.missingTitle',
                {},
                { defaultValue: 'No certificate yet for this course' },
              )}
            </p>
            <p className={cm.cn('text-on-surface-variant text-sm mb-6')}>
              {error ??
                t(
                  'certificate.missingBody',
                  {},
                  {
                    defaultValue: 'Complete every lesson in this course to issue your certificate.',
                  },
                )}
            </p>
            <div className={cm.cn('flex flex-wrap justify-center gap-3')}>
              <button
                type="button"
                onClick={issueCertificate}
                disabled={issuing}
                data-mol-id="cert-issue"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-primary-container text-on-primary hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                )}
              >
                {issuing
                  ? t('certificate.issuing', {}, { defaultValue: 'Checking eligibility…' })
                  : t('certificate.tryIssue', {}, { defaultValue: 'Try issuing certificate' })}
              </button>
              <Link
                to="/my-learning"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors',
                )}
              >
                {t('certificate.backToLearning', {}, { defaultValue: 'Back to My Learning' })}
              </Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default Certificate
