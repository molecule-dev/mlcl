/** Emit the resource client's adapter for the app's existing auth bond. */
import type { ResourceModuleFactory } from './app-resource-modules.js'

export const RESOURCE_AUTH_PACKAGE = '@molecule/app-auth'

type Framework = NonNullable<ResourceModuleFactory['recordPage']>['framework']

/** How a framework observes the same bonded snapshot that event handlers read. */
const observers = {
  react: {
    from: 'react',
    imports: ['useSyncExternalStore'],
    type: 'string | null',
    publicValue: 'getResourceViewer()',
    body: 'return useSyncExternalStore(watchResourceViewer, getResourceViewer, getResourceViewer)',
  },
  vue: {
    from: 'vue',
    imports: ['onScopeDispose', 'shallowRef'],
    type: '() => string | null',
    publicValue: 'getResourceViewer',
    body: `const viewer = shallowRef(getResourceViewer())
  onScopeDispose(watchResourceViewer((next) => { viewer.value = next }))
  return () => viewer.value`,
  },
  solid: {
    from: 'solid-js',
    imports: ['createSignal', 'onCleanup'],
    type: '() => string | null',
    publicValue: 'getResourceViewer',
    body: `const [viewer, setViewer] = createSignal(getResourceViewer())
  onCleanup(watchResourceViewer(setViewer))
  return viewer`,
  },
  svelte: {
    from: 'svelte/store',
    imports: ['readable'],
    type: 'Readable<string | null>',
    publicValue: 'readable(getResourceViewer())',
    body: 'return readable(getResourceViewer(), watchResourceViewer)',
  },
  angular: {
    from: '@angular/core',
    imports: ['DestroyRef', 'inject', 'signal', 'type Signal'],
    type: 'Signal<string | null>',
    publicValue: 'computed(getResourceViewer)',
    body: `const viewer = signal(getResourceViewer())
  inject(DestroyRef).onDestroy(watchResourceViewer((next) => viewer.set(next)))
  return viewer`,
  },
} satisfies Record<
  Framework,
  { from: string; imports: string[]; type: string; publicValue: string; body: string }
>

/**
 * Use an opaque session key even for custom profiles with no ID. Default auth clients provide
 * a revision that changes on session replacement, while a legacy provider may use a profile ID
 * or the profile object it publishes. The HTTP client remains the only credential transport.
 *
 * @param factory - The declared framework's resource factory.
 * @param auth - Whether the app declares the auth client capability.
 * @param reads - Whether the module exposes a reactive reader.
 * @param view - Whether a separate Svelte view needs access to the key.
 * @param writes - Whether named writes need a settled session.
 * @returns Source and imports for the generated client.
 */
export function resourceViewer(
  factory: ResourceModuleFactory,
  auth: boolean,
  reads: boolean,
  view: boolean,
  writes: boolean,
): { source: string; imports: [string, string[]][]; http: string } {
  const framework = factory.recordPage?.framework
  const observer = reads && framework ? observers[framework] : null
  const imports: [string, string[]][] = []
  if (auth) {
    imports.push([
      RESOURCE_AUTH_PACKAGE,
      ['getClient as getAuthClient', 'hasClient as hasAuthClient'],
    ])
    imports.push(['@molecule/app-query', ['type ResourceHttp']])
  }
  if (observer && auth) imports.push([observer.from, observer.imports])
  if (observer && !auth && framework === 'angular')
    imports.push([observer.from, ['computed', 'type Signal']])
  const source = auth
    ? `const identities = new WeakMap<object, number>()
let nextIdentity = 0

function resourceIdentity(object: object): number {
  const known = identities.get(object)
  if (known !== undefined) return known
  const id = ++nextIdentity
  identities.set(object, id)
  return id
}

function getResourceViewer(): string | null {
  if (!hasAuthClient()) return 'public'
  const client = getAuthClient<{ id?: string | number }>()
  const { status, user } = client.getState()
  if (status === 'unauthenticated') return 'public'
  if (status !== 'authenticated' || !user) return null
  const revision = 'getSessionRevision' in client && typeof client.getSessionRevision === 'function'
    ? client.getSessionRevision()
    : undefined
  const account = typeof revision === 'number'
    ? 'session:' + revision
    : user.id != null ? 'account:' + user.id : 'profile:' + resourceIdentity(user)
  return resourceIdentity(client) + ':' + account
}

async function resourceRequest<T>(
  viewer: string,
  send: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (getResourceViewer() !== viewer) throw new Error('The session changed.')
  const owner = new AbortController()
  const stop = watchResourceViewer((active) => {
    if (active !== viewer) owner.abort()
  })
  try {
    const requestSignal = signal ? AbortSignal.any([signal, owner.signal]) : owner.signal
    requestSignal.throwIfAborted()
    const response = await send(requestSignal)
    requestSignal.throwIfAborted()
    if (getResourceViewer() !== viewer) throw new Error('The session changed.')
    return response
  } finally {
    stop()
  }
}

function resourceHttp(viewer: string): ResourceHttp {
  const client: ResourceHttp & ReturnType<typeof ${factory.http.client}> = ${factory.http.client}()
  return {
    get: (path, options) =>
      resourceRequest(viewer, (signal) => client.get(path, { ...options, signal }), options?.signal),
    post: (path, body) => resourceRequest(viewer, (signal) => client.post(path, body, { signal })),
    put: (path, body) => resourceRequest(viewer, (signal) => client.put(path, body, { signal })),
    patch: (path, body) => resourceRequest(viewer, (signal) => client.patch(path, body, { signal })),
    delete: (path) => resourceRequest(viewer, (signal) => client.delete(path, { signal })),
  }
}`
    : `function getResourceViewer(): string | null {
  return 'public'
}`
  const watch = auth
    ? `

function watchResourceViewer(notify: (viewer: string | null) => void): () => void {
  if (!hasAuthClient()) return () => {}
  const stop = getAuthClient().subscribe(() => notify(getResourceViewer()))
  notify(getResourceViewer())
  return stop
}`
    : ''
  const observe = observer
    ? `

${view && framework === 'svelte' ? 'export ' : ''}function useResourceViewer(): ${observer.type} {
  ${auth ? observer.body : `return ${observer.publicValue}`}
}`
    : ''
  const write = writes
    ? `

function getWriteViewer(): string {
  const viewer = getResourceViewer()
  if (viewer === null) throw new Error('The session is not ready.')
  return viewer
}`
    : ''
  return {
    source: source + watch + observe + write,
    imports,
    http: auth ? '() => resourceHttp(viewer)' : factory.http.client,
  }
}

/** Keep the resource instance shared across reads and writes of the active viewer. */
export const scopedResources = `function scopeResource<T, Args extends string[]>(
  create: (viewer: string, ...args: Args) => T,
): (viewer: string, ...args: Args) => T {
  let current: string | null = null
  const resources = new Map<string, T>()
  return (viewer, ...args) => {
    if (viewer !== current) {
      current = viewer
      resources.clear()
    }
    const key = JSON.stringify(args)
    const cached = resources.get(key)
    if (cached !== undefined) return cached
    const resource = create(viewer, ...args)
    resources.set(key, resource)
    return resource
  }
}`
