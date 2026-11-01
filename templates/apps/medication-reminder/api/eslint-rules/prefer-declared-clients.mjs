/**
 * Keep declared auth and HTTP clients on the app's normal verification path.
 * Canonical source: scripts/eslint-rules/prefer-declared-clients.mjs.
 * Vendored into mlcl and generated projects by sync-eslint-rules/scaffold.
 *
 * This checks ownership signals, not imports: importing a package does not
 * excuse a second credential store. Public fetches, business API adapters and
 * form state are allowed. An intentionally independent protocol can use ESLint's
 * normal, reasoned disable comment at the narrow call site.
 *
 * Threat model: the rule catches ACCIDENTAL bypass, the shapes a model or a
 * developer writes when it builds its own client instead of using the bonded
 * one. It is not a sandbox against code written to evade it. Every provider-
 * factory creation must be bonded at its creation site or exported for its
 * composition root to bond; factory options never establish an exemption.
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
        '@molecule/app-http is declared: this {{factory}} result is created without setClient, so it does not receive the app token source that setAuthTokenSource installs on bonded clients (and the getClient() fallback). setAuthGate is global and still applies; it does not install that token source. Call setClient({{factory}}(...)) once in the existing bonds/ composition root, then use getClient() everywhere.',
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
    const imported = (node, modules, names, seen = new Set()) => {
      node = unwrap(node)
      if (!node || seen.has(node)) return false
      seen.add(node)
      if (node.type === 'Identifier') {
        const binding = variable(node)
        const def = binding?.defs[0]
        if (
          def?.type === 'ImportBinding' &&
          modules.includes(def.parent.source.value) &&
          names.includes(def.node.imported?.name ?? 'default')
        )
          return true
        if (
          binding?.defs.length === 1 &&
          def?.type === 'Variable' &&
          def.node.init &&
          !binding.references.some((ref) => ref.isWrite() && !ref.init)
        ) {
          if (def.node.id.type === 'ObjectPattern') {
            if (def.node.parent.kind !== 'const') return false
            const property = def.node.id.properties.find((prop) => {
              if (prop.type !== 'Property') return false
              const selected =
                prop.value.type === 'AssignmentPattern' ? prop.value.left : prop.value
              return selected === def.name
            })
            const namespace = variable(value(def.node.init))?.defs[0]
            return Boolean(
              property &&
              namespace?.type === 'ImportBinding' &&
              namespace.node.type === 'ImportNamespaceSpecifier' &&
              modules.includes(namespace.parent.source.value) &&
              names.includes(key(property)),
            )
          }
          if (def.node.id.type === 'Identifier')
            return imported(def.node.init, modules, names, seen)
        }
      }
      if (node.type === 'MemberExpression') {
        const def = variable(value(node.object))?.defs[0]
        return Boolean(
          def?.type === 'ImportBinding' &&
          modules.includes(def.parent.source.value) &&
          names.includes(key(node)),
        )
      }
      return false
    }
    const clientFactory = (callee) =>
      HTTP_FACTORIES.find(({ module, name }) => imported(callee, [module], [name]))
    const sharedAuth = (node, seen = new Set()) => {
      node = value(node)
      if (!node || seen.has(node)) return false
      seen.add(node)
      if (node.type !== 'CallExpression') return false
      if (imported(node.callee, [AUTH], ['getClient', 'getUser', 'createJWTAuthClient']))
        return true
      return node.callee.type === 'MemberExpression' && sharedAuth(node.callee.object, seen)
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
    // Bonding is deliberately a creation-site fact. Following values through
    // invocations, parameters, properties and writes cannot prove which runtime
    // instance a request uses; the scaffold keeps this direct const shape instead.
    const bondedHttpClients = () => {
      const bonded = new Set()
      const add = (client) => {
        client = unwrap(client)
        if (client?.type === 'CallExpression' && clientFactory(client.callee)) {
          bonded.add(client)
          return
        }
        if (client?.type !== 'Identifier') return
        const binding = variable(client)
        const definition = binding?.defs[0]
        if (
          binding?.defs.length !== 1 ||
          definition.type !== 'Variable' ||
          definition.node.parent.kind !== 'const'
        )
          return
        const init = unwrap(definition.node.init)
        if (init?.type === 'CallExpression' && clientFactory(init.callee)) bonded.add(init)
      }
      for (const client of clientBonds) add(client)
      return bonded
    }
    // An exported client or plain container may be bonded by its importing
    // composition root only when this module does not also use it. Direct
    // container assembly, exports and same-file setClient calls are hand-off
    // references; every other reference makes the dependent creation local.
    const exportedHttpClients = () => {
      const origins = new Set()
      const stableConst = (id, handoff) => {
        if (id?.type !== 'Identifier') return null
        const binding = variable(id)
        const definition = binding?.defs[0]
        if (
          binding?.defs.length !== 1 ||
          definition.type !== 'Variable' ||
          definition.node.parent.kind !== 'const' ||
          definition.node.id.type !== 'Identifier' ||
          !definition.node.init ||
          binding.references.some((ref) => ref.isWrite() && !ref.init)
        )
          return null
        if (handoff) handoff.bindings.add(binding)
        return definition.node
      }
      const localFunction = (callee) => {
        callee = unwrap(callee)
        if (FUNCTIONS.includes(callee?.type)) return callee
        if (callee?.type !== 'Identifier') return null
        const binding = variable(callee)
        const definition = binding?.defs[0]
        if (
          binding?.defs.length === 1 &&
          definition.type === 'FunctionName' &&
          !binding.references.some((ref) => ref.isWrite() && !ref.init)
        )
          return definition.node
        const declarator = stableConst(callee)
        const init = unwrap(declarator?.init)
        return FUNCTIONS.includes(init?.type) ? init : null
      }
      const within = (node, ancestor) => {
        for (let current = node; current; current = current.parent)
          if (current === ancestor) return true
        return false
      }
      const exportReference = (id) => {
        for (let node = id; node; node = node.parent) {
          if (node.type === 'ExportSpecifier') return node.local === id
          if (node.type === 'ExportDefaultDeclaration') return unwrap(node.declaration) === id
          if (node.type === 'ExportNamedDeclaration') return false
        }
        return false
      }
      const typeQueryReference = (id) => {
        for (let node = id.parent; node; node = node.parent)
          if (node.type === 'TSTypeQuery') return true
        return false
      }
      const bondReference = (id) =>
        clientBonds.some((argument) => {
          argument = unwrap(argument)
          return argument === id || (argument?.type === 'MemberExpression' && within(id, argument))
        })
      const finish = (handoff) => {
        const unused = (binding) =>
          binding.references.every(
            (ref) =>
              ref.init ||
              handoff.references.has(ref.identifier) ||
              exportReference(ref.identifier) ||
              typeQueryReference(ref.identifier) ||
              bondReference(ref.identifier),
          )
        for (const [origin, bindings] of handoff.origins)
          if ([...bindings].every(unused)) origins.add(origin)
      }
      const creation = (target, handoff, seen = new Set()) => {
        target = unwrap(target)
        if (target?.type !== 'CallExpression' || seen.has(target)) return
        seen.add(target)
        if (clientFactory(target.callee)) {
          const dependencies = handoff.origins.get(target) ?? new Set()
          for (const binding of handoff.bindings) dependencies.add(binding)
          handoff.origins.set(target, dependencies)
          return
        }
        const fn = localFunction(target.callee)
        // Calls of these functions hand off iterators or Promises, never clients.
        if (!fn || fn.generator || fn.async) return
        for (const returned of functionReturns(fn)) {
          const value = unwrap(returned)
          if (value?.type === 'Identifier') {
            const declarator = stableConst(value, handoff)
            if (declarator) {
              handoff.references.add(value)
              creation(declarator.init, handoff, seen)
            }
          } else creation(value, handoff, seen)
        }
      }
      const containerValue = (target, handoff) => {
        target = unwrap(target)
        if (target?.type === 'Identifier') {
          const declarator = stableConst(target, handoff)
          if (!declarator) return
          handoff.references.add(target)
          target = declarator.init
        }
        creation(target, handoff)
      }
      const exportedValue = (target) => {
        const handoff = { origins: new Map(), bindings: new Set(), references: new Set() }
        target = unwrap(target)
        if (target?.type === 'Identifier') {
          const declarator = stableConst(target, handoff)
          target = declarator ? unwrap(declarator.init) : null
        }
        if (target?.type === 'ObjectExpression') {
          for (const prop of target.properties)
            if (prop.type === 'Property' && !prop.computed && key(prop) !== '__proto__')
              containerValue(prop.value, { ...handoff, bindings: new Set(handoff.bindings) })
        } else if (target?.type === 'ArrayExpression') {
          for (const element of target.elements) {
            if (element?.type === 'SpreadElement') break
            if (element)
              containerValue(element, { ...handoff, bindings: new Set(handoff.bindings) })
          }
        } else creation(target, handoff)
        finish(handoff)
      }
      for (const statement of source.ast.body) {
        if (statement.type === 'ExportDefaultDeclaration') {
          const declaration = unwrap(statement.declaration)
          if (declaration?.type === 'Identifier') exportedValue(declaration)
          else {
            const handoff = { origins: new Map(), bindings: new Set(), references: new Set() }
            creation(declaration, handoff)
            finish(handoff)
          }
          continue
        }
        if (
          statement.type !== 'ExportNamedDeclaration' ||
          statement.source ||
          statement.exportKind === 'type'
        )
          continue
        if (statement.declaration?.type === 'VariableDeclaration')
          for (const declarator of statement.declaration.declarations) exportedValue(declarator.id)
        for (const specifier of statement.specifiers ?? [])
          if (specifier.exportKind !== 'type') exportedValue(specifier.local)
      }
      return origins
    }
    const AXIOS_CONFIG = new Map([
      ['default', 0],
      ['request', 0],
      ['create', 0],
      ['get', 1],
      ['delete', 1],
      ['head', 1],
      ['options', 1],
      ['post', 2],
      ['put', 2],
      ['patch', 2],
      ['postForm', 2],
      ['putForm', 2],
      ['patchForm', 2],
      ['query', 2],
    ])
    const transportConfig = (callee, args) => {
      callee = value(callee)
      if (global(callee, ['fetch']) || globalMember(callee, 'fetch')) return 1
      let method = null
      if (callee?.type === 'Identifier') {
        const definition = variable(callee)?.defs[0]
        if (definition?.type === 'ImportBinding' && definition.parent.source.value === 'axios')
          method = definition.node.imported?.name ?? 'default'
      } else if (callee?.type === 'MemberExpression') {
        if (imported(callee, ['axios'], [...AXIOS_CONFIG.keys()])) method = key(callee)
        else {
          const owner = value(callee.object)
          if (owner?.type === 'CallExpression' && imported(owner.callee, ['axios'], ['create']))
            method = key(callee)
        }
      }
      if (method === 'default' || method === 'request') {
        if (args.length === 1) return 0
        return value(args[0])?.type === 'ObjectExpression' ? 0 : 1
      }
      return method === null ? null : (AXIOS_CONFIG.get(method) ?? null)
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
          const bonded = bondedHttpClients()
          const exported = exportedHttpClients()
          for (const node of calls) {
            const factory = clientFactory(node.callee)
            if (!factory || bonded.has(node) || exported.has(node)) continue
            context.report({
              node,
              messageId: 'unbonded',
              data: { factory: factory.name },
            })
          }
          for (const node of calls) {
            const configIndex = transportConfig(node.callee, node.arguments)
            if (configIndex === null) continue
            const authorization = property(
              property(node.arguments[configIndex], 'headers'),
              'authorization',
            )
            if (authorization && !independentApiKey(authorization))
              context.report({ node, messageId: 'http' })
          }
        }
      },
    }
  },
}
