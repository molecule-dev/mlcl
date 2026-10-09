import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type WizardData = {
  name: string
  company: string
  role: string
  goal: string
  newsletter: boolean
}

const EMPTY: WizardData = { name: '', company: '', role: '', goal: '', newsletter: false }

export function OnboardingWizard() {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const canAdvance = (() => {
    if (step === 0) return data.name.trim().length > 0
    if (step === 1) return data.company.trim().length > 0 && data.role.trim().length > 0
    if (step === 2) return data.goal.trim().length >= 10
    return true
  })()

  async function finish(): Promise<void> {
    setSubmitting(true)
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSubmitting(false)
    if (res.ok) setDone(true)
  }

  if (done) {
    return (
      <div className={cm.flex({ direction: 'col', gap: 'md' })} style={{ padding: '1.5rem' }}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('wizard.thanks', undefined, { defaultValue: "You're all set!" })}
        </h2>
      </div>
    )
  }

  return (
    <div
      className={cm.flex({ direction: 'col', gap: 'md' })}
      style={{ maxWidth: '28rem', padding: '1.5rem' }}
    >
      <nav className={cm.flex({ direction: 'row', gap: 'sm' })}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            style={{
              width: '0.75rem',
              height: '0.75rem',
              borderRadius: '9999px',
              display: 'inline-block',
              opacity: step >= i ? 1 : 0.3,
              border: step === i ? '2px solid currentColor' : '2px solid transparent',
            }}
            className={step >= i ? '' : cm.textMuted}
          />
        ))}
      </nav>

      {step === 0 ? (
        <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
          <span>
            {t('wizard.namePrompt', undefined, { defaultValue: 'What should we call you?' })}
          </span>
          <input
            autoFocus
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            className={cm.input({})}
          />
        </label>
      ) : null}

      {step === 1 ? (
        <>
          <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <span>
              {t('wizard.companyPrompt', undefined, { defaultValue: 'Where do you work?' })}
            </span>
            <input
              value={data.company}
              onChange={(e) => setData({ ...data, company: e.target.value })}
              className={cm.input({})}
            />
          </label>
          <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <span>{t('wizard.rolePrompt', undefined, { defaultValue: "What's your role?" })}</span>
            <input
              value={data.role}
              onChange={(e) => setData({ ...data, role: e.target.value })}
              className={cm.input({})}
            />
          </label>
        </>
      ) : null}

      {step === 2 ? (
        <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
          <span>
            {t('wizard.goalPrompt', undefined, {
              defaultValue: 'What are you hoping to accomplish?',
            })}
          </span>
          <textarea
            rows={5}
            minLength={10}
            value={data.goal}
            onChange={(e) => setData({ ...data, goal: e.target.value })}
            className={cm.textarea({})}
          />
        </label>
      ) : null}

      {step === 3 ? (
        <label className={cm.flex({ direction: 'row', gap: 'sm' })}>
          <input
            type="checkbox"
            checked={data.newsletter}
            onChange={(e) => setData({ ...data, newsletter: e.target.checked })}
          />
          <span>
            {t('wizard.newsletter', undefined, {
              defaultValue: 'Send me occasional product updates',
            })}
          </span>
        </label>
      ) : null}

      <div className={cm.flex({ direction: 'row', gap: 'sm', justify: 'between' })}>
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className={cm.button({ variant: 'outline' })}
        >
          {t('wizard.back', undefined, { defaultValue: 'Back' })}
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance}
            className={cm.button({ variant: 'solid' })}
          >
            {t('wizard.next', undefined, { defaultValue: 'Next' })}
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={submitting}
            className={cm.button({ variant: 'solid' })}
          >
            {submitting
              ? t('wizard.submitting', undefined, { defaultValue: 'Submitting…' })
              : t('wizard.finish', undefined, { defaultValue: 'Finish' })}
          </button>
        )}
      </div>
    </div>
  )
}
