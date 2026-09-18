import type { generatedVisualClassMapTokens } from './generatedVisualClassMap.js'

type FlagshipVisualTokens = typeof generatedVisualClassMapTokens

declare module '@molecule/app-ui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UIClassMap extends FlagshipVisualTokens {}
}

export type {}
