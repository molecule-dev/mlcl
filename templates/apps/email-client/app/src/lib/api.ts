/**
 * Email-client API helpers built on the shared `@molecule/app-http` bond.
 *
 * Centralises shape conversion + relative-timestamp formatting so pages
 * don't repeat boilerplate.
 */

import { t } from '@molecule/app-i18n'

import type { ThreadLabel, ThreadRowData } from '../components/MeridianThreadRow.js'

export interface EmailRow {
  id: string
  user_id: string
  thread_id?: string | null
  from: string
  to?: string[] | string | null
  cc?: string[] | string | null
  bcc?: string[] | string | null
  subject: string
  body: string
  folder: string
  is_read: boolean
  is_starred: boolean
  label_id?: string | null
  attachments?: Array<{ name: string; size_label?: string; url: string }> | null
  sent_at?: string | null
  read_at?: string | null
  created_at: string
  updated_at?: string | null
  delivery?: 'sent' | 'failed'
  delivery_error?: string | null
  message_id?: string | null
}

export interface EmailCounts {
  inbox: number
  sent: number
  drafts: number
  trash: number
  spam: number
  archive: number
  starred: number
  unread: number
  total: number
  [k: string]: number
}

export interface EmailLabel {
  id: string
  user_id: string
  name: string
  color: string
}

export interface EmailFolder {
  id: string
  user_id: string
  name: string
  color: string | null
}

/**
 * Format an ISO timestamp into a short relative label suitable for
 * the inbox row gutter ("10:42 AM" today, "Yesterday", "Mon", "Sep 5",
 * etc.).
 */
export function formatRelativeTimestamp(iso: string | null | undefined): string {
  if (!iso) return ''
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''
  const now = new Date()
  const sameDay =
    now.getFullYear() === then.getFullYear() &&
    now.getMonth() === then.getMonth() &&
    now.getDate() === then.getDate()
  if (sameDay) {
    return then.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    yesterday.getFullYear() === then.getFullYear() &&
    yesterday.getMonth() === then.getMonth() &&
    yesterday.getDate() === then.getDate()
  if (isYesterday) return t('meridian.time.yesterday', {}, { defaultValue: 'Yesterday' })

  const diffMs = now.getTime() - then.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays < 7) {
    return then.toLocaleDateString(undefined, { weekday: 'short' })
  }
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Two-letter avatar fallback derived from sender name/email. */
export function deriveInitials(sender: string): string {
  const cleaned = sender.replace(/<[^>]*>/g, '').trim() || sender
  const local = cleaned.split('@')[0] ?? cleaned
  const parts = local.split(/[.\s_-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  }
  return local.slice(0, 2).toUpperCase()
}

const TONE_BY_LABEL: Record<string, NonNullable<ThreadLabel['tone']>> = {
  Work: 'work',
  Personal: 'personal',
  Travel: 'travel',
  Newsletter: 'newsletter',
  Newsletters: 'newsletter',
  Receipts: 'receipt',
  Receipt: 'receipt',
  Urgent: 'urgent',
}

/** Map an API row → the ThreadRowData shape the row component expects. */
export function emailToThreadRow(
  row: EmailRow,
  labelsById: Record<string, EmailLabel>,
): ThreadRowData {
  const senderRaw = row.from || t('meridian.inbox.noSender', {}, { defaultValue: '(no sender)' })
  const senderName = senderRaw.split('@')[0]?.replace(/[._-]+/g, ' ') || senderRaw
  const labels: ThreadLabel[] = []
  if (row.label_id && labelsById[row.label_id]) {
    const lbl = labelsById[row.label_id]!
    labels.push({ name: lbl.name, tone: TONE_BY_LABEL[lbl.name] ?? 'receipt' })
  }
  if (row.is_starred && !labels.length) {
    // no implicit label — visual star is on the row itself
  }
  return {
    id: row.id,
    sender: senderName.replace(/\b\w/g, (c) => c.toUpperCase()),
    initials: deriveInitials(senderRaw),
    subject: row.subject || t('meridian.inbox.noSubject', {}, { defaultValue: '(no subject)' }),
    snippet: (row.body || '').replace(/\s+/g, ' ').trim().slice(0, 140) || '—',
    timestamp: formatRelativeTimestamp(row.sent_at ?? row.created_at),
    unread: !row.is_read,
    starred: !!row.is_starred,
    hasAttachment: Array.isArray(row.attachments) && row.attachments.length > 0,
    labels: labels.length ? labels : undefined,
  }
}

/** Coerce a possibly-jsonb-string-array shape into a clean array. */
export function ensureArray(value: string[] | string | null | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map(String)
    return [String(parsed)]
  } catch (_error) {
    // not valid JSON — treat the raw string as the single value
    return [String(value)]
  }
}
