/**
 * Due-dose reminder task — the send-side of medication reminders.
 *
 * The data model has always had everything a reminder needs (generated
 * `dose_logs` rows with `scheduled_at`, per-schedule
 * `reminder_minutes_before`, an in-app `notifications` feed, `devices` rows
 * carrying web-push subscriptions, and a bonded cron + push provider) — but
 * nothing ever joined them on a clock, so no reminder ever fired. This task
 * is that join: every minute it finds pending doses entering their reminder
 * window, writes the in-app notification row (the same idiom as
 * `handlers/notifications.ts`), and web-pushes each of the user's subscribed
 * devices (per-device failures logged and skipped, mirroring sports-league's
 * `fanoutPushToFavorites`).
 *
 * Idempotent by design: the created `notifications` row doubles as the
 * dedup marker (`kind: 'dose_reminder'`, `payload.dose_log_id`), so a dose
 * is reminded exactly once no matter how many ticks its window spans.
 *
 * @module
 */

import { hasProvider as hasCronProvider, schedule } from '@molecule/api-cron'
import { create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { PushSubscription } from '@molecule/api-push-notifications'
import { hasProvider as hasPushProvider, send as sendPush } from '@molecule/api-push-notifications'

/** Upper bound on any schedule's `reminder_minutes_before` we scan ahead for. */
const MAX_LEAD_MINUTES = 120

/** Dedup marker kind written to (and read back from) the notifications feed. */
const REMINDER_KIND = 'dose_reminder'

interface DoseLogRow {
  id: string
  schedule_id?: string | null
  medication_id: string
  user_id: string
  scheduled_at: string | Date
  scheduled_time?: string | null
  status: string
}

interface ScheduleRow {
  id: string
  reminder_minutes_before?: number | null
  is_paused?: boolean | null
  enabled?: boolean | null
}

let started = false

/** Parse a notifications payload column (jsonb object or serialized string). */
const parsePayload = (raw: unknown): Record<string, unknown> => {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch (_error) {
      // Malformed legacy payloads just don't contribute a dedup marker.
      return {}
    }
  }
  return {}
}

/**
 * One scan: find pending doses whose reminder window has opened, create the
 * in-app notification, and push to the user's subscribed devices. Exported
 * for tests; every failure is contained (a tick never throws).
 *
 * @param now - The tick timestamp (injectable for tests).
 * @returns The number of doses reminded this tick.
 */
export async function runDueReminderScan(now: Date = new Date()): Promise<number> {
  let reminded = 0
  try {
    const windowEnd = new Date(now.getTime() + MAX_LEAD_MINUTES * 60_000)
    const doses = (await findMany('dose_logs', {
      where: [
        { field: 'status', operator: '=', value: 'pending' },
        // Small grace behind `now` so a dose right on the boundary between
        // two ticks still gets its reminder; anything older is history.
        { field: 'scheduled_at', operator: '>=', value: new Date(now.getTime() - 60_000) },
        { field: 'scheduled_at', operator: '<=', value: windowEnd },
      ],
      limit: 500,
      orderBy: [{ field: 'scheduled_at', direction: 'asc' }],
    })) as unknown as DoseLogRow[]
    if (doses.length === 0) return 0

    // Per-schedule lead + paused/disabled gates.
    const scheduleIds = Array.from(
      new Set(doses.map((d) => d.schedule_id).filter((v): v is string => !!v)),
    )
    const schedules =
      scheduleIds.length > 0
        ? ((await findMany('medication_schedules', {
            where: [{ field: 'id', operator: 'in', value: scheduleIds }],
            limit: scheduleIds.length,
          })) as unknown as ScheduleRow[])
        : []
    const scheduleById = new Map(schedules.map((s) => [String(s.id), s]))

    // Dedup: a dose is reminded once — the notifications row IS the marker.
    const userIds = Array.from(new Set(doses.map((d) => String(d.user_id))))
    const recent = (await findMany('notifications', {
      where: [
        { field: 'kind', operator: '=', value: REMINDER_KIND },
        { field: 'user_id', operator: 'in', value: userIds },
        { field: 'created_at', operator: '>=', value: new Date(now.getTime() - 86_400_000) },
      ],
      limit: 2000,
    })) as unknown as Array<{ payload?: unknown }>
    const alreadyReminded = new Set(
      recent.map((n) => String(parsePayload(n.payload).dose_log_id ?? '')).filter(Boolean),
    )

    const medicationNames = new Map<string, string>()
    const medicationName = async (medicationId: string): Promise<string> => {
      const cached = medicationNames.get(medicationId)
      if (cached !== undefined) return cached
      const meds = (await findMany('medications', {
        where: [{ field: 'id', operator: '=', value: medicationId }],
        limit: 1,
      })) as unknown as Array<{ name?: string }>
      const name = meds[0]?.name || 'your medication'
      medicationNames.set(medicationId, name)
      return name
    }

    for (const dose of doses) {
      try {
        if (alreadyReminded.has(String(dose.id))) continue

        const doseSchedule = dose.schedule_id
          ? scheduleById.get(String(dose.schedule_id))
          : undefined
        if (doseSchedule && (doseSchedule.is_paused || doseSchedule.enabled === false)) continue

        const leadMinutes =
          typeof doseSchedule?.reminder_minutes_before === 'number'
            ? doseSchedule.reminder_minutes_before
            : 5
        const scheduledAt = new Date(dose.scheduled_at)
        const remindAt = new Date(scheduledAt.getTime() - leadMinutes * 60_000)
        if (remindAt.getTime() > now.getTime()) continue // window not open yet

        const name = await medicationName(String(dose.medication_id))
        const timeLabel = dose.scheduled_time || scheduledAt.toISOString().slice(11, 16)
        const title = t('reminders.pushTitle', { name }, { defaultValue: `Time for ${name}` })
        const body = t(
          'reminders.pushBody',
          { name, time: timeLabel },
          { defaultValue: `${name} is scheduled at ${timeLabel}. Mark it once taken.` },
        )
        const href = '/today'
        // Flat payload (same convention as sports-league's proven fan-out);
        // the shared service-worker push handler understands it directly.
        const pushPayload: { title: string; body: string; href?: string } = { title, body, href }

        // In-app notification first — it is also the dedup marker, so a
        // push-side failure can not cause duplicate reminders.
        await create('notifications', {
          user_id: dose.user_id,
          kind: REMINDER_KIND,
          title,
          body,
          href,
          payload: JSON.stringify({
            dose_log_id: dose.id,
            medication_id: dose.medication_id,
            scheduled_time: timeLabel,
          }),
          read: false,
          read_at: null,
          created_at: new Date(),
        })
        reminded += 1

        if (!hasPushProvider()) continue
        // The devices table uses camelCase columns ("userId"/"pushSubscription"),
        // unlike this app's snake_case domain tables.
        const devices = (await findMany('devices', {
          where: [{ field: 'userId', operator: '=', value: String(dose.user_id) }],
        })) as Array<{ pushSubscription?: PushSubscription | null }>
        for (const device of devices) {
          if (!device.pushSubscription) continue
          try {
            await sendPush(device.pushSubscription, pushPayload)
          } catch (error) {
            logger.error('due-reminders push send failed', error)
          }
        }
      } catch (error) {
        logger.error('due-reminders failed for dose', dose.id, error)
      }
    }
  } catch (error) {
    logger.error('due-reminders scan failed', error)
  }
  return reminded
}

/**
 * Arms the every-minute due-reminder cron. Called once from the end of
 * `setupBonds()` (after the cron + push bonds are wired); a repeat call or a
 * missing cron bond is a logged no-op, never a crash.
 */
export async function startDueReminderTask(): Promise<void> {
  if (started) return
  if (!hasCronProvider()) {
    logger.warn('due-reminders not started: no cron provider bonded')
    return
  }
  started = true
  await schedule('due-dose-reminders', '* * * * *', async () => {
    await runDueReminderScan()
  })
}
