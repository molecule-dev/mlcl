/**
 * feature-flag-manager — seed handler.
 *
 * Idempotent endpoint: when a user has zero flags / environments / segments,
 * populate their workspace with a small set of canonical demo records so the
 * dashboard, flags list, environments page, and segments page are immediately
 * useful. Subsequent calls are no-ops.
 *
 * Concurrency note: React StrictMode double-fires useEffect, which means
 * Dashboard.tsx will issue /api/seed twice in dev. Each row write is wrapped
 * in try/catch so a unique-violation on the second concurrent call doesn't
 * 500 the response — the (user_id, key) unique constraints in the migration
 * make duplicate inserts a no-op.
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const randomKey = (prefix: string): string => {
  const hex = (): string =>
    Math.floor(Math.random() * 0x100000000)
      .toString(16)
      .padStart(8, '0')
  return `${prefix}_${hex()}${hex()}${hex()}`
}

interface SeedResult {
  seeded: boolean
  flags: number
  environments: number
  segments: number
}

const isDuplicate = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : String(e)
  return /duplicate key|unique constraint|UNIQUE/i.test(msg)
}

router.post('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }

    const result: SeedResult = { seeded: false, flags: 0, environments: 0, segments: 0 }

    const existingEnvs = await findMany<{ id: string }>('flag_environments', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1,
    })
    if (existingEnvs.length === 0) {
      const now = new Date()
      const envs = [
        { key: 'production', name: 'Production', color: '#ef4444', is_production: true },
        { key: 'staging', name: 'Staging', color: '#f59e0b', is_production: false },
        { key: 'development', name: 'Development', color: '#10b981', is_production: false },
      ]
      for (const e of envs) {
        try {
          await create('flag_environments', {
            user_id: userId,
            project_id: null,
            key: e.key,
            name: e.name,
            color: e.color,
            is_production: e.is_production,
            sdk_key: randomKey('sdk'),
            client_key: randomKey('clt'),
            flag_count: 0,
            active_flag_count: 0,
            created_at: now,
            updated_at: now,
          })
          result.environments += 1
        } catch (err) {
          if (!isDuplicate(err)) throw err
        }
      }
      result.seeded = true
    }

    const existingFlags = await findMany<{ id: string }>('feature_flags', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1,
    })
    if (existingFlags.length === 0) {
      const now = new Date()
      const flags = [
        {
          key: 'onboarding-revamp-v3',
          name: 'Onboarding revamp v3',
          description: 'Personalised welcome flow with checklist',
          flag_type: 'boolean',
          default_value: false,
          rollout_percentage: 75,
          is_enabled: true,
          stale_days: 30,
          environment: 'production',
        },
        {
          key: 'pricing-test-q4',
          name: 'Q4 pricing experiment',
          description: 'A/B/C variants on /pricing',
          flag_type: 'multivariate',
          default_value: 'control',
          rollout_percentage: 50,
          is_enabled: true,
          stale_days: 30,
          environment: 'production',
        },
        {
          key: 'beta-cohort-search',
          name: 'Beta cohort search v2',
          description: 'Show new search to users in the beta_testers segment',
          flag_type: 'boolean',
          default_value: false,
          rollout_percentage: 100,
          is_enabled: true,
          stale_days: 30,
          environment: 'staging',
        },
      ]
      for (const f of flags) {
        try {
          const inserted = await create('feature_flags', {
            user_id: userId,
            project_id: null,
            key: f.key,
            name: f.name,
            description: f.description,
            flag_type: f.flag_type,
            default_value: JSON.stringify(f.default_value),
            state: f.is_enabled ? 'on' : 'off',
            rollout_percentage: f.rollout_percentage,
            environments: JSON.stringify({}),
            is_enabled: f.is_enabled,
            stale_days: f.stale_days,
            environment: f.environment,
            updated_by: userId,
            created_at: now,
            updated_at: now,
          })
          const flagRow = inserted.data ?? null
          const flagId = flagRow && typeof flagRow.id === 'string' ? flagRow.id : null
          await create('audit_log', {
            user_id: userId,
            action: 'created',
            actor: userId,
            actor_email: null,
            target: f.key,
            flag_id: flagId,
            message: `Seed: created ${f.key}`,
            metadata: JSON.stringify({ seed: true }),
            occurred_at: now,
            created_at: now,
          })
          result.flags += 1
        } catch (err) {
          if (!isDuplicate(err)) throw err
        }
      }
      result.seeded = true
    }

    const existingSegments = await findMany<{ id: string }>('segments', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1,
    })
    if (existingSegments.length === 0) {
      const now = new Date()
      const segments = [
        {
          key: 'beta_testers',
          name: 'Beta testers',
          description: 'Internal employees + opted-in early access list',
          conditions: [{ attribute: 'optedIn', operator: 'is', value: ['true'] }],
        },
        {
          key: 'enterprise_us',
          name: 'Enterprise — US',
          description: 'Plan = enterprise AND country in [US]',
          conditions: [
            { attribute: 'plan', operator: 'in', value: ['enterprise'] },
            { attribute: 'country', operator: 'in', value: ['US'] },
          ],
        },
      ]
      for (const s of segments) {
        try {
          await create('segments', {
            user_id: userId,
            project_id: null,
            key: s.key,
            name: s.name,
            description: s.description,
            conditions: JSON.stringify(s.conditions),
            created_at: now,
            updated_at: now,
          })
          result.segments += 1
        } catch (err) {
          if (!isDuplicate(err)) throw err
        }
      }
      result.seeded = true
    }

    res.json(result)
  } catch (e) {
    console.error('seed 500:', e)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
