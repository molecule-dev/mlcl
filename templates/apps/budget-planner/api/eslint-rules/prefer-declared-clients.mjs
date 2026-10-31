/**
 * Keep declared auth and HTTP clients on the app's normal verification path.
 * Canonical source: scripts/eslint-rules/prefer-declared-clients.mjs.
 * Vendored into mlcl and generated projects by sync-eslint-rules/scaffold.
 *
 * This checks ownership signals, not imports: importing a package does not
 * excuse a second credential store. Public fetches, business API adapters and
 * form state are allowed. An intentionally independent protocol can use ESLint's
 * normal, reasoned disable comment at the narrow call site.
 */
import { readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, parse, resolve } from 'node:path'

const AUTH = '@molecule/app-auth'
const HTTP = '@molecule/app-http'
// mlcl/registry.json's app `http` bond category: the core and every provider factory.
const HTTP_FACTORIES = [
  { module: HTTP, name: 'createFetchClient' },
  { module: '@molecule/app-http-axios', name: 'createAxiosClient' },
]
const AUTH_STATE = /^(?:auth|authState|identity|identityState)$/i
const AUTH_CONTEXT = /^(?:Auth|Authentication|Identity)(?:Context|Store)?$/i
// "Session" is also a domain word (a study, tutoring, game or checkout session), so a
// session-named state or context counts only with a user/token in it or a credential store.
const SESSION_STATE = /^(?:session|sessionState|currentSession)$/i
const SESSION_CONTEXT = /^Session(?:Context|Store)?$/i
const CREDENTIAL = /token|jwt|credential|^auth(?:$|[_.:-])/i
const INDEPENDENT_API_KEY = /api[_-]?key/i
const NON_SESSION_KEY = /csrf|captcha|verification|invitation|invite|reset|pagination|upload/i
const TEST =
  /(?:^|[/\\])(?:__tests__|__fixtures__|e2e|fixtures)(?:[/\\]|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/

/** Read only the nearest package: workspace hoisting does not declare a capability. */
function declared(filename, cwd) {
  let dir = dirname(isAbsolute(filename) ? filename : resolve(cwd, filename))
  for (;;) {
    let text
    try {
      text = readFileSync(join(dir, 'package.json'), 'utf8')
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error
    }
    if (text !== undefined) {
      const pkg = JSON.parse(text)
      const dependencies = {
        ...pkg.dependencies,
        ...pkg.optionalDependencies,
        ...pkg.peerDependencies,
      }
      return {
        auth: pkg.name !== AUTH && Object.hasOwn(dependencies, AUTH),
        http: pkg.name !== HTTP && Object.hasOwn(dependencies, HTTP),
      }
    }
    if (dir === parse(dir).root) return { auth: false, http: false }
    dir = dirname(dir)
  }
}

export default {
  meta: {
    type: 'problem',
    schema: [],
    docs: {
      description:
        'Use the declared auth and HTTP clients instead of a second session or authenticated transport',
    },
    messages: {
      manifest:
        'Cannot check declared clients: {{reason}}. Repair the nearest package.json before verifying reuse.',
      credential:
        '@molecule/app-auth is declared: this browser credential store duplicates its session. Configure tokenKey (or storagePrefix) and authScheme in the existing auth bond/config; use getClient().getAccessToken() and the framework auth binding. requestBody/mapAuthResponse/currentUserEndpoint adapt the API.',
      session:
        '@molecule/app-auth is declared: this local session state duplicates its client. Read the framework auth binding or getClient().getState(); configure tokenKey, authScheme, requestBody, mapAuthResponse and currentUserEndpoint in the existing auth bond/config instead of adding a session context/store.',
      http: '@molecule/app-http is declared: replace this authenticated transport with getClient().request/get/post; keep response/error mapping local. Configure authScheme on createFetchClient and tokenKey in the auth bond; keep setAuthTokenSource and setAuthGate.',
      unbonded:
        '@molecule/app-http is declared: this {{factory}} result is used without setClient, so it does not receive the app token source that setAuthTokenSource installs on bonded clients (and the getClient() fallback). setAuthGate is global and still applies; it does not install that token source. Call setClient({{factory}}(...)) once in the bond setup, then use getClient() everywhere.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename()
    if (TEST.test(filename)) return {}
    let packages
    try {
      packages = declared(filename, context.cwd ?? context.getCwd())
    } catch (error) {
      return {
        Program(node) {
          context.report({ node, messageId: 'manifest', data: { reason: error.message } })
        },
      }
    }
    if (!packages.auth && !packages.http) return {}
    const source = context.sourceCode ?? context.getSourceCode()
    const calls = []
    const contexts = []
    const states = []
    const clientBonds = []
    const mutations = new Map()
    let credentialStore = false
    let hasAuthTokenSource = false

    const variable = (node) => {
      if (node?.type !== 'Identifier') return null
      for (let scope = source.getScope(node); scope; scope = scope.upper) {
        const found = scope.set.get(node.name)
        if (found) return found
      }
      return null
    }
    const global = (node, names) =>
      node?.type === 'Identifier' && names.includes(node.name) && !variable(node)?.defs.length
    const unwrap = (node) => {
      while (
        node &&
        [
          'ChainExpression',
          'TSAsExpression',
          'TSTypeAssertion',
          'TSNonNullExpression',
          'TSSatisfiesExpression',
        ].includes(node.type)
      )
        node = node.expression
      return node
    }
    const value = (node, seen = new Set()) => {
      node = unwrap(node)
      if (!node || seen.has(node)) return node
      seen.add(node)
      const binding = variable(node)
      const definition = binding?.defs[0]
      if (
        binding?.defs.length === 1 &&
        definition.type === 'Variable' &&
        definition.node.init &&
        !binding.references.some((ref) => ref.isWrite() && !ref.init)
      )
        return value(definition.node.init, seen)
      return node
    }
    const string = (node) => {
      node = value(node)
      if (node?.type === 'Literal' && typeof node.value === 'string') return node.value
      if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
        return node.quasis[0].value.cooked
      return null
    }
    const credential = (name) =>
      name !== null && CREDENTIAL.test(name) && !NON_SESSION_KEY.test(name)
    const identity = (node) => {
      const resolved = value(node)
      return variable(resolved) ?? resolved
    }
    const key = (node) =>
      node.computed
        ? string(node.property ?? node.key)
        : ((node.property ?? node.key)?.name ?? string(node.key))
    const globalMember = (node, name) =>
      node?.type === 'MemberExpression' &&
      key(node) === name &&
      global(value(node.object), ['window', 'globalThis', 'self'])
    const storage = (node) => {
      node = value(node)
      return (
        global(node, ['localStorage', 'sessionStorage']) ||
        ['localStorage', 'sessionStorage'].some((name) => globalMember(node, name))
      )
    }
    const imported = (node, modules, names) => {
      node = value(node)
      if (node?.type === 'Identifier') {
        const def = variable(node)?.defs[0]
        return (
          def?.type === 'ImportBinding' &&
          modules.includes(def.parent.source.value) &&
          names.includes(def.node.imported?.name ?? 'default')
        )
      }
      if (node?.type === 'MemberExpression') {
        const def = variable(value(node.object))?.defs[0]
        return (
          def?.type === 'ImportBinding' &&
          modules.includes(def.parent.source.value) &&
          names.includes(key(node))
        )
      }
      return false
    }
    const clientFactory = (callee) =>
      HTTP_FACTORIES.find(({ module, name }) => imported(callee, [module], [name]))
    const sharedAuth = (node) => {
      node = value(node)
      if (node?.type !== 'CallExpression') return false
      if (imported(node.callee, [AUTH], ['getClient', 'getUser', 'createJWTAuthClient']))
        return true
      return node.callee.type === 'MemberExpression' && sharedAuth(node.callee.object)
    }
    const property = (node, name, seen = new Set(), exact = false) => {
      node = value(node)
      if (!node || typeof name !== 'string' || seen.has(node)) return null
      seen.add(node)
      const matches = (candidate) =>
        typeof candidate === 'string' &&
        (exact ? candidate === name : candidate.toLowerCase() === name.toLowerCase())
      if (node.type === 'ConditionalExpression')
        return (
          property(node.consequent, name, seen, exact) ??
          property(node.alternate, name, seen, exact)
        )
      if (node.type === 'LogicalExpression')
        return property(node.left, name, seen, exact) ?? property(node.right, name, seen, exact)
      for (const [prop, next] of mutations.get(identity(node)) ?? []) if (matches(prop)) return next
      if (node.type === 'ObjectExpression') {
        for (const prop of node.properties) {
          if (prop.type === 'SpreadElement') {
            const found = property(prop.argument, name, seen, exact)
            if (found) return found
          } else if (matches(key(prop))) return prop.value
        }
      }
      if (node.type === 'MemberExpression')
        return property(property(node.object, key(node), seen, exact), name, seen, exact)
      if (node.type === 'NewExpression' && global(node.callee, ['Headers']))
        return property(node.arguments[0], name, seen, exact)
      return null
    }
    // A third-party API key authenticates a different service, not the app's
    // Molecule session. Resolve aliases and template/binary expressions, but
    // stay conservative when any dynamic branch could instead hold a token.
    const independentApiKey = (node, seen = new Set()) => {
      node = value(node)
      if (!node || seen.has(node)) return false
      seen.add(node)
      if (node.type === 'Identifier') return INDEPENDENT_API_KEY.test(node.name)
      if (node.type === 'MemberExpression') return INDEPENDENT_API_KEY.test(key(node) ?? '')
      if (node.type === 'TemplateLiteral')
        return (
          node.expressions.length > 0 &&
          node.expressions.every((part) => independentApiKey(part, seen))
        )
      if (node.type === 'BinaryExpression') {
        const parts = [node.left, node.right].filter(
          (part) => !(part.type === 'Literal' && typeof part.value === 'string'),
        )
        return parts.length > 0 && parts.every((part) => independentApiKey(part, seen))
      }
      if (node.type === 'ConditionalExpression')
        return independentApiKey(node.consequent, seen) && independentApiKey(node.alternate, seen)
      if (node.type === 'LogicalExpression')
        return independentApiKey(node.left, seen) && independentApiKey(node.right, seen)
      return false
    }
    const mutate = (target, name, next) => {
      if (name === null || name === undefined) return
      const owner = identity(target)
      mutations.set(owner, [...(mutations.get(owner) ?? []), [name, next]])
    }
    const stateName = (node) => {
      const parent = node.parent
      if (parent?.type !== 'VariableDeclarator') return ''
      if (parent.id.type === 'Identifier') return parent.id.name
      if (parent.id.type === 'ArrayPattern' && parent.id.elements[0]?.type === 'Identifier')
        return parent.id.elements[0].name
      return ''
    }
    const FUNCTIONS = ['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression']
    const execution = (node) => {
      for (let current = node; current; current = current.parent)
        if (current.type === 'Program' || FUNCTIONS.includes(current.type)) return current
      return null
    }
    const position = (node) => node?.range?.[0] ?? 0
    const functionReturns = (node) => {
      // Overload signatures, declare functions and abstract methods have no body.
      if (!node?.body) return []
      if (node.body.type !== 'BlockStatement') return [node.body]
      const returns = []
      const stack = [node.body]
      const seen = new Set()
      while (stack.length) {
        const current = stack.pop()
        if (!current || typeof current.type !== 'string' || seen.has(current)) continue
        seen.add(current)
        if (current !== node.body && FUNCTIONS.includes(current.type)) continue
        if (current.type === 'ReturnStatement') {
          if (current.argument) returns.push(current.argument)
          continue
        }
        for (const [name, child] of Object.entries(current)) {
          if (name === 'parent') continue
          if (Array.isArray(child)) stack.push(...child)
          else if (child && typeof child === 'object') stack.push(child)
        }
      }
      return returns
    }
    const callable = (callee) => {
      callee = value(callee)
      if (FUNCTIONS.includes(callee?.type)) return callee.body ? callee : null
      if (callee?.type !== 'Identifier') return null
      // TypeScript overloads have several FunctionName definitions. Only the
      // implementation carries a return flow; a declaration alone is unknown.
      return (
        (variable(callee)?.defs ?? [])
          .filter((definition) => definition.type === 'FunctionName')
          .map((definition) => definition.node)
          .find((node) => node.body) ?? null
      )
    }
    // An instance is identified by its creation invocation, not just the provider
    // AST node: two calls to one factory create two clients. Aliases and identity
    // wrappers retain the incoming id, while a factory's own creation uses its
    // call-site id. Unknown or execution-ambiguous flows resolve to no instances.
    const clientInstances = (node, state = {}) => {
      node = unwrap(node)
      const environment = state.environment ?? new Map()
      const freshId = state.freshId ?? null
      const seen = state.seen ?? new Set()
      if (!node || seen.has(node)) return []
      const nextSeen = new Set(seen).add(node)
      const resolve = (child, next = {}) =>
        clientInstances(child, { environment, freshId, seen: nextSeen, ...next })
      if (node.type === 'CallExpression' && clientFactory(node.callee))
        return [{ id: freshId ?? node, origin: node }]
      if (node.type === 'Identifier') {
        const binding = variable(node)
        if (environment.has(binding)) return environment.get(binding)
        const definition = binding?.defs[0]
        if (binding?.defs.length !== 1 || definition.type !== 'Variable') return []
        const sources = []
        if (definition.node.init)
          sources.push({ value: definition.node.init, node: definition.node.init })
        for (const reference of binding.references) {
          if (!reference.isWrite() || reference.init) continue
          const assignment = reference.identifier.parent
          if (
            assignment?.type !== 'AssignmentExpression' ||
            assignment.left !== reference.identifier ||
            assignment.operator !== '='
          )
            return []
          sources.push({ value: assignment.right, node: assignment })
        }
        const available = sources.filter(
          (candidate) =>
            execution(candidate.node) !== execution(node) ||
            position(candidate.node) < position(node),
        )
        const local = available.filter((candidate) => execution(candidate.node) === execution(node))
        if (local.length) {
          // A write in another execution could run before or after this one.
          if (local.length !== available.length) return []
          local.sort((a, b) => position(a.node) - position(b.node))
          return resolve(local[local.length - 1].value)
        }
        // One outer/closure source is traceable; several have no shown order.
        return available.length === 1 ? resolve(available[0].value) : []
      }
      if (node.type === 'CallExpression') {
        const fn = callable(node.callee)
        if (!fn) return []
        const arguments_ = node.arguments.map((argument) => resolve(argument))
        const inner = new Map(environment)
        for (const [index, parameter] of (fn.params ?? []).entries()) {
          const id = parameter.type === 'AssignmentPattern' ? parameter.left : parameter
          if (id.type !== 'Identifier') continue
          const binding = variable(id)
          if (binding) inner.set(binding, arguments_[index] ?? [])
        }
        return functionReturns(fn).flatMap((returned) =>
          clientInstances(returned, {
            environment: inner,
            freshId: node,
            seen: nextSeen,
          }),
        )
      }
      if (node.type === 'ConditionalExpression')
        return [...resolve(node.consequent), ...resolve(node.alternate)]
      if (node.type === 'LogicalExpression') return [...resolve(node.left), ...resolve(node.right)]
      if (node.type === 'AssignmentExpression' && node.operator === '=') return resolve(node.right)
      if (node.type === 'SequenceExpression') return resolve(node.expressions.at(-1))
      if (node.type === 'MemberExpression') {
        // JavaScript property names are case-sensitive even though HTTP header
        // names (handled by the general property helper) are not.
        const stored = property(node.object, key(node), new Set(), true)
        return stored ? resolve(stored) : []
      }
      return []
    }
    const exportedHttpClients = () => {
      const targets = []
      const addBinding = (id) => {
        for (const definition of variable(id)?.defs ?? []) {
          if (definition.type === 'Variable' && definition.node.init)
            targets.push(definition.node.init)
          if (definition.type === 'FunctionName') targets.push(definition.node)
        }
      }
      for (const statement of source.ast.body) {
        if (statement.type === 'ExportDefaultDeclaration') targets.push(statement.declaration)
        if (statement.type !== 'ExportNamedDeclaration') continue
        const declaration = statement.declaration
        if (declaration?.type === 'VariableDeclaration') {
          for (const declarator of declaration.declarations)
            if (declarator.init) targets.push(declarator.init)
        } else if (declaration) targets.push(declaration)
        for (const specifier of statement.specifiers ?? []) addBinding(specifier.local)
      }
      const origins = new Set()
      for (const target of targets) {
        if (FUNCTIONS.includes(target.type)) {
          for (const returned of functionReturns(target))
            for (const instance of clientInstances(returned, { freshId: target }))
              origins.add(instance.origin)
        } else {
          for (const instance of clientInstances(target)) origins.add(instance.origin)
        }
      }
      return origins
    }
    const transport = (callee) => {
      callee = value(callee)
      if (global(callee, ['fetch']) || globalMember(callee, 'fetch')) return true
      if (
        imported(
          callee,
          ['axios'],
          [
            'default',
            'request',
            'get',
            'post',
            'put',
            'patch',
            'delete',
            'head',
            'options',
            'create',
          ],
        )
      )
        return true
      if (callee?.type === 'MemberExpression') {
        const owner = value(callee.object)
        return owner?.type === 'CallExpression' && imported(owner.callee, ['axios'], ['create'])
      }
      return false
    }
    return {
      AssignmentExpression(node) {
        if (node.left.type !== 'MemberExpression') return
        mutate(node.left.object, key(node.left), node.right)
        if (packages.auth && storage(node.left.object) && credential(key(node.left))) {
          credentialStore = true
          context.report({ node, messageId: 'credential' })
        }
      },
      CallExpression(node) {
        calls.push(node)
        const callee = unwrap(node.callee)
        if (packages.http && imported(callee, [HTTP], ['setClient']))
          clientBonds.push(...node.arguments)
        if (packages.http && imported(callee, [HTTP], ['setAuthTokenSource']))
          hasAuthTokenSource = true
        if (callee.type === 'MemberExpression') {
          const method = key(callee)
          if (method === 'set' || method === 'append')
            mutate(callee.object, string(node.arguments[0]), node.arguments[1])
          if (
            packages.auth &&
            ['setItem', 'removeItem'].includes(method) &&
            storage(callee.object) &&
            credential(string(node.arguments[0]))
          ) {
            credentialStore = true
            context.report({ node, messageId: 'credential' })
          }
        }
        if (imported(callee, ['react'], ['createContext'])) contexts.push(node)
        if (
          imported(
            callee,
            ['react', 'solid-js', 'solid-js/store', 'vue', 'svelte/store', '@angular/core'],
            [
              'useState',
              'useReducer',
              'createSignal',
              'createStore',
              'ref',
              'reactive',
              'writable',
              'signal',
            ],
          )
        )
          states.push(node)
      },
      'Program:exit'() {
        if (packages.auth) {
          const owned = (pattern) =>
            contexts.find((node) => pattern.test(stateName(node)) && !sharedAuth(node.arguments[0]))
          const authContext = owned(AUTH_CONTEXT)
          const sessionContext = owned(SESSION_CONTEXT)
          const localState = states.find((node) => {
            const init = node.arguments[0]
            if (sharedAuth(init)) return false
            const name = stateName(node)
            const type = node.typeArguments ?? node.typeParameters
            const holdsCredential = property(init, 'user') || property(init, 'token')
            return (
              (authContext && /user|token|session|status|auth|state/i.test(name)) ||
              (sessionContext && /user|token|auth|credential/i.test(name)) ||
              (AUTH_STATE.test(name) &&
                (init?.type !== 'ObjectExpression' ||
                  holdsCredential ||
                  property(init, 'status'))) ||
              (SESSION_STATE.test(name) && (credentialStore || holdsCredential)) ||
              (type && /Auth(?:State|Status)|IdentityState/i.test(source.getText(type))) ||
              (init?.type === 'ObjectExpression' &&
                property(init, 'user') &&
                (property(init, 'token') ||
                  ['authenticated', 'unauthenticated'].includes(string(property(init, 'status')))))
            )
          })
          if (localState)
            context.report({
              node: authContext ?? sessionContext ?? localState,
              messageId: 'session',
            })
        }
        if (packages.http) {
          const bonds = clientBonds.flatMap((client) =>
            clientInstances(client).map((instance) => ({ ...instance, at: client })),
          )
          const appBaseURLs = new Set(
            bonds
              .map(({ origin }) => string(property(origin.arguments[0], 'baseURL')))
              .filter((baseURL) => baseURL !== null),
          )
          const exported = exportedHttpClients()
          const reported = new Set()
          for (const call of calls) {
            const method = unwrap(call.callee)
            if (method?.type !== 'MemberExpression') continue
            const configIndex = {
              request: 0,
              get: 1,
              delete: 1,
              post: 2,
              put: 2,
              patch: 2,
            }[key(method)]
            if (configIndex === undefined) continue
            const requestAuthorization = property(
              property(call.arguments[configIndex], 'headers'),
              'authorization',
            )
            const authenticatedCall =
              requestAuthorization && !independentApiKey(requestAuthorization)
            for (const instance of clientInstances(method.object)) {
              const node = instance.origin
              if (reported.has(node) || exported.has(node)) continue
              const bonded = bonds.some(
                (bond) =>
                  bond.id === instance.id &&
                  (execution(bond.at) !== execution(call) || position(bond.at) < position(call)),
              )
              if (bonded) continue
              const config = node.arguments[0]
              const authorization = property(property(config, 'defaultHeaders'), 'authorization')
              if (authorization && independentApiKey(authorization)) continue
              const baseURL = string(property(config, 'baseURL'))
              const hasAppBaseURL =
                baseURL !== null && (appBaseURLs.has(baseURL) || /^\/api(?:\/|$)/.test(baseURL))
              const authenticated =
                property(config, 'authScheme') ||
                (authorization && !independentApiKey(authorization)) ||
                authenticatedCall ||
                (hasAuthTokenSource && hasAppBaseURL)
              if (authenticated) {
                context.report({
                  node,
                  messageId: 'unbonded',
                  data: { factory: clientFactory(node.callee).name },
                })
                reported.add(node)
              }
            }
          }
          for (const node of calls) {
            if (!transport(node.callee)) continue
            if (
              node.arguments.some((arg) => {
                const authorization = property(property(arg, 'headers'), 'authorization')
                return authorization && !independentApiKey(authorization)
              })
            )
              context.report({ node, messageId: 'http' })
          }
        }
      },
    }
  },
}
