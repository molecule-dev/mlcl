import { describe, expect, it } from 'vitest'

import { inferFromDescription } from '../infer.js'
import type { InferredPackage } from '../schema.js'

/**
 * Minimal registry stub for testing inference.
 * Only includes fields the inference engine actually checks.
 */
function makePackage(overrides: Partial<InferredPackage>): InferredPackage {
  return {
    name: overrides.name ?? '@molecule/api-test',
    version: '1.0.0',
    dependencies: {},
    peerDependencies: {},
    type: overrides.type ?? 'core',
    routes: [],
    tables: overrides.tables ?? [],
    exports: [],
    path: '',
    molecule: overrides.molecule,
  }
}

const REGISTRY: InferredPackage[] = [
  makePackage({
    name: '@molecule/api-database',
    type: 'core',
    molecule: { type: 'core', category: 'database', label: 'Database', secrets: [] },
  }),
  makePackage({
    name: '@molecule/api-database-postgresql',
    type: 'bond',
    molecule: {
      type: 'provider',
      category: 'database',
      label: 'PostgreSQL',
      implements: '@molecule/api-database',
      secrets: [{ name: 'DATABASE_URL', required: true }],
    },
  }),
  makePackage({
    name: '@molecule/api-payments',
    type: 'core',
    molecule: { type: 'core', category: 'payments', label: 'Payments', secrets: [] },
  }),
  makePackage({
    name: '@molecule/api-payments-stripe',
    type: 'bond',
    molecule: {
      type: 'provider',
      category: 'payments',
      label: 'Stripe',
      implements: '@molecule/api-payments',
      secrets: [
        { name: 'STRIPE_SECRET_KEY', required: true },
        { name: 'STRIPE_WEBHOOK_SECRET', required: true },
      ],
    },
  }),
  makePackage({
    name: '@molecule/api-email',
    type: 'core',
    molecule: { type: 'core', category: 'email', label: 'Email', secrets: [] },
  }),
  makePackage({
    name: '@molecule/api-email-sendgrid',
    type: 'bond',
    molecule: {
      type: 'provider',
      category: 'email',
      label: 'SendGrid',
      implements: '@molecule/api-email',
      secrets: [{ name: 'SENDGRID_API_KEY', required: true }],
    },
  }),
  makePackage({
    name: '@molecule/api-resource-user',
    type: 'resource',
    tables: [{ name: 'users', sqlFile: 'src/__setup__/users.sql' }],
    molecule: { type: 'resource', category: 'auth', label: 'Users', secrets: [] },
  }),
  makePackage({
    name: '@molecule/api-cache',
    type: 'core',
    molecule: { type: 'core', category: 'cache', label: 'Cache', secrets: [] },
  }),
  makePackage({
    name: '@molecule/app-ui',
    type: 'core',
    molecule: { type: 'core', category: 'ui', label: 'UI', stack: 'app', secrets: [] },
  }),
  makePackage({
    name: '@molecule/app-routing',
    type: 'core',
    molecule: { type: 'core', category: 'routing', label: 'Routing', stack: 'app', secrets: [] },
  }),
]

describe('inferFromDescription', () => {
  // -----------------------------------------------------------------------
  // Stack inference
  // -----------------------------------------------------------------------
  describe('stack', () => {
    it('infers api stack from backend keywords', () => {
      const result = inferFromDescription('A REST API handler for orders', REGISTRY)
      expect(result.stack).toBe('api')
    })

    it('infers app stack from frontend keywords', () => {
      const result = inferFromDescription('A React component for user profiles', REGISTRY)
      expect(result.stack).toBe('app')
    })

    it('defaults to api when ambiguous', () => {
      const result = inferFromDescription('A logging system', REGISTRY)
      expect(result.stack).toBe('api')
    })
  })

  // -----------------------------------------------------------------------
  // Category inference
  // -----------------------------------------------------------------------
  describe('category', () => {
    it('detects category from known provider name', () => {
      const result = inferFromDescription('A Redis-backed cache provider', REGISTRY)
      expect(result.category).toBe('cache')
    })

    it('detects category from domain keywords', () => {
      const result = inferFromDescription('Transactional email sending with templates', REGISTRY)
      expect(result.category).toBe('email')
    })

    it('detects payments from billing keywords', () => {
      const result = inferFromDescription('Subscription billing and checkout', REGISTRY)
      expect(result.category).toBe('payments')
    })

    it('detects database from data keywords', () => {
      const result = inferFromDescription('NoSQL database driver', REGISTRY)
      expect(result.category).toBe('database')
    })

    it('detects AI category', () => {
      const result = inferFromDescription('Claude AI chat completion provider', REGISTRY)
      expect(result.category).toBe('ai')
    })

    it('detects sandbox category', () => {
      const result = inferFromDescription('Docker container sandbox manager', REGISTRY)
      expect(result.category).toBe('sandbox')
    })
  })

  // -----------------------------------------------------------------------
  // Type inference
  // -----------------------------------------------------------------------
  describe('type', () => {
    it('infers core from interface keywords', () => {
      const result = inferFromDescription('A model-agnostic AI provider interface', REGISTRY)
      expect(result.type).toBe('core')
    })

    it('infers provider from known provider name', () => {
      const result = inferFromDescription('Stripe payments integration', REGISTRY)
      expect(result.type).toBe('provider')
    })

    it('infers provider when core already exists', () => {
      const result = inferFromDescription('A new database driver for DynamoDB', REGISTRY)
      expect(result.type).toBe('provider')
      expect(result.category).toBe('database')
    })

    it('infers resource from entity keywords', () => {
      const result = inferFromDescription('A CRUD resource for products', REGISTRY)
      expect(result.type).toBe('resource')
    })

    it('infers middleware from middleware keyword', () => {
      const result = inferFromDescription('Rate limiting middleware for the API', REGISTRY)
      expect(result.type).toBe('middleware')
    })

    it('infers utility from helper keywords', () => {
      const result = inferFromDescription('Validation utility helpers', REGISTRY)
      expect(result.type).toBe('utility')
    })

    it('infers framework from react hook keywords', () => {
      const result = inferFromDescription('React hook bindings for the app framework', REGISTRY)
      expect(result.stack).toBe('app')
      expect(result.type).toBe('framework')
    })

    it('infers framework from vue composable keywords', () => {
      const result = inferFromDescription('Vue composable adapters for the frontend app', REGISTRY)
      expect(result.stack).toBe('app')
      expect(result.type).toBe('framework')
    })

    it('infers feature from domain-specific keywords', () => {
      const result = inferFromDescription(
        'A rich text editor feature for the frontend app',
        REGISTRY,
      )
      expect(result.stack).toBe('app')
      expect(result.type).toBe('feature')
    })

    it('infers feature from charts keyword', () => {
      const result = inferFromDescription(
        'Charts and graph visualization for the frontend app',
        REGISTRY,
      )
      expect(result.stack).toBe('app')
      expect(result.type).toBe('feature')
    })

    it('infers native from device capability keywords', () => {
      const result = inferFromDescription(
        'Geolocation native device capability for the app',
        REGISTRY,
      )
      expect(result.stack).toBe('app')
      expect(result.type).toBe('native')
    })

    it('infers native from camera keyword', () => {
      const result = inferFromDescription('Camera capture for the frontend app', REGISTRY)
      expect(result.stack).toBe('app')
      expect(result.type).toBe('native')
    })

    it('prefers native over feature when both match on app stack', () => {
      const result = inferFromDescription(
        'Native push notification capability for the app',
        REGISTRY,
      )
      expect(result.stack).toBe('app')
      expect(result.type).toBe('native')
    })

    it('does not infer framework/feature/native for api stack', () => {
      const result = inferFromDescription(
        'A react hook interface for the backend server API',
        REGISTRY,
      )
      expect(result.stack).toBe('api')
      // Should NOT be framework since stack is api
      expect(result.type).not.toBe('framework')
    })
  })

  // -----------------------------------------------------------------------
  // Name generation
  // -----------------------------------------------------------------------
  describe('name', () => {
    it('builds core name: {stack}-{category}', () => {
      const result = inferFromDescription('A model-agnostic AI provider interface', REGISTRY)
      expect(result.name).toBe('api-ai')
    })

    it('builds provider name: {stack}-{category}-{provider}', () => {
      const result = inferFromDescription('Redis cache provider', REGISTRY)
      expect(result.name).toBe('api-cache-redis')
    })

    it('builds resource name: {stack}-resource-{category}', () => {
      const result = inferFromDescription('A CRUD resource for products', REGISTRY)
      expect(result.name).toMatch(/^api-resource-/)
    })

    it('builds middleware name', () => {
      const result = inferFromDescription('Rate limiting middleware for the API', REGISTRY)
      expect(result.name).toMatch(/^api-middleware-/)
    })
  })

  // -----------------------------------------------------------------------
  // implements inference
  // -----------------------------------------------------------------------
  describe('implements', () => {
    it('resolves core package for providers', () => {
      const result = inferFromDescription('A MongoDB database driver implementation', REGISTRY)
      expect(result.type).toBe('provider')
      expect(result.implements).toBe('@molecule/api-database')
    })

    it('does not set implements for core packages', () => {
      const result = inferFromDescription('An abstract AI provider interface', REGISTRY)
      expect(result.type).toBe('core')
      expect(result.implements).toBeUndefined()
    })

    it('returns undefined when no core exists', () => {
      const result = inferFromDescription('Vercel deployment provider', REGISTRY)
      expect(result.type).toBe('provider')
      expect(result.implements).toBeUndefined()
    })
  })

  // -----------------------------------------------------------------------
  // Secrets inference
  // -----------------------------------------------------------------------
  describe('secrets', () => {
    it('copies secret patterns from existing providers', () => {
      const result = inferFromDescription('PayPal payments provider', REGISTRY)
      expect(result.type).toBe('provider')
      expect(result.category).toBe('payments')
      expect(result.secrets.length).toBeGreaterThan(0)
      // Should have adapted the secret names from Stripe template
      expect(result.secrets.some((s) => s.name.includes('PAYPAL'))).toBe(true)
    })

    it('returns empty secrets for core packages', () => {
      const result = inferFromDescription('Abstract queue interface', REGISTRY)
      expect(result.secrets).toEqual([])
    })
  })

  // -----------------------------------------------------------------------
  // Tables inference
  // -----------------------------------------------------------------------
  describe('tables', () => {
    it('infers tables for resource type', () => {
      const result = inferFromDescription('A CRUD resource for blog posts', REGISTRY)
      expect(result.type).toBe('resource')
      expect(result.tables.length).toBeGreaterThan(0)
    })

    it('returns empty tables for non-resource types', () => {
      const result = inferFromDescription('Redis cache provider', REGISTRY)
      expect(result.tables).toEqual([])
    })
  })

  // -----------------------------------------------------------------------
  // Label generation
  // -----------------------------------------------------------------------
  describe('label', () => {
    it('title-cases category for core packages', () => {
      const result = inferFromDescription('Abstract queue job interface', REGISTRY)
      expect(result.label).toBe('Queue')
    })

    it('uses provider name for providers', () => {
      const result = inferFromDescription('Redis cache implementation', REGISTRY)
      expect(result.label).toBe('Redis')
    })

    it('uses special casing for AI', () => {
      const result = inferFromDescription('A model-agnostic AI provider interface', REGISTRY)
      expect(result.label).toBe('AI')
    })
  })

  // -----------------------------------------------------------------------
  // Real-world scenarios
  // -----------------------------------------------------------------------
  describe('real-world scenarios', () => {
    it('infers Claude AI provider correctly', () => {
      const result = inferFromDescription(
        'Claude (Anthropic) AI chat completion provider with streaming and tool use',
        REGISTRY,
      )
      expect(result.stack).toBe('api')
      expect(result.category).toBe('ai')
      expect(result.type).toBe('provider')
      expect(result.name).toMatch(/api-ai-/)
    })

    it('infers Docker sandbox provider correctly', () => {
      const result = inferFromDescription(
        'Docker-based sandbox container provider for isolated code execution',
        REGISTRY,
      )
      expect(result.stack).toBe('api')
      expect(result.category).toBe('sandbox')
      expect(result.type).toBe('provider')
      expect(result.name).toMatch(/api-sandbox-docker/)
    })

    it('infers project resource correctly', () => {
      const result = inferFromDescription(
        'CRUD resource for managing user projects with sandbox assignment',
        REGISTRY,
      )
      expect(result.stack).toBe('api')
      expect(result.type).toBe('resource')
      expect(result.tables.length).toBeGreaterThan(0)
    })

    it('infers React chat component correctly', () => {
      const result = inferFromDescription(
        'A React chat panel component with streaming messages',
        REGISTRY,
      )
      expect(result.stack).toBe('app')
    })
  })
})
