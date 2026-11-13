<script lang="ts">
  import type { Snippet } from 'svelte'

  import { t } from '@molecule/app-i18n'
  import { getClassMap } from '@molecule/app-ui'

  import { formSubmitErrorMessages } from '../lib/form-submit-error.js'

  let {
    onFormSubmit = undefined,
    submitting = false,
    submitError = undefined,
    class: className = undefined,
    children = undefined,
    ...rest
  }: {
    /** Async submit handler; receives the form's field dictionary. */
    onFormSubmit?: (data: Record<string, unknown>) => void | Promise<void>
    /** An externally managed rejection (e.g. a store's submit error). */
    submitting?: boolean
    submitError?: unknown
    class?: string
    children?: Snippet
    [key: string]: unknown
  } = $props()

  const cm = getClassMap()

  let failure = $state<{ error: unknown } | null>(null)
  let pending = $state(false)
  let attempt = 0

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    if (!onFormSubmit) return
    const current = ++attempt
    failure = null
    pending = true
    try {
      // The native event's FormData is read before any await: the handler may
      // navigate away and detach the form.
      event.preventDefault()
      const formElement = event.currentTarget
      if (!(formElement instanceof HTMLFormElement)) return
      const formData = new FormData(formElement)
      const data: Record<string, unknown> = {}
      formData.forEach((value, key) => {
        data[key] = value
      })
      await onFormSubmit(data)
    } catch (error) {
      if (attempt === current) failure = { error }
    } finally {
      if (attempt === current) pending = false
    }
  }

  // A controlled `submitError` replaces the internal one (the framework form
  // distinguishes an explicit undefined too; this scaffold never passes one).
  let error = $derived(submitError !== undefined ? { error: submitError } : failure)
  let messages = $derived(
    error
      ? formSubmitErrorMessages(
          error.error,
          t('ui.form.submitError', undefined, {
            defaultValue: 'Unable to submit. Please try again.',
          }),
        )
      : [],
  )
</script>

<form class={className} onsubmit={handleSubmit} {...rest}>
  {#if messages.length > 0}
    <ul role="alert" class={cm.formError}>
      {#each messages as message, index (index)}
        <li>{message}</li>
      {/each}
    </ul>
  {/if}
  <!-- Native submission is held while the handler runs, so a second click
       cannot double-submit; the contents stay interactive otherwise. -->
  <fieldset disabled={submitting || pending} class={cm.formFieldsetContents}>
    {#if children}{@render children()}{/if}
  </fieldset>
</form>
