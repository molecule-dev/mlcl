/**
 * Ready-to-use record actions and create forms. Keep records in the query resource.
 * Use ResourceToggle with a detail query. Put ResourceCreateForm beside the resource's list query.
 * @requires @molecule/app-query-react 1.6.0
 * @requires @molecule/app-react 4.0.0
 */
import type { FormEvent, FormHTMLAttributes, ReactNode } from 'react'
import { useState } from 'react'

import type { QueryContentProps } from '@molecule/app-query-react'
import { QueryContent } from '@molecule/app-query-react'
import { useOptimisticValue } from '@molecule/app-react'

/** A loaded record and its server-backed flag/count, supplied by the application. */
export interface ResourceToggleProps<T, Value> extends Omit<QueryContentProps<T>, 'children'> {
  identity: (record: NonNullable<T>) => string
  value: (record: NonNullable<T>) => Value
  commit: (record: NonNullable<T>, desired: Value) => Promise<Value>
  children: (control: {
    value: Value
    pending: boolean
    update: (change: (current: Value) => Value) => void
  }) => ReactNode
  onError: (error: unknown) => void
}

function LoadedToggle<T, Value>({
  record,
  value,
  commit,
  children,
  onError,
}: {
  record: NonNullable<T>
} & Pick<ResourceToggleProps<T, Value>, 'value' | 'commit' | 'children' | 'onError'>): ReactNode {
  const control = useOptimisticValue({
    value: value(record),
    commit: (desired) => commit(record, desired),
    onError,
  })
  return children(control)
}

/** Mounts only with a loaded record. Keeps the keyed controller through refresh and queues inverse taps. */
export function ResourceToggle<T, Value>({
  query,
  identity,
  value,
  commit,
  children,
  onError,
  ...status
}: ResourceToggleProps<T, Value>): ReactNode {
  return (
    <QueryContent query={query} {...status}>
      {(record) => (
        <LoadedToggle
          key={identity(record)}
          record={record}
          value={value}
          commit={commit}
          onError={onError}
        >
          {children}
        </LoadedToggle>
      )}
    </QueryContent>
  )
}

/** The create operation already refreshes the resource's lists. Do not mirror those rows locally. */
export interface ResourceCreateFormProps<Input> extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'onSubmit' | 'children'
> {
  create: (input: Input) => Promise<unknown>
  readInput: (data: FormData) => Input
  children: ReactNode
  error: (error: unknown) => ReactNode
}

/**
 * A native form whose fields and submit button share the mutation's whole lifetime.
 * Render the list with useQuery(resource.list(viewer)) and pass resource.create here.
 * A visible new row cannot expose an enabled submit button with a hidden busy guard.
 * Drafts stay editable after a failure and clear only after confirmed success.
 */
export function ResourceCreateForm<Input>({
  create,
  readInput,
  children,
  error,
  ...props
}: ResourceCreateFormProps<Input>): ReactNode {
  const [pending, setPending] = useState(0)
  const [failure, setFailure] = useState<{ cause: unknown } | null>(null)
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const form = event.currentTarget
    setPending((count) => count + 1)
    setFailure(null)
    try {
      const input = readInput(new FormData(form))
      await create(input)
      form.reset()
    } catch (cause) {
      setFailure({ cause })
    } finally {
      setPending((count) => count - 1)
    }
  }
  return (
    <form
      data-mol-id="resource-create-form"
      {...props}
      onSubmit={(event) => {
        void submit(event)
      }}
      aria-busy={pending > 0}
    >
      <fieldset disabled={pending > 0}>{children}</fieldset>
      {failure !== null ? error(failure.cause) : null}
    </form>
  )
}
