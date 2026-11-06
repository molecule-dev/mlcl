import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'

import ModuleProgressCard from '../../../templates/apps/lms/app/src/components/ModuleProgressCard.js'
import { ui as lmsFrench } from '../../../templates/apps/lms/app/src/locales/fr/ui.js'
import { ui as okrAfrikaans } from '../../../templates/apps/okr-goal-tracking/app/src/locales/af/ui.js'
import { ui as wikiFrench } from '../../../templates/apps/wiki/app/src/locales/fr/ui.js'

const state = vi.hoisted(() => ({
  t: ((key: string) => key) as ReturnType<typeof createSimpleI18nProvider>['t'],
}))
vi.mock('@molecule/app-react', () => ({ useTranslation: () => ({ t: state.t }) }))
// Styling is independent of the heading's real component → t() value flow.
vi.mock('@molecule/app-ui', () => ({ getClassMap: () => new Proxy({}, { get: () => () => '' }) }))

function moduleHeading(provider: ReturnType<typeof createSimpleI18nProvider>): string {
  state.t = provider.t
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(ModuleProgressCard, {
        courseId: 'course',
        activeLessonIdx: 0,
        module: {
          id: 'module',
          title: 'Neural Nets',
          description: 'Description',
          order: 7,
          lessons: [],
        },
      }),
    ),
  )
}

describe('template translations through the shared i18n provider', () => {
  it('the LMS component supplies the module order its translated heading uses', () => {
    const provider = createSimpleI18nProvider('fr', [
      { code: 'fr', name: 'French', translations: lmsFrench },
    ])
    const html = moduleHeading(provider)
    expect(html).not.toContain('{{order}}')
    expect(html).toContain('7')
  })

  it('preserves the LMS English heading when the extra interpolation value is supplied', () => {
    expect(moduleHeading(createSimpleI18nProvider('en'))).toContain('Neural Nets Progress')
  })

  it('resolves the OKR review status and date instead of a translated variable name', () => {
    const provider = createSimpleI18nProvider('af', [
      { code: 'af', name: 'Afrikaans', translations: okrAfrikaans },
    ])
    expect(provider.t('reviewDetail.eyebrow', { status: 'Final', date: '2026-11-06' })).toBe(
      'Final · 2026-11-06',
    )
  })

  it('resolves both versions in the Wiki comparison heading', () => {
    const provider = createSimpleI18nProvider('fr', [
      { code: 'fr', name: 'French', translations: wikiFrench },
    ])
    const heading = provider.t('versionHistory.diffHeading', { from: 3, to: 7 })
    expect(heading).not.toContain('{{')
    expect(heading).toContain('3')
    expect(heading).toContain('7')
  })
})
