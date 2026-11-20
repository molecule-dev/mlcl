import { describe, expect, it } from 'vitest'

import { sharedHintAllowed } from '../intent-hints.js'
import { getRawRegistry } from '../registry.js'

/** The registry's own framework table, so a package's framework comes from its dependencies. */
const appFrameworks = getRawRegistry().appFrameworks ?? {}

const packages = {
  '@molecule/app-footer-react': { category: 'footer', runtimeDependencies: ['react', 'react-dom'] },
  '@molecule/app-footer-vue': { category: 'footer', runtimeDependencies: ['vue'] },
  '@molecule/app-footer-react-native': {
    category: 'footer',
    runtimeDependencies: ['react', 'react-native'],
  },
  '@molecule/app-footer-angular': { category: 'footer', framework: 'angular' },
  '@molecule/app-header-vue': { category: 'header', runtimeDependencies: ['vue'] },
  '@molecule/app-footer': { category: 'footer', runtimeDependencies: ['@molecule/app-i18n'] },
  '@molecule/app-ide-react': { category: 'ide', framework: 'react' },
  // A React feature whose name carries no `-react` suffix, and its ports.
  '@molecule/app-chat-widget': {
    category: 'chat-widget',
    runtimeDependencies: ['@molecule/app-react', 'react', 'react-dom'],
  },
  '@molecule/app-chat-widget-vue': { category: 'chat-widget', runtimeDependencies: ['vue'] },
  '@molecule/app-chat-widget-solid': {
    category: 'chat-widget',
    runtimeDependencies: ['solid-js'],
  },
  // A suffix the dependencies contradict: it peers nothing React, so it is framework-neutral.
  '@molecule/app-chat-widget-react': {
    category: 'chat-widget',
    runtimeDependencies: ['@molecule/app-i18n'],
  },
  '@molecule/api-payments-stripe': { category: 'payments', multiSelect: true },
  '@molecule/api-payments-paypal': { category: 'payments', multiSelect: true },
  '@molecule/api-emails-sendgrid': { category: 'emails' },
  '@molecule/api-emails-mailgun': { category: 'emails' },
}

const allowed = (owners: string[]): boolean => sharedHintAllowed(owners, packages, appFrameworks)

describe('sharedHintAllowed', () => {
  it('allows the framework counterparts of one feature', () => {
    expect(
      allowed([
        '@molecule/app-footer-react',
        '@molecule/app-footer-vue',
        '@molecule/app-footer-react-native',
        '@molecule/app-footer-angular',
      ]),
    ).toBe(true)
  })

  it('allows the ports of a React feature whose name has no framework suffix', () => {
    expect(
      allowed([
        '@molecule/app-chat-widget',
        '@molecule/app-chat-widget-vue',
        '@molecule/app-chat-widget-solid',
      ]),
    ).toBe(true)
  })

  it('allows providers of one multi-select category', () => {
    expect(allowed(['@molecule/api-payments-stripe', '@molecule/api-payments-paypal'])).toBe(true)
  })

  it('rejects two features, a neutral package, or two single-select providers', () => {
    expect(allowed(['@molecule/app-footer-react', '@molecule/app-header-vue'])).toBe(false)
    expect(allowed(['@molecule/app-footer-react', '@molecule/app-footer'])).toBe(false)
    expect(allowed(['@molecule/api-emails-sendgrid', '@molecule/api-emails-mailgun'])).toBe(false)
  })

  it('reads the framework from the dependencies, not the name', () => {
    expect(allowed(['@molecule/app-chat-widget-react', '@molecule/app-chat-widget-vue'])).toBe(
      false,
    )
  })

  it('rejects two packages for the same framework', () => {
    expect(allowed(['@molecule/app-ide-react', '@molecule/app-footer-react'])).toBe(false)
    expect(allowed(['@molecule/app-chat-widget', '@molecule/app-footer-react'])).toBe(false)
  })
})
