import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SimmerTopBar } from '../components/SimmerTopBar.js'
import { num } from '../lib/plan.js'

interface IngredientDraft {
  item_name: string
  quantity: string
  unit: string
}

interface StepDraft {
  text: string
}

interface RecipeDraft {
  title: string
  description: string
  servings: string
  prep_minutes: string
  cook_minutes: string
  tags: string
  image_emoji: string
  ingredients: IngredientDraft[]
  steps: StepDraft[]
}

const EMOJI_CHOICES = ['🍲', '🍝', '🥗', '🍗', '🐟', '🌮', '🥣', '🥞', '🍛', '🍜', '🥙', '🫕']

/** Quick-pick tag chips for the "Tags & seasonal cues" section. */
const TAG_CHIPS: { tag: string; label: string; emoji: string }[] = [
  { tag: 'spring', label: 'Spring', emoji: '🌱' },
  { tag: 'summer', label: 'Summer', emoji: '☀️' },
  { tag: 'autumn', label: 'Autumn', emoji: '🍂' },
  { tag: 'winter', label: 'Winter', emoji: '❄️' },
  { tag: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { tag: 'quick', label: 'Quick', emoji: '⚡' },
  { tag: 'vegetarian', label: 'Vegetarian', emoji: '🥕' },
  { tag: 'batch', label: 'Batch', emoji: '🫙' },
]

const EMPTY_DRAFT: RecipeDraft = {
  title: '',
  description: '',
  servings: '2',
  prep_minutes: '10',
  cook_minutes: '20',
  tags: '',
  image_emoji: '🍲',
  ingredients: [{ item_name: '', quantity: '1', unit: '' }],
  steps: [{ text: '' }],
}

/** Serialize the tag string ("dinner, quick" → ["dinner","quick"]). */
function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0)
    .slice(0, 12)
}

export function RecipeEdit() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const [draft, setDraft] = useState<RecipeDraft>(EMPTY_DRAFT)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    http
      .get(`/api/recipes/${id}`)
      .then((res) => {
        if (cancelled) return
        const row = res.data as {
          title: string
          description: string
          servings: number | string
          prep_minutes: number | string
          cook_minutes: number | string
          tags: string[]
          image_emoji: string
          ingredients: Array<{ item_name: string; quantity: number | string; unit: string }>
          steps: Array<{ text: string }>
        }
        setDraft({
          title: row.title,
          description: row.description ?? '',
          servings: String(num(row.servings)),
          prep_minutes: String(num(row.prep_minutes)),
          cook_minutes: String(num(row.cook_minutes)),
          tags: (row.tags ?? []).join(', '),
          image_emoji: row.image_emoji ?? '🍲',
          ingredients:
            (row.ingredients ?? []).length > 0
              ? row.ingredients.map((i) => ({
                  item_name: i.item_name,
                  quantity: String(num(i.quantity)),
                  unit: i.unit ?? '',
                }))
              : EMPTY_DRAFT.ingredients,
          steps:
            (row.steps ?? []).length > 0
              ? row.steps.map((s) => ({ text: s.text }))
              : EMPTY_DRAFT.steps,
        })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('simmer.recipeEdit.fetchError', {}, { defaultValue: 'Could not load recipe.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const patch = (over: Partial<RecipeDraft>): void => setDraft((d) => ({ ...d, ...over }))

  const patchIngredient = (index: number, over: Partial<IngredientDraft>): void => {
    patch({
      ingredients: draft.ingredients.map((ing, i) => (i === index ? { ...ing, ...over } : ing)),
    })
  }
  const patchStep = (index: number, text: string): void => {
    patch({ steps: draft.steps.map((step, i) => (i === index ? { text } : step)) })
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    const ingredients = draft.ingredients
      .map((ing) => ({
        item_name: ing.item_name.trim(),
        quantity: Number.parseFloat(ing.quantity) || 0,
        unit: ing.unit.trim(),
      }))
      .filter((ing) => ing.item_name.length > 0)
    if (ingredients.length === 0) {
      setError(
        t('simmer.recipeEdit.needIngredient', {}, { defaultValue: 'Add at least one ingredient.' }),
      )
      return
    }
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      servings: Number.parseInt(draft.servings, 10) || 2,
      prep_minutes: Number.parseInt(draft.prep_minutes, 10) || 0,
      cook_minutes: Number.parseInt(draft.cook_minutes, 10) || 0,
      tags: parseTags(draft.tags),
      image_emoji: draft.image_emoji,
      ingredients,
      steps: draft.steps.map((s) => ({ text: s.text.trim() })).filter((s) => s.text.length > 0),
    }
    if (payload.title.length === 0) {
      setError(t('simmer.recipeEdit.needTitle', {}, { defaultValue: 'Give the recipe a title.' }))
      return
    }
    setSaving(true)
    try {
      if (isEdit && id) {
        await http.put(`/api/recipes/${id}`, payload)
        void track({ name: 'recipe.updated', properties: { recipe_id: id } })
        navigate(`/recipes/${id}`, { replace: true })
      } else {
        const res = await http.post<{ id: string }>('/api/recipes', payload)
        const newId = (res.data as { id: string }).id
        void track({ name: 'recipe.created', properties: { recipe_id: newId } })
        navigate(`/recipes/${newId}`, { replace: true })
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('simmer.recipeEdit.saveError', {}, { defaultValue: 'Could not save recipe.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t('simmer.recipeEdit.loading', {}, { defaultValue: 'Loading recipe…' })}
      </p>
    )
  }

  const inputCls = cm.cn(
    'w-full h-11 px-4 rounded-xl bg-surface border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface outline-none',
  )

  return (
    <>
      <SimmerTopBar
        title={
          isEdit
            ? t('simmer.recipeEdit.headingEdit', {}, { defaultValue: 'Edit recipe' })
            : t('simmer.recipeEdit.headingNew', {}, { defaultValue: 'New recipe' })
        }
        eyebrow={t(
          'simmer.recipeEdit.eyebrow',
          {},
          { defaultValue: 'Ingredients scale with servings; steps keep their order' },
        )}
      />

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg bg-error-container text-on-error-container',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
        {/* Basics */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'md' }),
            'bg-surface rounded-2xl shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('simmer.recipeEdit.basics', {}, { defaultValue: 'The basics' })}
          </h2>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              htmlFor="recipe-title"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
            >
              {t('simmer.recipeEdit.titleLabel', {}, { defaultValue: 'Title' })}
            </label>
            <input
              id="recipe-title"
              data-mol-id="recipe-form-title"
              type="text"
              required
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={t(
                'simmer.recipeEdit.titlePlaceholder',
                {},
                { defaultValue: 'e.g. Sunday Bolognese' },
              )}
              className={cm.cn(inputCls)}
            />
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              htmlFor="recipe-description"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
            >
              {t('simmer.recipeEdit.descriptionLabel', {}, { defaultValue: 'Description' })}
            </label>
            <textarea
              id="recipe-description"
              data-mol-id="recipe-form-description"
              rows={2}
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              className={cm.cn(inputCls, 'h-auto py-3 resize-y')}
            />
          </div>
          <div className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-4')}>
            {(
              [
                { key: 'servings', label: 'Servings' },
                { key: 'prep_minutes', label: 'Prep (min)' },
                { key: 'cook_minutes', label: 'Cook (min)' },
              ] as const
            ).map((field) => (
              <div key={field.key} className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label
                  htmlFor={`recipe-${field.key}`}
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {t(`simmer.recipeEdit.${field.key}Label`, {}, { defaultValue: field.label })}
                </label>
                <input
                  id={`recipe-${field.key}`}
                  data-mol-id={`recipe-form-${field.key}`}
                  type="number"
                  min={0}
                  value={draft[field.key]}
                  onChange={(e) => patch({ [field.key]: e.target.value } as Partial<RecipeDraft>)}
                  className={cm.cn(inputCls)}
                />
              </div>
            ))}
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              htmlFor="recipe-tags"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
            >
              {t('simmer.recipeEdit.tagsLabel', {}, { defaultValue: 'Tags (comma-separated)' })}
            </label>
            <input
              id="recipe-tags"
              data-mol-id="recipe-form-tags"
              type="text"
              value={draft.tags}
              onChange={(e) => patch({ tags: e.target.value })}
              placeholder={t(
                'simmer.recipeEdit.tagsPlaceholder',
                {},
                { defaultValue: 'dinner, quick, pasta' },
              )}
              className={cm.cn(inputCls)}
            />
          </div>
        </section>

        {/* Tags & seasonal cues — quick-pick chips (Stitch design section) */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'md' }),
            'bg-surface rounded-2xl shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('simmer.recipeEdit.tagsSection', {}, { defaultValue: 'Tags & seasonal cues' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'simmer.recipeEdit.tagsSectionBody',
              {},
              {
                defaultValue:
                  'Tag the season and the mood — the picker and plan nudges read these cues when the week needs a suggestion.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
            {TAG_CHIPS.map((chip) => {
              const active = parseTags(draft.tags).includes(chip.tag)
              return (
                <button
                  key={chip.tag}
                  type="button"
                  data-mol-id={`recipe-tag-chip-${chip.tag}`}
                  aria-pressed={active}
                  onClick={() => {
                    const current = parseTags(draft.tags)
                    const next = active
                      ? current.filter((x) => x !== chip.tag)
                      : [...current, chip.tag]
                    patch({ tags: next.join(', ') })
                  }}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-full border transition-colors',
                    active
                      ? 'bg-primary-container border-primary text-on-primary-container'
                      : 'border-outline text-on-surface-variant hover:border-primary hover:text-primary',
                  )}
                >
                  <span aria-hidden="true">{chip.emoji}</span>
                  {t(`simmer.recipeEdit.tagChip.${chip.tag}`, {}, { defaultValue: chip.label })}
                </button>
              )
            })}
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
            >
              {t('simmer.recipeEdit.emojiLabel', {}, { defaultValue: 'Card emoji' })}
            </span>
            <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
              {EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  data-mol-id={`recipe-form-emoji-${emoji}`}
                  aria-pressed={draft.image_emoji === emoji}
                  aria-label={emoji}
                  onClick={() => patch({ image_emoji: emoji })}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-11 h-11 rounded-xl border-2 text-2xl transition-all',
                    draft.image_emoji === emoji
                      ? 'border-primary bg-primary-container'
                      : 'border-outline/40 hover:border-primary/60',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Ingredients */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'md' }),
            'bg-surface rounded-2xl shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('simmer.recipeEdit.ingredients', {}, { defaultValue: 'Ingredients' })}
          </h2>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none')}>
            {draft.ingredients.map((ing, i) => (
              <li
                key={i}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'flex-wrap sm:flex-nowrap',
                )}
              >
                <input
                  type="text"
                  data-mol-id={`ingredient-name-${i}`}
                  value={ing.item_name}
                  onChange={(e) => patchIngredient(i, { item_name: e.target.value })}
                  placeholder={t(
                    'simmer.recipeEdit.ingredientPlaceholder',
                    {},
                    { defaultValue: 'Ingredient' },
                  )}
                  className={cm.cn(inputCls, 'flex-1 min-w-[10rem]')}
                />
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  data-mol-id={`ingredient-quantity-${i}`}
                  value={ing.quantity}
                  onChange={(e) => patchIngredient(i, { quantity: e.target.value })}
                  aria-label={t(
                    'simmer.recipeEdit.quantityLabel',
                    {},
                    { defaultValue: 'Quantity' },
                  )}
                  className={cm.cn(inputCls, 'w-24')}
                />
                <input
                  type="text"
                  data-mol-id={`ingredient-unit-${i}`}
                  value={ing.unit}
                  onChange={(e) => patchIngredient(i, { unit: e.target.value })}
                  aria-label={t('simmer.recipeEdit.unitLabel', {}, { defaultValue: 'Unit' })}
                  placeholder="tbsp"
                  className={cm.cn(inputCls, 'w-28')}
                />
                <button
                  type="button"
                  data-mol-id={`ingredient-remove-${i}`}
                  aria-label={t(
                    'simmer.recipeEdit.removeIngredient',
                    {},
                    { defaultValue: 'Remove ingredient' },
                  )}
                  onClick={() =>
                    patch({
                      ingredients:
                        draft.ingredients.length > 1
                          ? draft.ingredients.filter((_, idx) => idx !== i)
                          : [{ item_name: '', quantity: '1', unit: '' }],
                    })
                  }
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-10 h-10 flex-none rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    close
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            data-mol-id="ingredient-add"
            onClick={() =>
              patch({
                ingredients: [...draft.ingredients, { item_name: '', quantity: '1', unit: '' }],
              })
            }
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'w-fit rounded-full border border-dashed border-outline text-on-surface-variant hover:border-primary hover:text-primary transition-colors',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              add
            </span>
            {t('simmer.recipeEdit.addIngredient', {}, { defaultValue: 'Add ingredient' })}
          </button>
        </section>

        {/* Steps */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'md' }),
            'bg-surface rounded-2xl shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('simmer.recipeEdit.steps', {}, { defaultValue: 'Steps' })}
          </h2>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'list-none')}>
            {draft.steps.map((step, i) => (
              <li key={i} className={cm.cn(cm.flex({ align: 'start', gap: 'xs' }))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-8 h-11 flex-none rounded-lg bg-primary-container text-on-primary-container font-bold text-sm',
                  )}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <textarea
                  data-mol-id={`step-text-${i}`}
                  rows={2}
                  value={step.text}
                  onChange={(e) => patchStep(i, e.target.value)}
                  placeholder={t(
                    'simmer.recipeEdit.stepPlaceholder',
                    {},
                    { defaultValue: 'What happens next?' },
                  )}
                  className={cm.cn(inputCls, 'h-auto py-3 resize-y flex-1')}
                />
                <button
                  type="button"
                  data-mol-id={`step-remove-${i}`}
                  aria-label={t(
                    'simmer.recipeEdit.removeStep',
                    {},
                    { defaultValue: 'Remove step' },
                  )}
                  onClick={() =>
                    patch({
                      steps:
                        draft.steps.length > 1
                          ? draft.steps.filter((_, idx) => idx !== i)
                          : [{ text: '' }],
                    })
                  }
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-10 h-10 flex-none rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors',
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                    close
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            data-mol-id="step-add"
            onClick={() => patch({ steps: [...draft.steps, { text: '' }] })}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'w-fit rounded-full border border-dashed border-outline text-on-surface-variant hover:border-primary hover:text-primary transition-colors',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              add
            </span>
            {t('simmer.recipeEdit.addStep', {}, { defaultValue: 'Add step' })}
          </button>
        </section>

        {/* Actions */}
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <button
            type="submit"
            data-mol-id="recipe-form-save"
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              'bg-accent text-on-accent rounded-full hover:bg-accent/90 transition-colors disabled:opacity-50',
            )}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('simmer.recipeEdit.save', {}, { defaultValue: 'Save recipe' })}
          </button>
          <button
            type="button"
            data-mol-id="recipe-form-cancel"
            onClick={() => navigate(-1)}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-on-surface transition-colors',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
        </div>
      </form>
    </>
  )
}
