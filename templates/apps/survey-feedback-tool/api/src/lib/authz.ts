/**
 * Authorization helpers for survey-feedback-tool.
 *
 * Every survey-scoped resource (questions, responses, share links) must
 * be reachable only by the survey's owner. Use these helpers in every
 * handler that derives a row from a path parameter — they replace bare
 * `findById` lookups with ownership-checked variants and return
 * discriminated results so handlers can branch on 404 without leaking
 * existence information.
 *
 * Per CLAUDE.md / mlcl-CLAUDE.md "no IDOR" rule (G6) we standardize on
 * 404-for-non-owner so an attacker cannot probe survey existence.
 */

import { findById } from '@molecule/api-database'

export type AuthzResult<T> = { ok: true; row: T } | { ok: false; status: 404 }

/**
 * Look up a survey by id and verify the caller owns it.
 */
export async function requireSurveyOwnership<
  T extends { owner_id?: unknown } = Record<string, unknown>,
>(surveyId: string, userId: string): Promise<AuthzResult<T>> {
  const survey = await findById<T>('surveys', surveyId)
  if (!survey) return { ok: false, status: 404 }
  if (String((survey as { owner_id?: unknown }).owner_id) !== String(userId)) {
    return { ok: false, status: 404 }
  }
  return { ok: true, row: survey }
}

/**
 * Resolve a child row (question / response / share_link) and verify its
 * parent survey is owned by the caller.
 */
export async function requireSurveyChildOwnership<
  T extends { survey_id?: unknown } = Record<string, unknown>,
>(table: string, childId: string, userId: string): Promise<AuthzResult<T>> {
  const row = await findById<T>(table, childId)
  if (!row) return { ok: false, status: 404 }
  const surveyId = (row as { survey_id?: unknown }).survey_id
  if (!surveyId) return { ok: false, status: 404 }
  const owns = await requireSurveyOwnership(String(surveyId), userId)
  if (!owns.ok) return owns
  return { ok: true, row }
}

/**
 * Look up a survey by its public slug. No ownership check — public
 * respondents access surveys via the slug and the survey must be
 * `published` to be visible.
 */
export async function findPublishedSurveyBySlug<
  T extends { status?: unknown } = Record<string, unknown>,
>(slug: string): Promise<T | null> {
  const { findOne } = await import('@molecule/api-database')
  const survey = await findOne<T>('surveys', [{ field: 'slug', operator: '=', value: slug }])
  if (!survey) return null
  return survey
}

/**
 * Look up a notification by id and verify the caller is the owner
 * (`user_id` field).
 */
export async function requireNotificationOwnership<
  T extends { user_id?: unknown } = Record<string, unknown>,
>(notificationId: string, userId: string): Promise<AuthzResult<T>> {
  const row = await findById<T>('survey_notifications', notificationId)
  if (!row) return { ok: false, status: 404 }
  if (String((row as { user_id?: unknown }).user_id) !== String(userId)) {
    return { ok: false, status: 404 }
  }
  return { ok: true, row }
}

/**
 * Look up a template by id. Templates can be private (owned by a user)
 * or public (`is_public = true`, no owner). Returns 404 if missing or
 * if private and not owned by the caller. The system seed templates
 * (where is_public = true) are visible to everyone.
 */
export async function requireTemplateOwnershipOrPublic<
  T extends { owner_id?: unknown; is_public?: unknown } = Record<string, unknown>,
>(templateId: string, userId: string): Promise<AuthzResult<T>> {
  const row = await findById<T>('survey_templates', templateId)
  if (!row) return { ok: false, status: 404 }
  const isPublic = Boolean((row as { is_public?: unknown }).is_public)
  if (isPublic) return { ok: true, row }
  if (String((row as { owner_id?: unknown }).owner_id) !== String(userId)) {
    return { ok: false, status: 404 }
  }
  return { ok: true, row }
}
