import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { GeneratedPasswordCard } from '../components/GeneratedPasswordCard.js'

type GeneratorMode = 'password' | 'passphrase' | 'pin'

const PWD_CHARSETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}<>?',
}

/** Characters stripped from the pool when "Avoid ambiguous chars" is on. */
const AMBIGUOUS_CHARS = new Set(['l', '1', 'I', 'O', '0'])

const PASSPHRASE_WORDS = [
  'shield',
  'crystal',
  'beacon',
  'orchid',
  'cipher',
  'storm',
  'velvet',
  'cobalt',
  'lantern',
  'vault',
  'meadow',
  'ember',
  'wraith',
  'lyric',
  'falcon',
  'glade',
  'silk',
  'brook',
  'horizon',
  'mosaic',
]

interface HistoryRow {
  value: string
  strength: 1 | 2 | 3 | 4
  generatedAt: number
}

function relativeAge(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 5_000) return 'Just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

/** Cryptographically-seeded random index in [0, max). */
function randomIndex(max: number): number {
  const arr = new Uint32Array(1)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(arr)
  } else {
    arr[0] = Math.floor(Math.random() * 0xffff_ffff)
  }
  return arr[0] % max
}

interface PasswordOpts {
  length: number
  uppercase: boolean
  lowercase: boolean
  digits: boolean
  symbols: boolean
  avoidAmbiguous: boolean
  requireEach: boolean
}

/** Enabled charsets, each stripped of ambiguous chars when requested. */
function activeCharsets(opts: PasswordOpts): string[] {
  const strip = (chars: string): string =>
    opts.avoidAmbiguous ? [...chars].filter((c) => !AMBIGUOUS_CHARS.has(c)).join('') : chars
  const sets: string[] = []
  if (opts.uppercase) sets.push(strip(PWD_CHARSETS.upper))
  if (opts.lowercase) sets.push(strip(PWD_CHARSETS.lower))
  if (opts.digits) sets.push(strip(PWD_CHARSETS.digits))
  if (opts.symbols) sets.push(strip(PWD_CHARSETS.symbols))
  return sets.filter(Boolean)
}

function generatePassword(opts: PasswordOpts): string {
  const sets = activeCharsets(opts)
  const pool = sets.join('')
  if (!pool) return ''
  const arr = new Uint32Array(opts.length)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(arr)
  } else {
    for (let i = 0; i < opts.length; i++) arr[i] = Math.floor(Math.random() * 0xffff_ffff)
  }
  const chars: string[] = []
  for (let i = 0; i < opts.length; i++) chars.push(pool[arr[i] % pool.length])
  if (opts.requireEach) {
    // Replace distinct random positions so every enabled charset appears.
    const usedPositions = new Set<number>()
    for (const set of sets) {
      if (chars.some((c) => set.includes(c))) continue
      let pos = randomIndex(chars.length)
      while (usedPositions.has(pos)) pos = (pos + 1) % chars.length
      usedPositions.add(pos)
      chars[pos] = set[randomIndex(set.length)]
    }
  }
  return chars.join('')
}

function generatePassphrase(words: number): string {
  const out: string[] = []
  for (let i = 0; i < words; i++) {
    out.push(PASSPHRASE_WORDS[randomIndex(PASSPHRASE_WORDS.length)])
  }
  return out.join('-')
}

function generatePin(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) out += randomIndex(10)
  return out
}

function strengthFor(value: string): 1 | 2 | 3 | 4 {
  if (value.length < 8) return 1
  if (value.length < 12) return 2
  if (value.length < 16) return 3
  return 4
}

/** Entropy in bits for the generated secret, from the real pool sizes. */
function entropyBitsFor(mode: GeneratorMode, value: string, opts: PasswordOpts): number {
  if (mode === 'passphrase') {
    const wordCount = value ? value.split('-').length : 0
    return Math.round(wordCount * Math.log2(PASSPHRASE_WORDS.length))
  }
  if (mode === 'pin') return Math.round(value.length * Math.log2(10))
  const poolSize = activeCharsets(opts).join('').length
  return poolSize > 1 ? Math.round(value.length * Math.log2(poolSize)) : 0
}

const INITIAL_OPTS: PasswordOpts = {
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: true,
  requireEach: true,
}

export function Generator() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [mode, setMode] = useState<GeneratorMode>('password')
  const [length, setLength] = useState(20)
  const [pinLength, setPinLength] = useState(6)
  const [words, setWords] = useState(5)
  const [uppercase, setUppercase] = useState(true)
  const [lowercase, setLowercase] = useState(true)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [avoidAmbig, setAvoidAmbig] = useState(true)
  const [requireEach, setRequireEach] = useState(true)

  const [generated, setGenerated] = useState<{ value: string; bits: number }>(() => {
    const value = generatePassword(INITIAL_OPTS)
    return { value, bits: entropyBitsFor('password', value, INITIAL_OPTS) }
  })
  const value = generated.value
  const entropyBits = generated.bits
  const [history, setHistory] = useState<HistoryRow[]>([])

  const regenerate = useCallback(() => {
    const opts: PasswordOpts = {
      length,
      uppercase,
      lowercase,
      digits,
      symbols,
      avoidAmbiguous: avoidAmbig,
      requireEach,
    }
    let next = ''
    if (mode === 'password') next = generatePassword(opts)
    else if (mode === 'passphrase') next = generatePassphrase(words)
    else next = generatePin(pinLength)
    if (next) {
      setGenerated({ value: next, bits: entropyBitsFor(mode, next, opts) })
      // Domain analytics — shape metadata only, NEVER the generated value.
      void track({
        name: 'password.generated',
        properties: {
          mode,
          length: mode === 'passphrase' ? words : mode === 'pin' ? pinLength : length,
        },
      })
      setHistory((prev) =>
        [{ value: next, strength: strengthFor(next), generatedAt: Date.now() }, ...prev].slice(
          0,
          10,
        ),
      )
    }
  }, [
    mode,
    length,
    words,
    pinLength,
    uppercase,
    lowercase,
    digits,
    symbols,
    avoidAmbig,
    requireEach,
  ])

  const strength = strengthFor(value)
  const entropyQuality =
    entropyBits >= 80
      ? t('generator.quality.veryStrong', {}, { defaultValue: 'very strong' })
      : entropyBits >= 60
        ? t('generator.quality.strong', {}, { defaultValue: 'strong' })
        : entropyBits >= 40
          ? t('generator.quality.fair', {}, { defaultValue: 'fair' })
          : t('generator.quality.weak', {}, { defaultValue: 'weak' })
  const entropy = t(
    'generator.entropyLabel',
    { bits: entropyBits, quality: entropyQuality },
    { defaultValue: '{{bits}} bits of entropy · {{quality}}' },
  )

  const modeBtn = (id: GeneratorMode, labelKey: string, defaultLabel: string) => {
    const active = mode === id
    return (
      <button
        key={id}
        type="button"
        onClick={() => setMode(id)}
        className={cm.cn(
          cm.sp('px', 4),
          cm.fontWeight('medium'),
          cm.textSize('sm'),
          'rounded-md py-1.5 transition-colors',
          active
            ? 'bg-surface text-primary shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface',
        )}
      >
        {t(labelKey, {}, { defaultValue: defaultLabel })}
      </button>
    )
  }

  const charToggle = (
    on: boolean,
    setOn: (v: boolean) => void,
    labelKey: string,
    defaultLabel: string,
  ) => (
    <label
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('p', 3),
        cm.cursorPointer,
        'rounded-lg border border-primary-light/40 bg-surface-container-low/60 hover:bg-surface-container-low transition-colors',
      )}
    >
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => setOn(e.target.checked)}
        className={cm.cn('w-5 h-5 rounded-md text-primary focus:ring-primary')}
      />
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}>
        {t(labelKey, {}, { defaultValue: defaultLabel })}
      </span>
    </label>
  )

  const switchToggle = (
    on: boolean,
    setOn: (v: boolean) => void,
    labelKey: string,
    defaultLabel: string,
  ) => (
    <label
      className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.cursorPointer, 'group')}
    >
      <span
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'text-on-surface group-hover:text-primary transition-colors',
        )}
      >
        {t(labelKey, {}, { defaultValue: defaultLabel })}
      </span>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => setOn(e.target.checked)}
        className="sr-only"
      />
      <span
        className={cm.cn(
          'w-10 h-6 rounded-full relative transition-colors shadow-inner',
          on ? 'bg-primary' : 'bg-surface-container',
        )}
        aria-hidden="true"
      >
        <span
          className={cm.cn(
            'absolute top-1 w-4 h-4 bg-surface rounded-full shadow-sm transition-all',
            on ? 'right-1' : 'left-1',
          )}
        />
      </span>
    </label>
  )

  return (
    <div
      className={cm.cn(
        'p-4 md:p-8',
        cm.flex({ direction: 'col', gap: 'xl' }),
        cm.maxW('5xl'),
        'mx-auto',
      )}
    >
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('generator.eyebrow', {}, { defaultValue: 'Vault · Generator' })}
        </span>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('generator.heading', {}, { defaultValue: 'Password generator' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
          {t(
            'generator.subhead',
            {},
            {
              defaultValue:
                'Create unguessable passwords, one-time codes, and passphrases — all locally on your device.',
            },
          )}
        </p>
      </header>

      <GeneratedPasswordCard
        password={value || '—'}
        strength={strength}
        entropyLabel={entropy}
        onRegenerate={regenerate}
        onUseInLogin={() => navigate('/vault/new', { state: { generatedPassword: value } })}
      />

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-start')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'lg' }),
            'lg:col-span-7 bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
          )}
        >
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('generator.customize', {}, { defaultValue: 'Customize' })}
          </h3>

          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('p', 1),
              'self-start bg-surface-container-low rounded-lg',
            )}
          >
            {modeBtn('password', 'generator.mode.password', 'Password')}
            {modeBtn('passphrase', 'generator.mode.passphrase', 'Passphrase')}
            {modeBtn('pin', 'generator.mode.pin', 'PIN')}
          </div>

          {mode === 'password' && (
            <>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <label
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}
                  >
                    {t('generator.length', {}, { defaultValue: 'Length' })}
                  </label>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'bg-primary-light text-primary-dark rounded-md',
                    )}
                  >
                    {length}
                  </span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className={cm.cn('w-full accent-primary')}
                />
              </div>

              <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 md:grid-cols-2')}>
                {charToggle(uppercase, setUppercase, 'generator.upper', 'Uppercase (A-Z)')}
                {charToggle(lowercase, setLowercase, 'generator.lower', 'Lowercase (a-z)')}
                {charToggle(digits, setDigits, 'generator.digits', 'Numbers (0-9)')}
                {charToggle(symbols, setSymbols, 'generator.symbols', 'Symbols (!@#$)')}
              </div>

              <div
                className={cm.cn(
                  cm.sp('pt', 4),
                  cm.flex({ direction: 'col', gap: 'md' }),
                  'border-t border-surface-container',
                )}
              >
                {switchToggle(
                  avoidAmbig,
                  setAvoidAmbig,
                  'generator.avoidAmbig',
                  'Avoid ambiguous chars (l, 1, O, 0)',
                )}
                {switchToggle(
                  requireEach,
                  setRequireEach,
                  'generator.requireEach',
                  'Require at least one of each',
                )}
              </div>
            </>
          )}

          {mode === 'passphrase' && (
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <label
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}
                >
                  {t('generator.words', {}, { defaultValue: 'Word count' })}
                </label>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'bg-primary-light text-primary-dark rounded-md',
                  )}
                >
                  {words}
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={8}
                value={words}
                onChange={(e) => setWords(Number(e.target.value))}
                className={cm.cn('w-full accent-primary')}
              />
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'generator.passphraseHint',
                  {},
                  { defaultValue: 'Hyphen-separated words from a curated word list.' },
                )}
              </p>
            </div>
          )}

          {mode === 'pin' && (
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <label
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}
                >
                  {t('generator.pinLength', {}, { defaultValue: 'PIN length' })}
                </label>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'bg-primary-light text-primary-dark rounded-md',
                  )}
                >
                  {pinLength}
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={12}
                value={pinLength}
                onChange={(e) => setPinLength(Number(e.target.value))}
                className={cm.cn('w-full accent-primary')}
              />
            </div>
          )}
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'md' }),
            'lg:col-span-5 bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
          )}
        >
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('generator.recent', {}, { defaultValue: 'Recent generated' })}
          </h3>
          {history.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('p', 4),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
              data-testid="generator-history-empty"
            >
              {t(
                'generator.historyEmpty',
                {},
                { defaultValue: 'Generate something to populate history.' },
              )}
            </p>
          ) : (
            <ul
              className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}
              data-testid="generator-history"
            >
              {history.map((row, i) => (
                <li
                  key={`${row.generatedAt}-${i}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 3),
                    'rounded-lg hover:bg-surface-container-low transition-colors group border border-transparent hover:border-surface-container',
                  )}
                >
                  <span
                    className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'overflow-hidden')}
                  >
                    <span
                      className={cm.cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        row.strength === 4
                          ? 'bg-emerald-500'
                          : row.strength === 3
                            ? 'bg-emerald-400'
                            : row.strength === 2
                              ? 'bg-amber-500'
                              : 'bg-red-500',
                      )}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn(
                        cm.fontWeight('medium'),
                        cm.textSize('sm'),
                        'font-mono text-on-surface truncate',
                      )}
                    >
                      {row.value}
                    </span>
                  </span>
                  <span
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant flex-shrink-0')}
                  >
                    {relativeAge(row.generatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.sp('pt', 3),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-on-surface-variant border-t border-surface-container',
            )}
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              lock
            </span>
            {t('generator.historyLocal', {}, { defaultValue: 'History never leaves this device.' })}
          </p>
        </section>
      </div>

      <section
        className={cm.cn(cm.sp('p', 6), 'bg-indigo-950 text-white rounded-2xl shadow-inner')}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('mb', 4),
            'text-emerald-300',
          )}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            analytics
          </span>
          <h3
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest',
            )}
          >
            {t('generator.audit', {}, { defaultValue: 'Password audit' })}
          </h3>
        </div>
        <div
          className={cm.cn(
            cm.grid({ gap: 'md' }),
            'grid-cols-2 md:grid-cols-4 divide-x divide-indigo-900',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              cm.sp('px', 4),
              'first:pl-0',
            )}
          >
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-indigo-300')}>
              {t('generator.metric.session', {}, { defaultValue: 'Generated this session' })}
            </span>
            <span
              className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-white')}
              data-testid="generator-session-count"
            >
              {history.length}
            </span>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('px', 4))}>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-indigo-300')}>
              {t('generator.metric.last', {}, { defaultValue: 'Most recent' })}
            </span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'font-mono text-emerald-300 truncate',
              )}
            >
              {history[0]?.value ?? '—'}
            </span>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('px', 4))}>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-indigo-300')}>
              {t('generator.metric.avgLen', {}, { defaultValue: 'Avg length' })}
            </span>
            <span className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-white')}>
              {history.length === 0
                ? '—'
                : Math.round(history.reduce((s, h) => s + h.value.length, 0) / history.length)}
              <span className={cm.cn(cm.textSize('sm'), 'text-indigo-400 font-medium ml-1')}>
                {t('generator.metric.chars', {}, { defaultValue: 'chars' })}
              </span>
            </span>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('px', 4))}>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-indigo-300')}>
              {t('generator.metric.currentEntropy', {}, { defaultValue: 'Current entropy' })}
            </span>
            <span className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-emerald-300')}>
              {entropyBits}
              <span className={cm.cn(cm.textSize('sm'), 'text-emerald-400 font-medium ml-1')}>
                {t('generator.metric.bits', {}, { defaultValue: 'bits' })}
              </span>
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Generator
