/**
 * {{PROVIDER_PASCAL}} implementation of {{CATEGORY_PASCAL}}Provider.
 *
 * @module
 */

{{IMPLEMENTS_IMPORT}}import type { {{PROVIDER_PASCAL}}Config } from './types.js'

export class {{PROVIDER_PASCAL}}{{CATEGORY_PASCAL}}Provider{{IMPLEMENTS_CLAUSE}} {
  readonly name = '{{PROVIDER_LABEL}}'

  constructor(private config: {{PROVIDER_PASCAL}}Config) {
    // TODO: Initialize provider
  }
}

export function createProvider(config: {{PROVIDER_PASCAL}}Config): {{PROVIDER_PASCAL}}{{CATEGORY_PASCAL}}Provider {
  return new {{PROVIDER_PASCAL}}{{CATEGORY_PASCAL}}Provider(config)
}
