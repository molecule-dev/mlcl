/**
 * Deterministic 90-day uptime sample generator used when the API
 * doesn't return a real history yet. Seeded by service id so the
 * pattern stays stable across renders / screenshots.
 */

import type { UptimeDay, UptimeDayStatus } from '../components/UptimeBar.js'

function hash(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h >>> 0
}

function rng(seed: number): () => number {
  let s = seed || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

export function generateUptime90(
  serviceId: string,
  currentStatus: UptimeDayStatus = 'operational',
): UptimeDay[] {
  const seed = hash(serviceId)
  const next = rng(seed)
  const days: UptimeDay[] = []
  const today = new Date('2026-04-26T00:00:00Z')

  const incidentDays = new Set<number>()
  const maintenanceDays = new Set<number>()
  const incidentCount = 1 + Math.floor(next() * 4)
  for (let i = 0; i < incidentCount; i++) {
    incidentDays.add(Math.floor(next() * 88) + 2)
  }
  if (next() > 0.65) maintenanceDays.add(Math.floor(next() * 80) + 5)

  for (let i = 89; i >= 0; i--) {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - i)
    const isoDate = date.toISOString().slice(0, 10)
    let status: UptimeDayStatus = 'operational'
    let uptimePct = 99.95 + next() * 0.05
    let incidents = 0

    if (incidentDays.has(i)) {
      const r = next()
      if (r < 0.55) {
        status = 'degraded'
        uptimePct = 98.5 + next() * 1.0
      } else if (r < 0.85) {
        status = 'partial'
        uptimePct = 95 + next() * 3
      } else {
        status = 'major'
        uptimePct = 90 + next() * 4
      }
      incidents = 1 + Math.floor(next() * 2)
    } else if (maintenanceDays.has(i)) {
      status = 'maintenance'
      uptimePct = 99.0 + next() * 0.95
    }

    if (i === 0 && currentStatus !== 'operational' && status === 'operational') {
      status = currentStatus
      uptimePct = 96.0 + next() * 3.5
      incidents = 1
    }

    days.push({ date: isoDate, status, uptimePct, incidentCount: incidents })
  }

  return days
}

export function aggregateUptimePct(days: UptimeDay[]): number {
  if (!days.length) return 100
  const total = days.reduce((acc, d) => acc + (d.uptimePct ?? 100), 0)
  return total / days.length
}
