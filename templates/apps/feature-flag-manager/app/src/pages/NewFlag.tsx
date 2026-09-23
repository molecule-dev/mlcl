import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EnvironmentBadge, type EnvTone } from '../components/EnvironmentBadge.js'

const FLAG_TYPES = ['boolean', 'multivariate', 'string', 'number'] as const
type FlagType = (typeof FLAG_TYPES)[number]

const ENV_OPTIONS: ReadonlyArray<{ key: EnvTone; defaultLabel: string }> = [
  { key: 'development', defaultLabel: 'Development' },
  { key: 'staging', defaultLabel: 'Staging' },
  { key: 'production', defaultLabel: 'Production' },
] as const

interface Variant {
  id: number
  key: string
  value: string
  weight: number
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export function NewFlag() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()

  const [name, setName] = useState('')
  const [keyOverride, setKeyOverride] = useState('')
  const [description, setDescription] = useState('')
  const [flagType, setFlagType] = useState<FlagType>('boolean')
  const [tags, setTags] = useState<string[]>(['experiment'])
  const [tagInput, setTagInput] = useState('')
  const [envs, setEnvs] = useState<Record<EnvTone, boolean>>({
    development: true,
    staging: false,
    production: false,
    custom: false,
  })
  const [defaultRule, setDefaultRule] = useState<string>('false')
  const [variants, setVariants] = useState<Variant[]>([
    { id: 1, key: 'control', value: '"control"', weight: 50 },
    { id: 2, key: 'variant_a', value: '"variant_a"', weight: 50 },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const derivedKey = useMemo(
    () => keyOverride || slugify(name) || 'new-flag-key',
    [name, keyOverride],
  )

  const addVariant = () => {
    setVariants((vs) => [
      ...vs,
      {
        id: Date.now(),
        key: `variant_${String.fromCharCode(97 + vs.length)}`,
        value: '""',
        weight: 0,
      },
    ])
  }

  const removeVariant = (id: number) => {
    setVariants((vs) => vs.filter((v) => v.id !== id))
  }

  const updateVariant = (id: number, patch: Partial<Variant>) => {
    setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)))
  }

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags((ts) => [...ts, trimmed])
      setTagInput('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const enabledEnvs = (Object.entries(envs) as [EnvTone, boolean][])
        .filter(([, on]) => on)
        .map(([k]) => k)
      const primaryEnv =
        enabledEnvs.find((e) => e === 'production') ??
        enabledEnvs.find((e) => e === 'staging') ??
        enabledEnvs[0] ??
        'production'
      const created = await http.post<{ key: string; id: string }>('/api/flags', {
        key: derivedKey,
        name,
        description,
        flag_type: flagType,
        environment: primaryEnv,
        is_enabled: enabledEnvs.length > 0,
        default_value: flagType === 'boolean' ? defaultRule === 'true' : defaultRule,
      })
      const newKey = created.data?.key ?? derivedKey
      void track({
        name: 'flag.created',
        properties: {
          flag_id: created.data?.id,
          key: newKey,
          flag_type: flagType,
          environment: primaryEnv,
        },
      })
      navigate(`/flags/${newKey}`)
    } catch (error) {
      // Stay on the form so the user can adjust — and tell them why it
      // failed (e.g. duplicate key, or the plan's flag limit was reached).
      setSubmitError(error instanceof Error ? error.message : 'request failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))} data-mol-id="page-new-flag">
      <div>
        <nav
          className={cm.flex({ align: 'center', gap: 'xs' })}
          aria-label={t('nav.breadcrumb', {}, { defaultValue: 'Breadcrumb' })}
        >
          <Link
            to="/flags"
            className={cm.cn(
              'font-mono text-xs text-on-surface-variant hover:opacity-80 transition-opacity',
            )}
          >
            {t('newFlag.crumb.flags', {}, { defaultValue: 'Flags' })}
          </Link>
          <span className={cm.cn('text-on-surface-variant')} aria-hidden="true">
            /
          </span>
          <span className={cm.cn('font-mono text-xs text-on-surface')}>
            {t('newFlag.crumb.new', {}, { defaultValue: 'New flag' })}
          </span>
        </nav>
        <h1 className={cm.cn('mt-2 text-3xl font-extrabold tracking-tight text-on-surface')}>
          {t('newFlag.heading', {}, { defaultValue: 'Create flag' })}
        </h1>
        <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
          {t(
            'newFlag.subheading',
            {},
            {
              defaultValue:
                'Define an off-by-default flag. Targeting rules can be added after creation.',
            },
          )}
        </p>
      </div>

      <form className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))} onSubmit={handleSubmit}>
        {/* Identity */}
        <section
          className={cm.cn('rounded-xl p-6 space-y-4')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid rgba(30, 41, 59, 0.7)',
          }}
        >
          <h2 className={cm.cn('text-lg font-extrabold text-on-surface')}>
            {t('nav.identity', {}, { defaultValue: 'Identity' })}
          </h2>

          <div className={cm.cn('grid gap-4 md:grid-cols-2')}>
            <div>
              <label
                htmlFor="flag-name"
                className={cm.cn(
                  'block font-mono text-[10px] font-black uppercase tracking-widest mb-1.5 text-on-surface-variant',
                )}
              >
                {t('form.name', {}, { defaultValue: 'Name' })}
              </label>
              <input
                id="flag-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('newFlag.namePh', {}, { defaultValue: 'New onboarding wizard' })}
                className={cm.cn('h-10 w-full rounded-md px-3 text-sm transition-colors')}
                style={{
                  backgroundColor: 'var(--color-code-block)',
                  border: '1px solid rgba(30, 41, 59, 0.8)',
                  color: 'var(--color-text-code)',
                }}
                required
              />
            </div>
            <div>
              <label
                htmlFor="flag-key"
                className={cm.cn(
                  'block font-mono text-[10px] font-black uppercase tracking-widest mb-1.5 text-on-surface-variant',
                )}
              >
                {t('newFlag.key', {}, { defaultValue: 'Flag key' })}
              </label>
              <input
                id="flag-key"
                value={keyOverride || derivedKey}
                onChange={(e) => setKeyOverride(e.target.value)}
                className={cm.cn('h-10 w-full rounded-md px-3 font-mono text-sm transition-colors')}
                style={{
                  backgroundColor: 'var(--color-code-block)',
                  border: '1px solid rgba(30, 41, 59, 0.8)',
                  color: 'var(--color-primary-hover)',
                }}
              />
              <p className={cm.cn('mt-1 font-mono text-[11px] text-on-surface-variant')}>
                {keyOverride
                  ? t(
                      'newFlag.keyManual',
                      {},
                      { defaultValue: 'Manual key — must be unique per project.' },
                    )
                  : t(
                      'newFlag.keyAuto',
                      {},
                      { defaultValue: 'Auto-derived from name. Click to override.' },
                    )}
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="flag-description"
              className={cm.cn(
                'block font-mono text-[10px] font-black uppercase tracking-widest mb-1.5 text-on-surface-variant',
              )}
            >
              {t('form.description', {}, { defaultValue: 'Description' })}
            </label>
            <textarea
              id="flag-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t(
                'newFlag.descriptionPh',
                {},
                { defaultValue: 'What does this flag gate? Why does it exist?' },
              )}
              className={cm.cn('w-full rounded-md p-3 text-sm transition-colors')}
              style={{
                backgroundColor: 'var(--color-code-block)',
                border: '1px solid rgba(30, 41, 59, 0.8)',
                color: 'var(--color-text-code)',
              }}
            />
          </div>

          <div>
            <p
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest mb-2 text-on-surface-variant',
              )}
            >
              {t('form.type', {}, { defaultValue: 'Type' })}
            </p>
            <div className={cm.cn('grid grid-cols-2 sm:grid-cols-4 gap-2')}>
              {FLAG_TYPES.map((type) => {
                const active = flagType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFlagType(type)}
                    className={cm.cn(
                      'rounded-md px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors text-left',
                    )}
                    style={
                      active
                        ? {
                            backgroundColor: 'var(--color-emerald-chip-bg)',
                            color: 'var(--color-env-filter-active-text)',
                            boxShadow: 'inset 0 0 0 1px var(--color-success-banner-border)',
                            fontWeight: 700,
                          }
                        : {
                            backgroundColor: 'var(--color-surface-container-high)',
                            color: 'var(--color-text-muted)',
                            border: '1px solid rgba(30, 41, 59, 0.7)',
                          }
                    }
                  >
                    {type}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest mb-2 text-on-surface-variant',
              )}
            >
              {t('form.tags', {}, { defaultValue: 'Tags' })}
            </p>
            <div className={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={cm.cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold',
                  )}
                  style={{
                    backgroundColor: 'var(--color-accent-chip-bg)',
                    color: 'var(--color-accent-chip-text)',
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    aria-label={t(
                      'newFlag.removeTagAria',
                      { tag },
                      { defaultValue: 'Remove tag {{tag}}' },
                    )}
                    className={cm.cn(
                      'inline-flex min-h-[28px] min-w-[28px] items-center justify-center hover:opacity-80',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[12px]')}
                      aria-hidden="true"
                    >
                      close
                    </span>
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder={t('newFlag.tagPh', {}, { defaultValue: 'add-tag' })}
                className={cm.cn('h-7 rounded-md px-2 font-mono text-xs')}
                style={{
                  backgroundColor: 'var(--color-code-block)',
                  border: '1px solid rgba(30, 41, 59, 0.8)',
                  color: 'var(--color-text-code)',
                }}
              />
            </div>
          </div>
        </section>

        {/* Variants */}
        <section
          className={cm.cn('rounded-xl p-6 space-y-4')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid rgba(30, 41, 59, 0.7)',
          }}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2 className={cm.cn('text-lg font-extrabold text-on-surface')}>
              {t('newFlag.variants.heading', {}, { defaultValue: 'Variants' })}
            </h2>
            {flagType !== 'boolean' ? (
              <button
                type="button"
                onClick={addVariant}
                className={cm.cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-bold transition-colors',
                )}
                style={{
                  backgroundColor: 'var(--color-accent-chip-bg)',
                  color: 'var(--color-accent-chip-text)',
                }}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  add
                </span>
                {t('newFlag.variants.add', {}, { defaultValue: 'Add variant' })}
              </button>
            ) : null}
          </div>

          {flagType === 'boolean' ? (
            <div className={cm.cn('grid grid-cols-2 gap-3')}>
              <div
                className={cm.cn('rounded-md px-4 py-3')}
                style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  border: '1px solid var(--color-success-banner-border)',
                }}
              >
                <p
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  true
                </p>
                <p
                  className={cm.cn('font-mono text-lg font-extrabold mt-0.5')}
                  style={{ color: 'var(--color-primary-hover)' }}
                >
                  {t('newFlag.variants.on', {}, { defaultValue: 'flag is on' })}
                </p>
              </div>
              <div
                className={cm.cn('rounded-md px-4 py-3')}
                style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  border: '1px solid rgba(100, 116, 139, 0.30)',
                }}
              >
                <p
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  false
                </p>
                <p
                  className={cm.cn(
                    'font-mono text-lg font-extrabold mt-0.5 text-on-surface-variant',
                  )}
                >
                  {t('newFlag.variants.off', {}, { defaultValue: 'flag is off' })}
                </p>
              </div>
            </div>
          ) : (
            <ul className={cm.cn('space-y-2')}>
              {variants.map((v) => (
                <li
                  key={v.id}
                  className={cm.cn(
                    'grid gap-2 grid-cols-[1fr_1fr_120px_36px] items-center rounded-md px-3 py-2',
                  )}
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: '1px solid rgba(30, 41, 59, 0.7)',
                  }}
                >
                  <input
                    value={v.key}
                    onChange={(e) => updateVariant(v.id, { key: e.target.value })}
                    placeholder={t('newFlag.variantKeyPh', {}, { defaultValue: 'variant_key' })}
                    aria-label={t('newFlag.variantKeyAria', {}, { defaultValue: 'Variant key' })}
                    className={cm.cn('h-8 w-full rounded-sm px-2 font-mono text-sm')}
                    style={{
                      backgroundColor: 'var(--color-code-block)',
                      border: '1px solid rgba(30, 41, 59, 0.8)',
                      color: 'var(--color-primary-hover)',
                    }}
                  />
                  <input
                    value={v.value}
                    onChange={(e) => updateVariant(v.id, { value: e.target.value })}
                    placeholder={t('newFlag.variantValuePh', {}, { defaultValue: '"value"' })}
                    aria-label={t(
                      'newFlag.variantValueAria',
                      {},
                      { defaultValue: 'Variant value' },
                    )}
                    className={cm.cn('h-8 w-full rounded-sm px-2 font-mono text-sm')}
                    style={{
                      backgroundColor: 'var(--color-code-block)',
                      border: '1px solid rgba(30, 41, 59, 0.8)',
                      color: 'var(--color-text-code)',
                    }}
                  />
                  <div className={cm.cn('relative')}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      aria-label={t(
                        'newFlag.variantWeightAria',
                        {},
                        { defaultValue: 'Variant weight' },
                      )}
                      value={v.weight}
                      onChange={(e) =>
                        updateVariant(v.id, {
                          weight: Math.max(0, Math.min(100, Number(e.target.value))),
                        })
                      }
                      className={cm.cn(
                        'h-8 w-full rounded-sm px-2 pr-7 font-mono text-sm text-right',
                      )}
                      style={{
                        backgroundColor: 'var(--color-code-block)',
                        border: '1px solid rgba(30, 41, 59, 0.8)',
                        color: 'var(--color-text-code)',
                      }}
                    />
                    <span
                      className={cm.cn(
                        'absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs text-on-surface-variant',
                      )}
                    >
                      %
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVariant(v.id)}
                    aria-label={t(
                      'newFlag.removeVariantAria',
                      { key: v.key },
                      { defaultValue: 'Remove variant {{key}}' },
                    )}
                    className={cm.cn(
                      'inline-flex min-h-[28px] min-w-[28px] items-center justify-center rounded-md p-1.5 text-on-surface-variant hover:text-on-surface transition-colors',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-base')}>delete</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Default + Environments */}
        <section
          className={cm.cn('rounded-xl p-6 space-y-5')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid rgba(30, 41, 59, 0.7)',
          }}
        >
          <h2 className={cm.cn('text-lg font-extrabold text-on-surface')}>
            {t('newFlag.defaults.heading', {}, { defaultValue: 'Defaults & environments' })}
          </h2>
          <div>
            <p
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest mb-2 text-on-surface-variant',
              )}
            >
              {t(
                'newFlag.defaults.serve',
                {},
                { defaultValue: 'Default rule (no targeting match)' },
              )}
            </p>
            <select
              value={defaultRule}
              onChange={(e) => setDefaultRule(e.target.value)}
              className={cm.cn('h-10 rounded-md px-3 font-mono text-sm')}
              style={{
                backgroundColor: 'var(--color-code-block)',
                border: '1px solid rgba(30, 41, 59, 0.8)',
                color: 'var(--color-text-code)',
              }}
              aria-label={t('newFlag.defaults.serveAria', {}, { defaultValue: 'Default rule' })}
            >
              {flagType === 'boolean' ? (
                <>
                  <option value="false">false</option>
                  <option value="true">true</option>
                </>
              ) : (
                variants.map((v) => (
                  <option key={v.id} value={v.key}>
                    {v.key}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <p
              className={cm.cn(
                'font-mono text-[10px] font-black uppercase tracking-widest mb-2 text-on-surface-variant',
              )}
            >
              {t('newFlag.defaults.envs', {}, { defaultValue: 'Enable in environments' })}
            </p>
            <div className={cm.cn('grid gap-2 sm:grid-cols-3')}>
              {ENV_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className={cm.cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors',
                  )}
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: '1px solid rgba(30, 41, 59, 0.7)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={envs[opt.key]}
                    onChange={(e) => setEnvs((cur) => ({ ...cur, [opt.key]: e.target.checked }))}
                    className={cm.cn('h-4 w-4 accent-emerald-500')}
                  />
                  <EnvironmentBadge tone={opt.key} compact />
                </label>
              ))}
            </div>
          </div>
        </section>

        {submitError ? (
          <div
            role="alert"
            className={cm.cn('rounded-md px-4 py-3 text-sm')}
            style={{
              backgroundColor: 'var(--color-error-banner-bg)',
              border: '1px solid var(--color-error-banner-border)',
              color: 'var(--color-error-chip-text)',
            }}
            data-mol-id="new-flag-error"
          >
            {t(
              'newFlag.error',
              { message: submitError },
              { defaultValue: 'Could not create flag: {{message}}' },
            )}
          </div>
        ) : null}

        <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
          <Link
            to="/flags"
            className={cm.cn(
              'inline-flex items-center rounded-md px-4 py-2 font-mono text-sm font-bold transition-colors',
            )}
            style={{ backgroundColor: 'rgba(30, 41, 59, 0.7)', color: 'var(--color-text-code)' }}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className={cm.cn(
              'inline-flex items-center gap-1.5 rounded-md px-5 py-2 font-mono text-sm font-bold transition-colors disabled:opacity-60',
            )}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary-cta)',
              boxShadow: '0 12px 28px -12px rgba(16, 185, 129, 0.55)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              flag
            </span>
            {submitting
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('newFlag.create', {}, { defaultValue: 'Create flag' })}
          </button>
        </div>
      </form>
    </div>
  )
}
