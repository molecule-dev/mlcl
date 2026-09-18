/**
 * Type definitions used by the AI-image-generator pages and components.
 * The actual data is fetched from the backend (`/api/generations`,
 * `/api/collections`, `/api/prompts`, `/api/styles`, `/api/models`,
 * `/api/notifications`, `/api/profile`) via `useHttpClient`.
 *
 * NOTE: this file used to ship hardcoded `SAMPLE_*` arrays for design-time
 * preview. Those have been removed in favor of real HTTP fetches with
 * loading / empty / error states. New users get a populated experience
 * via `/api/bootstrap` (idempotent first-login seeder).
 */

import type { Generation } from '../components/GenerationCard.js'
import type { StylePreset } from '../components/StylePresetCard.js'

export type { Generation, StylePreset }

export interface CollectionSummary {
  id: string
  name: string
  description: string
  imageCount: number
  coverGradient: string
  glyph: string
  updatedAt: string
}

export interface PromptTemplate {
  id: string
  prompt: string
  negative?: string
  tags: string[]
  lastUsed: string
}

export interface ImageModel {
  id: string
  name: string
  vendor: string
  description: string
  capabilities: string[]
  active?: boolean
}

export interface ActivityEvent {
  id: string
  type: 'completed' | 'failed' | 'upscaled' | 'queued' | 'shared'
  prompt: string
  when: string
  groupKey: string
}

export interface CreatorProfile {
  id?: string
  name: string
  handle: string
  bio: string
  followers: number
  following: number
  creations: number
  bannerGradient: string
}
