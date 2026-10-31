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
    const httpClients = []
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
    const property = (node, name, seen = new Set()) => {
      node = value(node)
      if (!node || typeof name !== 'string' || seen.has(node)) return null
      seen.add(node)
      if (node.type === 'ConditionalExpression')
        return property(node.consequent, name, seen) ?? property(node.alternate, name, seen)
      if (node.type === 'LogicalExpression')
        return property(node.left, name, seen) ?? property(node.right, name, seen)
      for (const [prop, next] of mutations.get(identity(node)) ?? [])
        if (prop.toLowerCase() === name.toLowerCase()) return next
      if (node.type === 'ObjectExpression') {
        for (const prop of node.properties) {
          if (prop.type === 'SpreadElement') {
            const found = property(prop.argument, name, seen)
            if (found) return found
          } else if (key(prop)?.toLowerCase() === name.toLowerCase()) return prop.value
        }
      }
      if (node.type === 'MemberExpression')
        return property(property(node.object, key(node), seen), name, seen)
      if (node.type === 'NewExpression' && global(node.callee, ['Headers']))
        return property(node.arguments[0], name, seen)
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
    const functionReturns = (node) => {
      if (node.body.type !== 'BlockStatement') return [node.body]
      const returns = []
      const stack = [node.body]
      const seen = new Set()
      while (stack.length) {
        const current = stack.pop()
        if (!current || typeof current.type !== 'string' || seen.has(current)) continue
        seen.add(current)
        if (
          current !== node.body &&
          ['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression'].includes(
            current.type,
          )
        )
          continue
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
    // Resolve a client back to its provider call through local bindings, factory
    // returns, object properties, and identity wrappers. Multiple possible
    // assignments are all retained: an unknown owner must not become a report.
    const clientOrigins = (node, seen = new Set()) => {
      node = unwrap(node)
      if (!node || seen.has(node)) return []
      seen.add(node)
      if (node.type === 'CallExpression' && clientFactory(node.callee)) return [node]
      if (node.type === 'Identifier') {
        const binding = variable(node)
        const definition = binding?.defs[0]
        if (binding?.defs.length !== 1 || definition.type !== 'Variable') return []
        const sources = definition.node.init ? [definition.node.init] : []
        for (const reference of binding.references) {
          if (!reference.isWrite() || reference.init) continue
          const assignment = reference.identifier.parent
          if (
            assignment?.type === 'AssignmentExpression' &&
            assignment.left === reference.identifier &&
            assignment.operator === '='
          )
            sources.push(assignment.right)
        }
        return sources.flatMap((sourceNode) => clientOrigins(sourceNode, seen))
      }
      if (node.type === 'CallExpression') {
        const callee = value(node.callee)
        const definition = callee?.type === 'Identifier' ? variable(callee)?.defs[0] : undefined
        const fn =
          callee && ['ArrowFunctionExpression', 'FunctionExpression'].includes(callee.type)
            ? callee
            : definition?.type === 'FunctionName'
              ? definition.node
              : null
        if (!fn) return []
        return functionReturns(fn).flatMap((returned) => {
          const result = unwrap(returned)
          const parameter =
            result?.type === 'Identifier'
              ? fn.params.findIndex(
                  (param) => param.type === 'Identifier' && param.name === result.name,
                )
              : -1
          return clientOrigins(parameter >= 0 ? node.arguments[parameter] : returned, seen)
        })
      }
      if (node.type === 'ConditionalExpression')
        return [...clientOrigins(node.consequent, seen), ...clientOrigins(node.alternate, seen)]
      if (node.type === 'LogicalExpression')
        return [...clientOrigins(node.left, seen), ...clientOrigins(node.right, seen)]
      if (node.type === 'MemberExpression') {
        const stored = property(node.object, key(node))
        return stored ? clientOrigins(stored, seen) : []
      }
      return []
    }
    const exportedHttpClient = (node) => {
      for (let current = node; current && current.type !== 'Program'; current = current.parent) {
        if (['ExportDefaultDeclaration', 'ExportNamedDeclaration'].includes(current.type))
          return true
        const id =
          current.type === 'VariableDeclarator' || current.type === 'FunctionDeclaration'
            ? current.id
            : null
        if (
          id?.type === 'Identifier' &&
          variable(id)?.references.some((reference) =>
            ['ExportDefaultDeclaration', 'ExportSpecifier'].includes(
              reference.identifier.parent?.type,
            ),
          )
        )
          return true
      }
      return false
    }
    const usedHttpClient = (node) => {
      let current = node
      while (
        current.parent &&
        [
          'ChainExpression',
          'TSAsExpression',
          'TSTypeAssertion',
          'TSNonNullExpression',
          'TSSatisfiesExpression',
        ].includes(current.parent.type) &&
        current.parent.expression === current
      )
        current = current.parent
      return Boolean(current.parent && current.parent.type !== 'ExpressionStatement')
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
        if (packages.http && clientFactory(callee)) httpClients.push(node)
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
          const bondedOrigins = new Set(clientBonds.flatMap((client) => clientOrigins(client)))
          const appBaseURLs = new Set(
            [...bondedOrigins]
              .map((client) => string(property(client.arguments[0], 'baseURL')))
              .filter((baseURL) => baseURL !== null),
          )
          for (const node of httpClients) {
            if (bondedOrigins.has(node) || exportedHttpClient(node)) continue
            const config = node.arguments[0]
            const authorization = property(property(config, 'defaultHeaders'), 'authorization')
            if (authorization && independentApiKey(authorization)) continue
            const baseURL = string(property(config, 'baseURL'))
            const hasAppBaseURL =
              baseURL !== null && (appBaseURLs.has(baseURL) || /^\/api(?:\/|$)/.test(baseURL))
            const authenticatedCall = calls.some((call) => {
              const method = unwrap(call.callee)
              if (
                method?.type !== 'MemberExpression' ||
                !['request', 'get', 'post', 'put', 'patch', 'delete'].includes(key(method)) ||
                !clientOrigins(method.object).includes(node)
              )
                return false
              return call.arguments.some((argument) => {
                const requestAuthorization = property(
                  property(argument, 'headers'),
                  'authorization',
                )
                return requestAuthorization && !independentApiKey(requestAuthorization)
              })
            })
            const authenticated =
              property(config, 'authScheme') ||
              (authorization && !independentApiKey(authorization)) ||
              authenticatedCall ||
              (hasAuthTokenSource && hasAppBaseURL)
            if (authenticated && usedHttpClient(node))
              context.report({
                node,
                messageId: 'unbonded',
                data: { factory: clientFactory(node.callee).name },
              })
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
