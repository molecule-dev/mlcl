import { describe, expect, it } from 'vitest'

import { packageFramework, sharedHintAllowed } from '../intent-hints.js'

const packages = {
  '@molecule/app-footer-react': { category: 'footer' },
  '@molecule/app-footer-vue': { category: 'footer' },
  '@molecule/app-footer-react-native': { category: 'footer' },
  '@molecule/app-footer-angular': { category: 'footer', framework: 'angular' },
  '@molecule/app-header-vue': { category: 'header' },
  '@molecule/app-footer': { category: 'footer' },
  '@molecule/app-ide-react': { category: 'ide', framework: 'react' },
  '@molecule/api-payments-stripe': { category: 'payments', multiSelect: true },
  '@molecule/api-payments-paypal': { category: 'payments', multiSelect: true },
  '@molecule/api-emails-sendgrid': { category: 'emails' },
  '@molecule/api-emails-mailgun': { category: 'emails' },
}

describe('packageFramework', () => {
  it('reads the registry framework first, else the name suffix', () => {
    expect(packageFramework('@molecule/app-footer-vue', {})).toBe('vue')
    expect(packageFramework('@molecule/app-footer-react-native', {})).toBe('react-native')
    expect(packageFramework('@molecule/app-anything', { framework: 'solid' })).toBe('solid')
    expect(packageFramework('@molecule/app-footer', {})).toBeNull()
  })
})

describe('sharedHintAllowed', () => {
  it('allows the framework counterparts of one feature', () => {
    expect(
      sharedHintAllowed(
        [
          '@molecule/app-footer-react',
          '@molecule/app-footer-vue',
          '@molecule/app-footer-react-native',
          '@molecule/app-footer-angular',
        ],
        packages,
      ),
    ).toBe(true)
  })

  it('allows providers of one multi-select category', () => {
    expect(
      sharedHintAllowed(
        ['@molecule/api-payments-stripe', '@molecule/api-payments-paypal'],
        packages,
      ),
    ).toBe(true)
  })

  it('rejects two features, a neutral package, or two single-select providers', () => {
    expect(
      sharedHintAllowed(['@molecule/app-footer-react', '@molecule/app-header-vue'], packages),
    ).toBe(false)
    expect(
      sharedHintAllowed(['@molecule/app-footer-react', '@molecule/app-footer'], packages),
    ).toBe(false)
    expect(
      sharedHintAllowed(
        ['@molecule/api-emails-sendgrid', '@molecule/api-emails-mailgun'],
        packages,
      ),
    ).toBe(false)
  })

  it('rejects two packages for the same framework', () => {
    expect(
      sharedHintAllowed(['@molecule/app-ide-react', '@molecule/app-footer-react'], packages),
    ).toBe(false)
  })
})
