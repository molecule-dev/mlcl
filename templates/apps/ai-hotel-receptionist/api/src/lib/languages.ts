/**
 * Language support for the multilingual voice receptionist.
 *
 * Two responsibilities:
 *
 * 1. **Deterministic language detection** from caller utterance text
 *    (script + unicode-range heuristics + stopword scoring). The same text
 *    always detects the same language — no model call — so the scripted
 *    demo mode, e2e tests, and the `calls.detected_language` column all
 *    behave identically without an AI key.
 *
 * 2. **Scripted reply catalogue** for demo mode: a canned booking
 *    conversation per supported language. These are runtime *agent output*
 *    strings, deliberately NOT app i18n keys — the UI chrome around them is
 *    what goes through `t()`.
 *
 * @module
 */

/** BCP-47 codes the seeded voice agents speak by default. */
export const DEFAULT_AGENT_LANGUAGES = ['en', 'es', 'fr', 'de', 'zh', 'ja'] as const

/** Every language the detector can name. Agents only reply in their configured set. */
export const DETECTABLE_LANGUAGES = [...DEFAULT_AGENT_LANGUAGES, 'it', 'pt', 'ru', 'ko'] as const

export type DetectableLanguage = (typeof DETECTABLE_LANGUAGES)[number]

const LATIN_STOPWORDS: Readonly<
  Record<Exclude<DetectableLanguage, 'zh' | 'ja' | 'ko' | 'ru'>, readonly string[]>
> = {
  en: [
    'hello',
    'hi',
    'room',
    'night',
    'nights',
    'book',
    'booking',
    'reserve',
    'reservation',
    'available',
    'availability',
    'thank',
    'please',
    'would',
    'like',
    'double',
    'price',
    'how much',
    'guests',
  ],
  es: [
    'hola',
    'buenas',
    'habitacion',
    'habitación',
    'noche',
    'noches',
    'reservar',
    'reserva',
    'disponible',
    'gracias',
    'por favor',
    'quiero',
    'querría',
    'cuanto',
    'cuánto',
    'precio',
    'personas',
  ],
  fr: [
    'bonjour',
    'bonsoir',
    'chambre',
    'nuit',
    'nuits',
    'reserver',
    'réserver',
    'reservation',
    'réservation',
    'disponible',
    'merci',
    'sil vous',
    "s'il vous",
    'je voudrais',
    'combien',
    'prix',
    'personnes',
  ],
  de: [
    'guten',
    'hallo',
    'zimmer',
    'nacht',
    'nächte',
    'nachte',
    'reservieren',
    'reservierung',
    'verfugbar',
    'verfügbar',
    'danke',
    'bitte',
    'ich mochte',
    'möchte',
    'wie viel',
    'preis',
    'personen',
  ],
  it: [
    'buongiorno',
    'camera',
    'notte',
    'notti',
    'prenotare',
    'prenotazione',
    'disponibile',
    'grazie',
    'per favore',
    'vorrei',
    'quanto',
    'prezzo',
    'persone',
  ],
  pt: [
    'ola',
    'olá',
    'quarto',
    'noite',
    'noites',
    'reservar',
    'reserva',
    'disponivel',
    'disponível',
    'obrigado',
    'por favor',
    'gostaria',
    'quanto',
    'preco',
    'preço',
    'pessoas',
  ],
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Detect the language of a caller utterance. Deterministic and offline:
 * script ranges first (CJK/Cyrillic), then Latin stopword scoring, then
 * English fallback. Returns a BCP-47 code from DETECTABLE_LANGUAGES.
 */
export function detectLanguage(text: string): DetectableLanguage {
  const raw = text.trim()
  if (!raw) return 'en'

  // Script-range checks — unambiguous and cheap.
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(raw)) return 'ja' // kana
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(raw)) return 'ko' // hangul
  if (/[\u4e00-\u9fff]/.test(raw)) return 'zh' // han (after kana check)
  if (/[\u0400-\u04ff]/.test(raw)) return 'ru' // cyrillic

  const normalized =
    ' ' +
    normalize(raw)
      .replace(/[^a-z0-9\s']/g, ' ')
      .replace(/\s+/g, ' ') +
    ' '
  let best: DetectableLanguage = 'en'
  let bestScore = 0
  const candidates = Object.keys(LATIN_STOPWORDS) as Array<keyof typeof LATIN_STOPWORDS>
  for (const lang of candidates) {
    let score = 0
    for (const word of LATIN_STOPWORDS[lang]) {
      if (normalized.includes(' ' + word + ' ') || normalized.includes(' ' + word)) score++
    }
    if (score > bestScore) {
      best = lang
      bestScore = score
    }
  }
  return best
}

/**
 * Pick the language the agent should actually reply in: the detected
 * language when the agent speaks it, otherwise the agent's first
 * configured language (a real receptionist switches to a language they
 * speak rather than guessing).
 */
export function resolveReplyLanguage(detected: string, agentLanguages: readonly string[]): string {
  const first = agentLanguages[0] ?? 'en'
  return agentLanguages.includes(detected) ? detected : first
}

export interface ScriptedReplyVars {
  hotelName?: string
  options?: string
  confirmationCode?: string
  checkIn?: string
  checkOut?: string
  roomTypeName?: string
  totalCents?: number
}

function money(cents: number | undefined): string {
  if (cents === undefined) return ''
  return '$' + (cents / 100).toFixed(0)
}

function interpolate(template: string, vars: ScriptedReplyVars): string {
  return template
    .replace(/\{\{options\}\}/g, vars.options ?? '')
    .replace(/\{\{confirmationCode\}\}/g, vars.confirmationCode ?? '')
    .replace(/\{\{checkIn\}\}/g, vars.checkIn ?? '')
    .replace(/\{\{checkOut\}\}/g, vars.checkOut ?? '')
    .replace(/\{\{roomTypeName\}\}/g, vars.roomTypeName ?? '')
    .replace(/\{\{total\}\}/g, money(vars.totalCents))
}

/**
 * Scripted (deterministic) agent replies per language. Used when no AI
 * provider is reachable so the simulated call still walks a complete
 * booking conversation in the caller's language. Keys: greeting, askDates,
 * offer, confirm, booked, info, farewell.
 */
export const SCRIPTED_REPLIES: Readonly<
  Record<string, Readonly<Record<'greeting' | 'offer' | 'booked' | 'info' | 'farewell', string>>>
> = {
  en: {
    greeting: 'Thank you for calling. This is the front desk — how may I help you tonight?',
    offer:
      'I can offer the following for those dates: {{options}}. Would you like me to book one for you?',
    booked:
      'Wonderful — you are all set. {{roomTypeName}} from {{checkIn}} to {{checkOut}}, total {{total}}. Your confirmation code is {{confirmationCode}}. We look forward to having you.',
    info: 'Of course. I can check availability, answer questions about the hotel, and book a room — just tell me the dates you have in mind.',
    farewell: 'Thank you for calling. We look forward to welcoming you.',
  },
  es: {
    greeting: 'Gracias por llamar. Le atiende recepción — ¿en qué puedo ayudarle?',
    offer:
      'Para esas fechas puedo ofrecerle lo siguiente: {{options}}. ¿Desea que le reserve una habitación?',
    booked:
      'Perfecto, todo está listo. {{roomTypeName}} del {{checkIn}} al {{checkOut}}, total {{total}}. Su código de confirmación es {{confirmationCode}}. Estaremos encantados de recibirla.',
    info: 'Por supuesto. Puedo comprobar la disponibilidad, responder preguntas sobre el hotel y reservar una habitación — dígame las fechas que tiene en mente.',
    farewell: 'Gracias por llamar. Esperamos darle la bienvenida.',
  },
  fr: {
    greeting: 'Merci de votre appel. Ici la réception — comment puis-je vous aider ?',
    offer:
      'Pour ces dates, je peux vous proposer : {{options}}. Souhaitez-vous que je réserve une chambre ?',
    booked:
      'Parfait, c est noté. {{roomTypeName}} du {{checkIn}} au {{checkOut}}, total {{total}}. Votre code de confirmation est {{confirmationCode}}. Au plaisir de vous accueillir.',
    info: 'Bien sûr. Je peux vérifier la disponibilité, répondre à vos questions sur l hôtel et réserver une chambre — indiquez-moi simplement vos dates.',
    farewell: 'Merci de votre appel. Au plaisir de vous accueillir.',
  },
  de: {
    greeting: 'Danke für Ihren Anruf. Hier ist die Rezeption — wie kann ich Ihnen helfen?',
    offer:
      'Für diese Termine kann ich Ihnen anbieten: {{options}}. Soll ich ein Zimmer für Sie reservieren?',
    booked:
      'Wunderbar, alles ist erledigt. {{roomTypeName}} vom {{checkIn}} bis {{checkOut}}, insgesamt {{total}}. Ihr Bestätigungscode lautet {{confirmationCode}}. Wir freuen uns auf Sie.',
    info: 'Natürlich. Ich kann die Verfügbarkeit prüfen, Fragen zum Hotel beantworten und ein Zimmer reservieren — nennen Sie mir einfach Ihre Reisedaten.',
    farewell: 'Danke für Ihren Anruf. Wir freuen uns auf Ihren Besuch.',
  },
  zh: {
    greeting: '感谢来电。这里是前台——请问有什么可以帮您？',
    offer: '这些日期我可以为您提供：{{options}}。需要我为您预订一间吗？',
    booked:
      '好的，已为您预订。{{roomTypeName}}，{{checkIn}} 至 {{checkOut}}，共 {{total}}。您的确认码是 {{confirmationCode}}。期待您的光临。',
    info: '当然可以。我可以查询空房、解答酒店问题并为您预订房间——请告诉我您的入住日期。',
    farewell: '感谢来电，期待您的光临。',
  },
  ja: {
    greeting: 'お電話ありがとうございます。フロントでございます。ご用件をお伺いします。',
    offer: 'その日程でしたら、こちらのご用意がございます：{{options}}。ご予約なさいますか？',
    booked:
      'かしこまりました。{{roomTypeName}}、{{checkIn}}から{{checkOut}}まで、合計{{total}}です。確認コードは{{confirmationCode}}です。お待ちしております。',
    info: 'かしこまりました。空室のご確認、ホテルについてのご質問、ご予約のいずれも承れます。ご希望のお日にちをお知らせください。',
    farewell: 'お電話ありがとうございました。お待ちしております。',
  },
}

/** Get a scripted reply in `language`, falling back to English. */
export function scriptedReply(
  language: string,
  key: 'greeting' | 'offer' | 'booked' | 'info' | 'farewell',
  vars: ScriptedReplyVars = {},
): string {
  const table = SCRIPTED_REPLIES[language] ?? SCRIPTED_REPLIES.en!
  return interpolate(table[key], vars)
}
