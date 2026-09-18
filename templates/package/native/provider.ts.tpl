/**
 * {{PASCAL_NAME}} provider singleton.
 *
 * @module
 */

import type { {{PASCAL_NAME}}Provider } from './types.js'

let _provider: {{PASCAL_NAME}}Provider | null = null

export function setProvider(provider: {{PASCAL_NAME}}Provider): void {
  _provider = provider
}

export function getProvider(): {{PASCAL_NAME}}Provider | null {
  return _provider
}

export function hasProvider(): boolean {
  return _provider !== null
}

export function requireProvider(): {{PASCAL_NAME}}Provider {
  if (!_provider) {
    throw new Error(
      '{{PASCAL_NAME}} provider not configured. Set up {{CLEAN_NAME}} capability first.',
    )
  }
  return _provider
}
