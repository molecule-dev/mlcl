/**
 * Derive the frontend auth composition root from the API's declared contract.
 * Registry routes/options serve package-built APIs; OpenAPI 3.1 serves an
 * external contract. The default registry contract retains its legacy bytes.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { z } from 'zod'

import { AuthContractMetadata, type InferredPackage, InferredRoute } from './schema.js'

/** Serializable response adaptation understood by the generated auth config. */
export interface AuthResponseAdapter {
  /** Object containing both the wire user and its token (for example `session`). */
  envelope?: string
  /** Separate wire-user field when the token is at the response's top level. */
  userField?: string
  accessTokenField?: string
  refreshTokenField?: string
}

/** API auth options that cannot be represented by a route alone. */
export interface AuthContractOptions {
  scheme: string
  /** Cookie-session transport: no bearer is stored or required in the response. */
  cookie?: boolean
  tokenKey?: string
  requestEnvelopes?: {
    login?: string
    register?: string
    profile?: string
  }
  response?: AuthResponseAdapter
}

/** The normalized auth contract consumed by the app template. */
export interface AuthContract extends AuthContractOptions {
  routes: readonly Pick<InferredRoute, 'handler' | 'path' | 'method'>[]
  origin: 'registry' | 'openapi'
  /** Registry resource whose generated server handlers follow this contract. */
  resourcePackage?: string
}

const NormalizedAuthContract = AuthContractMetadata.extend({
  routes: z.array(InferredRoute),
  origin: z.enum(['registry', 'openapi']),
  resourcePackage: z.string().min(1).optional(),
})

/** Validate the normalized contract passed between create and injection. */
export function parseAuthContract(value: unknown): AuthContract {
  return NormalizedAuthContract.parse(value) as AuthContract
}

/** Read the optional project-local contract shared by API and app generation. */
export function readProjectAuthContract(projectPath: string): AuthContract | undefined {
  const path = join(projectPath, 'auth-contract.json')
  try {
    return parseAuthContract(JSON.parse(readFileSync(path, 'utf8')))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw new Error(`Invalid project auth contract ${path}: ${(error as Error).message}`, {
      cause: error,
    })
  }
}

/** Template-ready auth fields, split so the default remains byte-identical. */
export interface RenderedAuthContract {
  routeFields: string
  currentUserField: string
  profileFields: string
  passwordFields: string
  adapterFields: string
  guidance: string
}

export const AUTH_PRECONFIGURATION_GUIDANCE =
  'The auth bond is configured from the declared API contract; keep it and use the shared HTTP client instead of adding another session client.'

const HANDLERS = {
  login: 'logIn',
  logout: 'logout',
  register: 'create',
  currentUser: 'readSelf',
  profile: 'update',
  forgotPassword: 'forgotPassword',
  resetPassword: 'resetPassword',
  changePassword: 'updatePassword',
} as const

type AuthRole = keyof typeof HANDLERS
type Route = AuthContract['routes'][number]

const quote = (value: string): string =>
  `'${value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')}'`

function routeFor(contract: AuthContract, role: AuthRole): Route {
  const matches = contract.routes.filter((route) => route.handler === HANDLERS[role])
  if (matches.length !== 1) {
    throw new Error(`The API auth contract must declare exactly one ${role} route`)
  }
  return matches[0]!
}

function requireMethod(route: Route, role: AuthRole, expected: readonly string[]): void {
  if (!expected.includes(route.method.toLowerCase())) {
    throw new Error(
      `The ${role} auth route must use ${expected.join(' or ')}; app-auth does not support ${route.method.toUpperCase()}`,
    )
  }
}

function endpoint(route: Route, role: AuthRole): string {
  if (!route.path.startsWith('/') || route.path.includes(':')) {
    throw new Error(`The ${role} auth route must be an absolute path without route parameters`)
  }
  return quote(route.path)
}

/** A route only needs an adapter when it differs from the legacy scaffold value. */
function isLegacyRoute(role: AuthRole, route: Route): boolean {
  const expected: Record<AuthRole, { method: string; path: string }> = {
    login: { method: 'post', path: '/users/log-in' },
    logout: { method: 'post', path: '/users/logout' },
    register: { method: 'post', path: '/users' },
    currentUser: { method: 'get', path: '/users/me' },
    profile: { method: 'patch', path: '/users/:id' },
    forgotPassword: { method: 'post', path: '/users/forgot-password' },
    resetPassword: { method: 'post', path: '/users/reset-password' },
    changePassword: { method: 'patch', path: '/users/:id/password' },
  }
  return route.method.toLowerCase() === expected[role].method && route.path === expected[role].path
}

/**
 * Profile transport for the standard user resource, from its registered write route.
 * The app resolves only the account id at request time; read and write URLs remain independent.
 * @param routes - The canonical user resource's registered routes.
 * @returns Auth config fields ready for the shared template.
 */
function userIdEndpoint(route: Route, role: AuthRole): string {
  if (
    !route.path.startsWith('/') ||
    (route.path.match(/:id\b/g) ?? []).length !== 1 ||
    /:[A-Za-z_]\w*/.test(route.path.replace(':id', ''))
  )
    throw new Error(`The ${role} auth route must name exactly one :id`)
  const pieces = route.path.split(':id').map((part) => quote(part))
  return `(user: { id: string }) => ${pieces.join(' + encodeURIComponent(user.id) + ')}`
}

export function userProfileUpdateConfig(
  routes: readonly Pick<InferredRoute, 'handler' | 'path' | 'method'>[],
): string {
  const updates = routes.filter((route) => route.handler === 'update')
  if (updates.length !== 1)
    throw new Error('The user resource must declare one profile update route')
  const route = updates[0]!
  const method = route.method.toUpperCase()
  if (!['PATCH', 'PUT', 'POST'].includes(method))
    throw new Error('The user profile update route must use a supported method')
  return `  profileEndpoint: ${userIdEndpoint(route, 'profile')},\n  profileUpdateMethod: '${method}' as const,`
}

function profileConfig(contract: AuthContract): string {
  const route = routeFor(contract, 'profile')
  requireMethod(route, 'profile', ['patch', 'put', 'post'])
  if (isLegacyRoute('profile', route)) {
    return userProfileUpdateConfig(contract.routes)
  }
  if (route.path.includes(':id')) return userProfileUpdateConfig(contract.routes)
  if (!route.path.startsWith('/') || route.path.includes(':')) {
    throw new Error('The profile auth route must be absolute and may only bind one :id')
  }
  return `  profileEndpoint: ${quote(route.path)},\n  profileUpdateMethod: '${route.method.toUpperCase()}' as const,`
}

function responseAdapterFields(adapter: AuthResponseAdapter): string {
  const access = adapter.accessTokenField
  const refresh = adapter.refreshTokenField
  const challenge =
    '    if ((data as { twoFactorRequired?: unknown }).twoFactorRequired === true) {\n' +
    '      return { ...(data as Record<string, unknown>), twoFactorRequired: true as const }\n' +
    '    }\n'
  const tokenFields = [
    ...(access
      ? [access === 'accessToken' ? 'accessToken' : `${JSON.stringify(access)}: accessToken`]
      : []),
    ...(refresh
      ? [refresh === 'refreshToken' ? 'refreshToken' : `${JSON.stringify(refresh)}: refreshToken`]
      : []),
  ]
  const result = [
    ...(access ? ['accessToken'] : []),
    ...(refresh ? ['refreshToken'] : []),
    'user',
  ].join(', ')
  if (adapter.envelope) {
    const envelope = adapter.envelope
    const fields = [
      'id: string',
      ...(access ? [`${JSON.stringify(access)}?: string`] : []),
      ...(refresh ? [`${JSON.stringify(refresh)}?: string`] : []),
    ]
    const destructure = [...tokenFields, '...user'].join(', ')
    return (
      '  mapAuthResponse: (data: unknown) => {\n' +
      challenge +
      `    const { ${destructure} } = (data as { ${JSON.stringify(envelope)}: { ${fields.join('; ')} } })[${JSON.stringify(envelope)}]\n` +
      `    return { ${result} }\n` +
      '  },\n'
    )
  }
  if (adapter.userField) {
    const userField = adapter.userField
    const fields = [
      ...(access ? [`${JSON.stringify(access)}?: string`] : []),
      ...(refresh ? [`${JSON.stringify(refresh)}?: string`] : []),
      `${JSON.stringify(userField)}: { id: string }`,
    ]
    const destructure = [
      ...tokenFields,
      userField === 'user' ? 'user' : `${JSON.stringify(userField)}: user`,
    ].join(', ')
    return (
      '  mapAuthResponse: (data: unknown) => {\n' +
      challenge +
      `    const { ${destructure} } = data as { ${fields.join('; ')} }\n` +
      `    return { ${result} }\n` +
      '  },\n'
    )
  }
  throw new Error('An auth response adapter needs an envelope or a separate user field')
}

function requestAdapterFields(contract: AuthContract): string {
  const requests = contract.requestEnvelopes
  const lines: string[] = []
  if (requests?.login || requests?.register) {
    const body = (kind: 'login' | 'register'): string => {
      const envelope = requests[kind]
      return envelope ? `{ ${JSON.stringify(envelope)}: payload }` : 'payload'
    }
    lines.push(
      "  requestBody: (kind: 'login' | 'register', payload: Record<string, unknown>) =>",
      `    kind === 'login' ? ${body('login')} : kind === 'register' ? ${body('register')} : payload,`,
    )
  }
  if (requests?.profile) {
    lines.push(
      `  profileRequestBody: (data: { id?: string }) => ({ ${JSON.stringify(requests.profile)}: data }),`,
    )
  }
  if (contract.response) lines.push(responseAdapterFields(contract.response).trimEnd())
  return lines.length > 0 ? `${lines.join('\n')}\n` : ''
}

/** Whether the contract needs no change to today's generated project files. */
export function isDefaultAuthContract(contract: AuthContract): boolean {
  return (
    contract.scheme === 'Bearer' &&
    !contract.cookie &&
    !contract.tokenKey &&
    !contract.response &&
    !Object.values(contract.requestEnvelopes ?? {}).some(Boolean) &&
    (Object.keys(HANDLERS) as AuthRole[]).every((role) => {
      if (role === 'logout' && !contract.routes.some((route) => route.handler === 'logout'))
        return true
      return isLegacyRoute(role, routeFor(contract, role))
    })
  )
}

/** Render the existing app-auth config without introducing a parallel client. */
export function renderAuthContract(contract: AuthContract): RenderedAuthContract {
  if (!contract.scheme.trim()) throw new Error('The API auth scheme must not be empty')
  const login = routeFor(contract, 'login')
  const register = routeFor(contract, 'register')
  const currentUser = routeFor(contract, 'currentUser')
  requireMethod(login, 'login', ['post'])
  requireMethod(register, 'register', ['post'])
  requireMethod(currentUser, 'currentUser', ['get'])
  const logout = contract.routes.find((route) => route.handler === HANDLERS.logout)
  if (logout) requireMethod(logout, 'logout', ['post'])

  const routeFields = [
    `  authScheme: ${quote(contract.scheme)},`,
    ...(contract.tokenKey ? [`  tokenKey: ${quote(contract.tokenKey)},`] : []),
    ...(contract.cookie
      ? [`  storage: 'memory' as const,`, `  cookieRestore: 'always' as const,`]
      : []),
    `  loginEndpoint: ${endpoint(login, 'login')},`,
    `  registerEndpoint: ${endpoint(register, 'register')},`,
    ...(logout && !isLegacyRoute('logout', logout)
      ? [`  logoutEndpoint: ${endpoint(logout, 'logout')},`]
      : []),
  ].join('\n')
  const currentUserField = `  currentUserEndpoint: ${endpoint(currentUser, 'currentUser')},`

  const passwordFields = (
    [
      ['forgotPassword', 'forgotPasswordEndpoint'],
      ['resetPassword', 'resetPasswordEndpoint'],
      ['changePassword', 'changePasswordEndpoint'],
    ] as const
  )
    .map(([role, field]) => {
      const route = routeFor(contract, role)
      requireMethod(route, role, ['post', 'patch'])
      const legacyPaths: Record<string, string> = {
        forgotPassword: '/users/forgot-password',
        resetPassword: '/users/reset-password',
        changePassword: '/users/password',
      }
      const legacy = isLegacyRoute(role, route)
      const value = legacy
        ? quote(legacyPaths[role]!)
        : role === 'changePassword' && route.path.includes(':id')
          ? userIdEndpoint(route, role)
          : endpoint(route, role)
      const lines = [`  ${field}: ${value},`]
      if (role === 'changePassword' && !legacy && route.method.toLowerCase() === 'patch') {
        lines.push(`  changePasswordMethod: 'PATCH' as const,`)
      }
      return lines.join('\n')
    })
    .join('\n')

  const guidance = !isDefaultAuthContract(contract)
    ? `/*\n * ${AUTH_PRECONFIGURATION_GUIDANCE}\n * Update this configuration when that contract changes; do not replace the bond.\n */\n`
    : ''

  return {
    routeFields,
    currentUserField,
    profileFields: profileConfig(contract),
    passwordFields,
    adapterFields: requestAdapterFields(contract),
    guidance,
  }
}

/** Read the package-authored auth options and the same routes the injector mounts. */
export function authContractFromRegistry(pkg: InferredPackage): AuthContract {
  const options = pkg.molecule?.authContract
  if (!options) throw new Error(`${pkg.name} does not declare its API auth contract options`)
  return { ...options, routes: pkg.routes, origin: 'registry', resourcePackage: pkg.name }
}

/**
 * Server-side counterpart to the app adapters. It wraps the package's raw
 * handlers, preserving their credential storage, authorization and errors.
 * Returns undefined when the standard handler transport already matches.
 */
export function renderApiAuthContractWrapper(
  contract: AuthContract,
  resourcePackage: string,
  handlerPackage: string,
  extraExports: readonly string[],
): string | undefined {
  const response = contract.response
  const requests = contract.requestEnvelopes
  const needsSessionIdentity = (handler: string): boolean => {
    const route = contract.routes.find((candidate) => candidate.handler === handler)
    return Boolean(route && !route.path.includes(':id'))
  }
  const operations = [
    ['logIn', requests?.login, false],
    ['create', requests?.register, false],
    ['readSelf', undefined, false],
    ['update', requests?.profile, needsSessionIdentity('update')],
    ['updatePassword', undefined, needsSessionIdentity('updatePassword')],
  ] as const
  const adapted = operations.filter(([handler, envelope, sessionIdentity]) =>
    handler === 'readSelf' ? Boolean(response) : Boolean(response || envelope || sessionIdentity),
  )
  if (adapted.length === 0) return undefined

  const extraImports = extraExports.length > 0 ? `, ${extraExports.join(', ')}` : ''
  const extraReExports =
    extraExports.length > 0
      ? extraExports.map((name) => `export { ${name} }`).join('\n') + '\n\n'
      : ''
  const responseMapper = response
    ? `
const adaptAuthResponse = (body: unknown): unknown => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body
  const value = body as Record<string, unknown>
  const wireUser = value.user ?? value.props
  if (!wireUser || typeof wireUser !== 'object' || Array.isArray(wireUser)) return body
  const rest = { ...value }
  delete rest.props
  delete rest.user
  delete rest.accessToken
  delete rest.refreshToken
  const tokens = {
    ${response.accessTokenField ? `...(value.accessToken !== undefined\n      ? { ${JSON.stringify(response.accessTokenField)}: value.accessToken }\n      : {}),` : ''}
    ${response.refreshTokenField ? `...(value.refreshToken !== undefined\n      ? { ${JSON.stringify(response.refreshTokenField)}: value.refreshToken }\n      : {}),` : ''}
  }
  return {
    ...rest,
    ${response.envelope ? `[${JSON.stringify(response.envelope)}]: { ...wireUser, ...tokens }` : `[${JSON.stringify(response.userField)}]: wireUser, ...tokens`}
  }
}
`
    : ''
  const responseAdapter = response ? 'adaptAuthResponse' : 'undefined'
  const overrides = adapted
    .map(([handler, envelope, sessionIdentity]) => {
      const request = envelope ? JSON.stringify(envelope) : 'undefined'
      return `  ${handler}: createRequestHandler(adaptAuthHandler(contractHandlers.${handler}(contractResource), ${request}, ${responseAdapter}, ${sessionIdentity})),`
    })
    .join('\n')

  return `import { createRequestHandler, type Handler } from '${handlerPackage}'
import { createRequestHandlerMap${extraImports}, handlers as contractHandlers, resource as contractResource } from '${resourcePackage}'

${extraReExports}const adaptAuthHandler = (
  handler: Handler,
  requestEnvelope?: string,
  mapResponse?: (body: unknown) => unknown,
  sessionIdentity = false,
): Handler => {
  return async (req, res) => {
    let request = requestEnvelope
      ? { ...req, body: req.body?.[requestEnvelope] ?? req.body ?? {} }
      : req
    if (sessionIdentity) {
      const session = res.locals?.session as { userId?: unknown } | undefined
      const id = req.params?.id ?? session?.userId
      request = {
        ...request,
        params: { ...request.params, ...(id === undefined ? {} : { id: String(id) }) },
      }
    }
    const result = await handler(
      request,
      res,
    )
    if (!result || !mapResponse) return result
    return { ...result, body: mapResponse(result.body) }
  }
}
${responseMapper}
const defaultRequestHandlerMap = createRequestHandlerMap(createRequestHandler)
${
  requests?.login
    ? `
const contractRateLimitAuth = defaultRequestHandlerMap.rateLimitAuth
const normalizeAuthRateLimit: typeof contractRateLimitAuth = async (req, res, next) => {
  const originalBody = req.body
  req.body = originalBody?.[${JSON.stringify(requests.login)}] ?? originalBody
  try {
    await contractRateLimitAuth(req, res, next)
  } finally {
    req.body = originalBody
  }
}
`
    : ''
}
export const requestHandlerMap = {
  ...defaultRequestHandlerMap,
${requests?.login ? '  rateLimitAuth: normalizeAuthRateLimit,\n' : ''}${overrides}
}
`
}

// ---------------------------------------------------------------------------
// OpenAPI 3.1 input
// ---------------------------------------------------------------------------

type JsonObject = Record<string, unknown>

const object = (value: unknown): JsonObject | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined

const ROLE_BY_OPERATION: Record<string, AuthRole> = {
  login: 'login',
  signin: 'login',
  createsession: 'login',
  logout: 'logout',
  signout: 'logout',
  destroysession: 'logout',
  register: 'register',
  signup: 'register',
  createuser: 'register',
  currentuser: 'currentUser',
  getcurrentuser: 'currentUser',
  readself: 'currentUser',
  getsession: 'currentUser',
  updateprofile: 'profile',
  updatecurrentuser: 'profile',
  updateuser: 'profile',
  forgotpassword: 'forgotPassword',
  requestpasswordreset: 'forgotPassword',
  resetpassword: 'resetPassword',
  confirmpasswordreset: 'resetPassword',
  changepassword: 'changePassword',
  updatepassword: 'changePassword',
}

function roleOf(operation: JsonObject): AuthRole | undefined {
  const extension = operation['x-molecule-auth']
  const explicit = typeof extension === 'string' ? extension : object(extension)?.role
  const operationId = typeof operation.operationId === 'string' ? operation.operationId : ''
  const key = String(explicit ?? operationId)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  return ROLE_BY_OPERATION[key]
}

function dereference(schema: unknown, document: JsonObject): JsonObject | undefined {
  const value = object(schema)
  const ref = value?.$ref
  if (typeof ref !== 'string') return value
  if (!ref.startsWith('#/'))
    throw new Error(`OpenAPI auth schemas must use local $refs; got ${ref}`)
  const target = ref
    .slice(2)
    .split('/')
    .reduce<unknown>(
      (current, part) => object(current)?.[part.replace(/~1/g, '/').replace(/~0/g, '~')],
      document,
    )
  return object(target)
}

function jsonSchema(container: unknown, document: JsonObject): JsonObject | undefined {
  const content = object(object(container)?.content)
  const entry = Object.entries(content ?? {}).find(
    ([media]) => media === 'application/json' || media.endsWith('+json'),
  )
  return dereference(object(entry?.[1])?.schema, document)
}

function requestSchema(operation: JsonObject, document: JsonObject): JsonObject | undefined {
  return jsonSchema(operation.requestBody, document)
}

function responseSchema(operation: JsonObject, document: JsonObject): JsonObject | undefined {
  const responses = object(operation.responses) ?? {}
  const key = Object.keys(responses)
    .filter((status) => /^2\d\d$/.test(status))
    .sort()[0]
  if (!key) throw new Error('An OpenAPI auth operation needs a 2xx JSON response')
  return jsonSchema(responses[key], document)
}

function requestEnvelope(operation: JsonObject, document: JsonObject): string | undefined {
  const schema = requestSchema(operation, document)
  const properties = object(schema?.properties) ?? {}
  if (properties.email && properties.password) return undefined
  const nested = Object.entries(properties).find(([, value]) => {
    const fields = object(dereference(value, document)?.properties) ?? {}
    return Boolean(fields.email && fields.password)
  })
  if (!nested) throw new Error('OpenAPI login/registration must declare email and password fields')
  return nested[0]
}

function profileRequestEnvelope(operation: JsonObject, document: JsonObject): string | undefined {
  const properties = object(requestSchema(operation, document)?.properties) ?? {}
  const entries = Object.entries(properties)
  if (entries.length === 1) {
    const [key, value] = entries[0]!
    if (dereference(value, document)?.type === 'object') return key
  }
  return undefined
}

function responseAdapter(
  operation: JsonObject,
  document: JsonObject,
  tokenless = false,
): AuthResponseAdapter | undefined {
  const properties = object(responseSchema(operation, document)?.properties) ?? {}
  const names = Object.keys(properties)
  const token = [
    'accessToken',
    'token',
    'jwt',
    'sessionToken',
    ...names.filter((name) => /token$/i.test(name) && !/refresh/i.test(name)),
  ].find((name) => names.includes(name))
  const refresh = names.find((name) => /^refreshToken$/i.test(name))
  if (token && object(dereference(properties.user, document)?.properties)) {
    return token === 'accessToken'
      ? undefined
      : { userField: 'user', accessTokenField: token, refreshTokenField: refresh }
  }
  if (tokenless && object(dereference(properties.user, document)?.properties)) {
    return { userField: 'user' }
  }
  const nested = Object.entries(properties).find(([, value]) => {
    const fields = object(dereference(value, document)?.properties) ?? {}
    return (
      Object.keys(fields).some((name) => /token$/i.test(name) && !/refresh/i.test(name)) ||
      (tokenless && Boolean(fields.id))
    )
  })
  if (!nested)
    throw new Error('Could not locate the access token and user in the OpenAPI login response')
  const fields = object(dereference(nested[1], document)?.properties) ?? {}
  const nestedNames = Object.keys(fields)
  if (!nestedNames.includes('id')) {
    throw new Error(
      'The generated auth mapper requires an id on the OpenAPI user; type a custom profile in the app otherwise',
    )
  }
  const nestedToken = ['accessToken', 'token', 'jwt', 'sessionToken', ...nestedNames].find(
    (name) => nestedNames.includes(name) && /token$/i.test(name) && !/refresh/i.test(name),
  )
  if (!nestedToken && !tokenless)
    throw new Error('Could not locate the access token in the OpenAPI user envelope')
  return {
    envelope: nested[0],
    accessTokenField: nestedToken,
    refreshTokenField: nestedNames.find((name) => /^refreshToken$/i.test(name)),
  }
}

function securityScheme(
  document: JsonObject,
  operations: JsonObject[],
): { scheme: string; tokenKey?: string; cookie?: boolean } {
  const extension = object(document['x-molecule-auth'])
  const tokenKey = extension?.tokenKey
  if (tokenKey !== undefined && (typeof tokenKey !== 'string' || !tokenKey)) {
    throw new Error('x-molecule-auth.tokenKey must be a nonempty string')
  }
  const components = object(object(document.components)?.securitySchemes) ?? {}
  const requirements = [
    ...operations.flatMap((operation) => {
      const security = operation.security ?? document.security
      return Array.isArray(security) ? security : []
    }),
    ...(Array.isArray(document.security) ? document.security : []),
  ]
  const names = requirements.flatMap((requirement) => Object.keys(object(requirement) ?? {}))
  const name =
    names[0] ?? (Object.keys(components).length === 1 ? Object.keys(components)[0] : undefined)
  if (!name)
    throw new Error('OpenAPI auth needs one HTTP security scheme or a security requirement')
  const scheme = object(components[name])
  if (scheme?.type === 'apiKey' && scheme.in === 'cookie') {
    return { scheme: 'Bearer', cookie: true }
  }
  if (scheme?.type !== 'http' || typeof scheme.scheme !== 'string') {
    throw new Error(`OpenAPI security scheme ${name} must be an HTTP scheme or cookie apiKey`)
  }
  return {
    scheme: scheme.scheme.toLowerCase() === 'bearer' ? 'Bearer' : scheme.scheme,
    ...(typeof tokenKey === 'string' ? { tokenKey } : {}),
  }
}

/** Normalize an OpenAPI 3.1 document into the app's serializable auth contract. */
export function authContractFromOpenApi(value: unknown): AuthContract {
  const document = object(value)
  if (!document || typeof document.openapi !== 'string' || !document.openapi.startsWith('3.1.')) {
    throw new Error('The API auth contract must be an OpenAPI 3.1 JSON document')
  }
  const routes: Route[] = []
  const operations = new Map<AuthRole, JsonObject>()
  for (const [rawPath, itemValue] of Object.entries(object(document.paths) ?? {})) {
    const item = object(itemValue) ?? {}
    for (const [method, operationValue] of Object.entries(item)) {
      const operation = object(operationValue)
      if (!operation) continue
      const role = roleOf(operation)
      if (!role) continue
      if (operations.has(role)) throw new Error(`OpenAPI declares more than one ${role} operation`)
      operations.set(role, operation)
      routes.push({
        handler: HANDLERS[role],
        method: method as InferredRoute['method'],
        path: rawPath.replace(/\{([^}]+)\}/g, ':$1'),
      })
    }
  }
  for (const role of Object.keys(HANDLERS) as AuthRole[]) {
    if (role !== 'logout' && !operations.has(role))
      throw new Error(`OpenAPI is missing the ${role} auth operation`)
  }
  const ordered = [...operations.values()]
  const security = securityScheme(document, ordered)
  const login = operations.get('login')!
  const register = operations.get('register')!
  const profile = operations.get('profile')!
  const response = responseAdapter(login, document, security.cookie === true)
  return {
    ...security,
    routes,
    origin: 'openapi',
    requestEnvelopes: {
      login: requestEnvelope(login, document),
      register: requestEnvelope(register, document),
      profile: profileRequestEnvelope(profile, document),
    },
    ...(response ? { response } : {}),
  }
}

/** Read and normalize a user-supplied OpenAPI 3.1 JSON document. */
export async function readOpenApiAuthContract(path: string): Promise<AuthContract> {
  let source: string
  try {
    source = await readFile(path, 'utf8')
  } catch (error) {
    throw new Error(`Could not read API auth contract ${path}: ${(error as Error).message}`, {
      cause: error,
    })
  }
  try {
    return authContractFromOpenApi(JSON.parse(source))
  } catch (error) {
    throw new Error(`Invalid API auth contract ${path}: ${(error as Error).message}`, {
      cause: error,
    })
  }
}
