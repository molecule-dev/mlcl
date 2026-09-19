/**
 * Voice-receptionist agent runner.
 *
 * One turn of the phone conversation, two interchangeable engines:
 *
 * - **LLM mode** — `@molecule/api-ai-agents` (the `api-ai-agents-llm`
 *   provider bonded at startup over the Anthropic chat bond) drives a
 *   tool-calling loop whose tools ARE the PMS: `search_availability`,
 *   `create_reservation`, `lookup_reservation`. The system prompt instructs
 *   it to auto-detect the caller's language and reply in it.
 * - **Scripted mode** — a deterministic, canned booking conversation in the
 *   selected language that executes the SAME tools through the SAME PMS
 *   library. Used when no AI provider is reachable (no ANTHROPIC_API_KEY)
 *   or when the caller explicitly requests scripted mode (e2e tests,
 *   offline demos). Guarantees the app demos and tests without keys.
 *
 * Both engines record every tool call as a `call_actions` row, so the
 * CallDetail timeline is identical regardless of engine.
 *
 * @module
 */

import type { AITool, ChatMessage } from '@molecule/api-ai'
import { requireProvider as requireAgents } from '@molecule/api-ai-agents'
import { create, findById, findMany } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

import {
  detectLanguage,
  resolveReplyLanguage,
  scriptedReply,
  type ScriptedReplyVars,
} from './languages.js'
import {
  type AvailabilityOption,
  createReservationInternal,
  isoPlusDays,
  lookupReservationByCode,
  nextFridayIso,
  type ReservationRow,
  searchAvailability,
} from './pms.js'

export interface CallRow {
  id: string
  voice_agent_id: string
  user_id: string | null
  direction: string
  detected_language: string | null
  started_at: string
  ended_at: string | null
  duration_seconds: number
  outcome: string | null
  summary: string | null
  recording_url: string | null
  mode: string
}

export interface VoiceAgentRow {
  id: string
  name: string
  phone_number: string
  languages: unknown
  voice_by_language: unknown
  upsell_enabled: boolean
  max_discount_percent: number
  transfer_to_human_on: unknown
  after_hours_message: string | null
  active: boolean
}

export interface CallMessageRow {
  id: string
  call_id: string
  role: 'caller' | 'agent' | 'system'
  text: string
  language: string | null
}

export interface CallActionRow {
  id: string
  call_id: string
  tool: string
  arguments: unknown
  result: unknown
}

/** Parse the agent's languages jsonb defensively. */
export function agentLanguages(agent: Pick<VoiceAgentRow, 'languages'>): string[] {
  const raw = agent.languages
  if (Array.isArray(raw)) return raw.filter((l): l is string => typeof l === 'string')
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter((l): l is string => typeof l === 'string')
    } catch (_error) {
      /* fall through */
    }
  }
  return ['en']
}

function parseJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((l): l is string => typeof l === 'string')
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter((l): l is string => typeof l === 'string')
    } catch (_error) {
      /* fall through */
    }
  }
  return []
}

async function recordAction(
  callId: string,
  tool: string,
  args: unknown,
  result: unknown,
): Promise<void> {
  await create('call_actions', {
    call_id: callId,
    tool,
    arguments: JSON.stringify(args ?? {}),
    result: JSON.stringify(result ?? {}),
  })
}

function optionSummaryLine(option: AvailabilityOption): string {
  const name = option.room_type.name
  const avg = (option.avg_rate_cents / 100).toFixed(0)
  const total = (option.total_cents / 100).toFixed(0)
  return `${name} — $${avg}/night avg, $${total} total (${option.rooms_available} left)`
}

export interface AgentTurnContext {
  call: CallRow
  agent: VoiceAgentRow
}

/**
 * Build the PMS tools for one call. The SAME tool objects serve both
 * engines; each execute() records its `call_actions` row.
 */
export function buildPmsTools(ctx: AgentTurnContext): AITool[] {
  const { call } = ctx

  const searchAvailabilityTool: AITool = {
    name: 'search_availability',
    description:
      'Search available room types for a date range and party size. Returns each available room type with computed nightly and total rates.',
    parameters: {
      type: 'object',
      properties: {
        check_in: { type: 'string', description: 'Check-in date, YYYY-MM-DD' },
        check_out: { type: 'string', description: 'Check-out date, YYYY-MM-DD' },
        guests: { type: 'number', description: 'Number of guests' },
      },
      required: ['check_in', 'check_out'],
    },
    execute: async (input) => {
      const args = (input ?? {}) as { check_in: string; check_out: string; guests?: number }
      try {
        const options = await searchAvailability({
          check_in: args.check_in,
          check_out: args.check_out,
          guests: args.guests ?? 1,
        })
        const payload = {
          available: options.length > 0,
          options: options.map((o) => ({
            room_type_id: o.room_type.id,
            name: o.room_type.name,
            occupancy: o.room_type.occupancy,
            avg_rate_cents: o.avg_rate_cents,
            total_cents: o.total_cents,
            rooms_available: o.rooms_available,
          })),
        }
        await recordAction(call.id, 'search_availability', args, payload)
        return payload
      } catch (error) {
        const payload = { error: (error as Error).message }
        await recordAction(call.id, 'search_availability', args, payload)
        return payload
      }
    },
  }

  const createReservationTool: AITool = {
    name: 'create_reservation',
    description:
      'Book a room for the caller. Use a room_type_id and dates previously confirmed available via search_availability. Returns the confirmation code.',
    parameters: {
      type: 'object',
      properties: {
        room_type_id: { type: 'string' },
        guest_name: { type: 'string' },
        guest_contact: { type: 'string', description: 'Phone or email, if the caller shared one' },
        check_in: { type: 'string' },
        check_out: { type: 'string' },
        guests: { type: 'number' },
      },
      required: ['room_type_id', 'guest_name', 'check_in', 'check_out'],
    },
    execute: async (input) => {
      const args = (input ?? {}) as {
        room_type_id: string
        guest_name: string
        guest_contact?: string
        check_in: string
        check_out: string
        guests?: number
      }
      try {
        const reservation = await createReservationInternal({
          room_type_id: args.room_type_id,
          guest_name: args.guest_name,
          guest_contact: args.guest_contact ?? null,
          check_in: args.check_in,
          check_out: args.check_out,
          guests: args.guests ?? 1,
          source: 'phone',
          created_by: call.user_id,
        })
        const payload = {
          reservation_id: reservation.id,
          confirmation_code: reservation.confirmation_code,
          total_cents: reservation.total_cents,
        }
        await recordAction(call.id, 'create_reservation', args, payload)
        return payload
      } catch (error) {
        const payload = { error: (error as Error).message }
        await recordAction(call.id, 'create_reservation', args, payload)
        return payload
      }
    },
  }

  const lookupReservationTool: AITool = {
    name: 'lookup_reservation',
    description: 'Look up an existing reservation by its 8-character confirmation code.',
    parameters: {
      type: 'object',
      properties: { confirmation_code: { type: 'string' } },
      required: ['confirmation_code'],
    },
    execute: async (input) => {
      const args = (input ?? {}) as { confirmation_code: string }
      try {
        const reservation: ReservationRow | null = await lookupReservationByCode(
          args.confirmation_code ?? '',
        )
        const payload = reservation
          ? {
              found: true,
              guest_name: reservation.guest_name,
              check_in: reservation.check_in,
              check_out: reservation.check_out,
              status: reservation.status,
            }
          : { found: false }
        await recordAction(call.id, 'lookup_reservation', args, payload)
        return payload
      } catch (error) {
        const payload = { error: (error as Error).message }
        await recordAction(call.id, 'lookup_reservation', args, payload)
        return payload
      }
    },
  }

  return [searchAvailabilityTool, createReservationTool, lookupReservationTool]
}

/** Build the multilingual system prompt from the voice agent's configuration. */
export function buildSystemPrompt(agent: VoiceAgentRow): string {
  const languages = agentLanguages(agent)
  const transferOn = parseJsonArray(agent.transfer_to_human_on)
  return [
    `You are ${agent.name}, the AI phone receptionist for the hotel. You answer inbound calls on ${agent.phone_number}.`,
    '',
    'LANGUAGE RULES (most important):',
    `- Detect the caller's language from what they say and ALWAYS reply in that language.`,
    `- You speak exactly these languages: ${languages.join(', ')}.`,
    '- If the caller speaks a language outside that set, apologize briefly in English and offer to transfer to a human.',
    '- This is a PHONE call: keep every reply short (2-4 sentences), plain, and spoken-style. No markdown, no lists longer than three options.',
    '',
    'TOOLS: use search_availability to answer availability and price questions; use create_reservation to book once the caller confirms a specific room type and dates; use lookup_reservation when the caller gives a confirmation code. Always search before you book, and only quote prices returned by the tools.',
    '',
    'POLICY:',
    `- Upselling upgraded room types is ${agent.upsell_enabled ? 'ALLOWED — mention the next tier up once per call when relevant' : 'NOT allowed'}.`,
    `- You may not discount beyond ${agent.max_discount_percent}% — and only mention discounts if the caller pushes on price.`,
    `- Transfer to a human colleague when: ${transferOn.join(', ')}.`,
    agent.after_hours_message ? `After hours you open with: "${agent.after_hours_message}"` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export interface AgentTurnResult {
  reply: string
  replyLanguage: string
  detectedLanguage: string
  engine: 'llm' | 'scripted'
}

/**
 * Run ONE agent turn in LLM mode. Throws on any provider/agent failure so
 * the caller can fall back to the scripted engine.
 */
export async function runLlmTurn(
  ctx: AgentTurnContext,
  history: ReadonlyArray<CallMessageRow>,
  utterance: string,
  detectedLanguage: string,
): Promise<string> {
  const languages = agentLanguages(ctx.agent)
  const replyLanguage = resolveReplyLanguage(detectedLanguage, languages)
  const system = buildSystemPrompt(ctx.agent)
  const messages: ChatMessage[] = [
    ...history.map((m) => ({
      role: m.role === 'caller' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    })),
    { role: 'user', content: utterance },
  ]
  const result = await requireAgents().run({
    messages,
    system,
    tools: buildPmsTools(ctx),
    maxSteps: 6,
  })
  if (!result.output || result.output.trim().length === 0) {
    throw new Error('agent produced no output')
  }
  void replyLanguage
  return result.output.trim()
}

/* ------------------------------------------------------------------ *
 * Scripted engine                                                     *
 * ------------------------------------------------------------------ */

const BOOKING_INTENT =
  /(book|reserv|availab|vacanc|room|night|stay|noche|noches|habitaci|chambre|nuit|nuits|disponi|zimmer|nacht|nächte|verfüg|预订|预约|订房|予約|部屋|宿泊)/i

const CONFIRM_INTENT =
  /(\byes\b|\byep\b|\bok\b|\bokay\b|\bsure\b|\bconfirm\b|book it|the first|first one|la primera|el primero|\bsí\b|\bsi\b|\bclaro\b|\boui\b|\bd'accord\b|\bja\b|\bbitte\b|是的|好的|可以|はい|ええ|お願い)/i

const WORD_NUMBERS: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  tres: 3,
  trois: 3,
  drei: 3,
  four: 4,
  cuatro: 4,
  five: 5,
  cinco: 5,
  six: 6,
  seis: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
}

function parseGuests(utterance: string): number {
  const digit = utterance.match(/\b([1-9])\b/)
  if (digit) return Number(digit[1])
  const lowered = utterance.toLowerCase()
  for (const [word, n] of Object.entries(WORD_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`).test(lowered)) return n
  }
  return 2
}

async function lastSearchAction(
  callId: string,
): Promise<{ check_in: string; check_out: string; guests?: number } | null> {
  const actions = await findMany<CallActionRow>('call_actions', {
    where: [
      { field: 'call_id', operator: '=', value: callId },
      { field: 'tool', operator: '=', value: 'search_availability' },
    ],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })
  const latest = actions[0]
  if (!latest) return null
  try {
    const parsed =
      typeof latest.arguments === 'string' ? JSON.parse(latest.arguments) : latest.arguments
    const args = parsed as { check_in?: string; check_out?: string; guests?: number }
    if (!args.check_in || !args.check_out) return null
    return { check_in: args.check_in, check_out: args.check_out, guests: args.guests }
  } catch (_error) {
    return null
  }
}

/**
 * Run ONE agent turn in scripted mode. Deterministic: intent classification
 * + canned replies in the reply language, tools executed for real through
 * the shared PMS library (so a scripted booking creates a REAL reservation
 * row and REAL call_actions rows).
 */
export async function runScriptedTurn(
  ctx: AgentTurnContext,
  utterance: string,
  detectedLanguage: string,
): Promise<string> {
  const languages = agentLanguages(ctx.agent)
  const replyLanguage = resolveReplyLanguage(detectedLanguage, languages)

  // A confirm following an earlier offer → book the first option the
  // previous search returned, on the same window.
  const priorSearch = await lastSearchAction(ctx.call.id)
  if (priorSearch && CONFIRM_INTENT.test(utterance)) {
    const options = await searchAvailability({
      check_in: priorSearch.check_in,
      check_out: priorSearch.check_out,
      guests: priorSearch.guests ?? 1,
    })
    const pick = options[0]
    if (pick) {
      const reservation = await createReservationInternal({
        room_type_id: pick.room_type.id,
        guest_name: 'Phone guest',
        check_in: priorSearch.check_in,
        check_out: priorSearch.check_out,
        guests: priorSearch.guests ?? 1,
        source: 'phone',
        created_by: ctx.call.user_id,
      })
      await recordAction(
        ctx.call.id,
        'create_reservation',
        {
          room_type_id: pick.room_type.id,
          guest_name: 'Phone guest',
          check_in: priorSearch.check_in,
          check_out: priorSearch.check_out,
          guests: priorSearch.guests ?? 1,
        },
        {
          reservation_id: reservation.id,
          confirmation_code: reservation.confirmation_code,
          total_cents: reservation.total_cents,
        },
      )
      const vars: ScriptedReplyVars = {
        roomTypeName: pick.room_type.name,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        totalCents: reservation.total_cents,
        confirmationCode: reservation.confirmation_code,
      }
      return scriptedReply(replyLanguage, 'booked', vars)
    }
    return scriptedReply(replyLanguage, 'info')
  }

  // A booking/availability question → search the next weekend window and
  // offer what is left.
  if (BOOKING_INTENT.test(utterance)) {
    const checkIn = nextFridayIso()
    const checkOut = isoPlusDays(2, new Date(checkIn + 'T00:00:00Z'))
    const guests = parseGuests(utterance)
    const options = await searchAvailability({ check_in: checkIn, check_out: checkOut, guests })
    await recordAction(
      ctx.call.id,
      'search_availability',
      { check_in: checkIn, check_out: checkOut, guests },
      {
        available: options.length > 0,
        options: options.map((o) => ({
          room_type_id: o.room_type.id,
          name: o.room_type.name,
          avg_rate_cents: o.avg_rate_cents,
          total_cents: o.total_cents,
          rooms_available: o.rooms_available,
        })),
      },
    )
    if (options.length === 0) {
      return scriptedReply(replyLanguage, 'info')
    }
    const optionsText = options.slice(0, 3).map(optionSummaryLine).join(' · ')
    return scriptedReply(replyLanguage, 'offer', {
      options: optionsText,
      checkIn,
      checkOut,
    })
  }

  return scriptedReply(replyLanguage, 'info')
}

/** Detect + resolve the languages for a caller utterance. */
export function detectTurnLanguages(
  utterance: string,
  agent: VoiceAgentRow,
): { detected: string; reply: string } {
  const detected = detectLanguage(utterance)
  return { detected, reply: resolveReplyLanguage(detected, agentLanguages(agent)) }
}

/** Fetch a voice agent row or null. */
export async function getVoiceAgent(id: string): Promise<VoiceAgentRow | null> {
  return findById<VoiceAgentRow>('voice_agents', id)
}

/** Log a scripted-fallback event (surfaced in server logs only). */
export function logScriptedFallback(callId: string, reason: string): void {
  logger.warn?.(`call ${callId}: falling back to scripted agent (${reason})`)
}
