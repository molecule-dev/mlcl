/**
 * Keep declared clients and resource mutation results on the normal verification path.
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
 * factory creation must be passed, directly or through an immutable local
 * alias, to setClient or an imported bond('http'/'http-client', …) in the same
 * file, or handed off through an export. Factory options never establish an
 * exemption.
 *
 * Applicability limit: factory hand-off is a single-module check. An exported client or
 * exported factory is not reported in its defining module; whether an importing
 * composition root bonds it is outside this rule's syntax-only view. The export
 * may be direct, through immutable const aliases, or a local factory's returned
 * value. Sol r11 #2's separate-invocation case (one invocation exported and a
 * different invocation used locally) is therefore an accepted miss.
 * Session-action omissions use React hook identities and the scaffold's literal
 * src/config + direct auth-default bond. Dynamic config and other composition
 * roots are not inferred. Local call discovery does not prove branch timing or
 * the identity of the value passed to setUser.
 * Auth snapshot checks cover a custom React hook seeding state from one client's
 * getState/getUser/getAccessToken contract; form defaults and other stores are not inferred.
 * Article checks cover awaited updates followed by a lookup using the same lexical
 * slug binding in that function. Cross-module control flow is not inferred.
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
        root: dir,
        auth: pkg.name !== AUTH && Object.hasOwn(dependencies, AUTH),
        http: pkg.name !== HTTP && Object.hasOwn(dependencies, HTTP),
        article: Object.hasOwn(dependencies, '@molecule/api-resource-article'),
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
      logout:
        'This sign-out handler only navigates and leaves the subscribed session signed in. Call useAuth().logout() or the bonded auth client logout() before navigation. If another route owns sign-out, delegate to that action or use a reasoned ESLint disable at this handler.',
      profile:
        'This write targets the configured auth profile endpoint but does not publish the saved user. Use useAuth().updateProfile(changes), or call the bonded auth client setUser(savedUser) with the canonical response in this handler before navigation. Otherwise subscribed views and the next form visit keep the old profile.',
      authSubscription:
        'This hook seeds a React auth snapshot but never subscribes its setter to that client. Other consumers keep the signed-out snapshot after login. Use useAuth from @molecule/app-react, or subscribe to this client in an effect, update this snapshot on each notification, and return the unsubscribe cleanup.',
      staleArticleSlug:
        'updateArticle can rename the slug, so this lookup can return null after a successful save. Use the successful update result’s article directly; if another lookup is needed, use article.slug from that result instead of the old slug. The service also sets updatedAt.',
      http: '@molecule/app-http is declared: replace this authenticated transport with getClient().request/get/post; keep response/error mapping local. Configure authScheme on createFetchClient and tokenKey in the auth bond; keep setAuthTokenSource and setAuthGate.',
      unbonded:
        "@molecule/app-http is declared: this {{factory}} result is created without setClient or an HTTP bond, so it does not receive the app token source that setAuthTokenSource installs on bonded clients (and the getClient() fallback). setAuthGate is global and still applies; it does not install that token source. Call setClient({{factory}}(...)) or bond('http', …, {{factory}}(...)) once in the existing bonds/ composition root, then use getClient() everywhere.",
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
    if (!packages.auth && !packages.http && !packages.article) return {}
    const source = context.sourceCode ?? context.getSourceCode()
    const calls = []
    const contexts = []
    const states = []
    const clickHandlers = []
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
    const stableConst = (id) => {
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
      return definition.node
    }
    const localFunction = (callee, seen = new Set()) => {
      callee = unwrap(callee)
      if (FUNCTIONS.includes(callee?.type)) return callee
      if (callee?.type === 'CallExpression' && imported(callee.callee, ['react'], ['useCallback']))
        return localFunction(callee.arguments[0], seen)
      if (callee?.type !== 'Identifier' || seen.has(callee)) return null
      seen.add(callee)
      const binding = variable(callee)
      const definition = binding?.defs[0]
      if (
        binding?.defs.length === 1 &&
        definition.type === 'FunctionName' &&
        !binding.references.some((ref) => ref.isWrite() && !ref.init)
      )
        return definition.node
      const declarator = stableConst(callee)
      return declarator ? localFunction(declarator.init, seen) : null
    }
    const FRAMEWORK_AUTH = ['@molecule/app-react', '@molecule/app-react-native']
    const clientValue = (node, seen = new Set()) => {
      node = unwrap(node)
      if (!node || seen.has(node)) return node
      seen.add(node)
      const declarator = stableConst(node)
      return declarator ? clientValue(declarator.init, seen) : node
    }
    const authSource = (node) => {
      node = clientValue(node)
      const definition = variable(node)?.defs[0]
      if (definition?.type === 'ImportBinding' && definition.node.imported?.name === 'authClient') {
        const module = definition.parent.source.value
        if (
          module.startsWith('.') &&
          packages.root &&
          resolve(dirname(filename), module).replace(/\.[cm]?[jt]s$/, '') ===
            join(packages.root, 'src/bonds/auth-default')
        )
          return true
      }
      return (
        node?.type === 'CallExpression' &&
        (imported(node.callee, [AUTH], ['getClient']) ||
          imported(node.callee, FRAMEWORK_AUTH, ['useAuth', 'useAuthClient']))
      )
    }
    const authAction = (callee, method, seen = new Set()) => {
      callee = unwrap(callee)
      if (!callee || seen.has(callee)) return false
      seen.add(callee)
      if (callee?.type === 'MemberExpression')
        return key(callee) === method && authSource(callee.object)
      if (imported(callee, [AUTH], [method])) return true
      const alias = stableConst(callee)
      if (alias) return authAction(alias.init, method, seen)
      const definition = variable(callee)?.defs[0]
      if (
        definition?.type !== 'Variable' ||
        definition.node.id.type !== 'ObjectPattern' ||
        !authSource(definition.node.init)
      )
        return false
      return definition.node.id.properties.some(
        (prop) =>
          prop.type === 'Property' &&
          key(prop) === method &&
          (prop.value.type === 'AssignmentPattern' ? prop.value.left : prop.value) ===
            definition.name,
      )
    }
    const httpSource = (node) => {
      node = clientValue(node)
      return (
        node?.type === 'CallExpression' &&
        (imported(node.callee, [HTTP], ['getClient']) ||
          imported(node.callee, FRAMEWORK_AUTH, ['useHttpClient']))
      )
    }
    const ownerFunction = (node) => {
      for (let parent = node.parent; parent; parent = parent.parent)
        if (FUNCTIONS.includes(parent.type)) return parent
      return null
    }
    // ESLint supplies the parser and scope graph. Inspect calls in the action,
    // including called local helpers and Promise continuations, not unused closures
    // or another handler's publication. This is omission feedback, not a proof of
    // every branch's timing or the response value passed to setUser.
    const actionCalls = (fn, seen = new Set()) => {
      if (!fn?.body || seen.has(fn)) return []
      seen.add(fn)
      const found = []
      const visit = (node) => {
        if (!node || FUNCTIONS.includes(node.type)) return
        if (node.type === 'CallExpression') {
          found.push(node)
          const called = localFunction(node.callee)
          if (called) found.push(...actionCalls(called, seen))
          if (
            node.callee.type === 'MemberExpression' &&
            ['then', 'catch', 'finally'].includes(key(node.callee))
          )
            for (const argument of node.arguments) {
              const callback = localFunction(argument)
              if (callback) found.push(...actionCalls(callback, seen))
            }
        }
        for (const name of source.visitorKeys[node.type] ?? []) {
          const child = node[name]
          if (Array.isArray(child)) child.forEach(visit)
          else visit(child)
        }
      }
      visit(fn.body)
      return found
    }
    // The scaffold's authored src/config is the source of the profile contract.
    // Parse literal configuration with ESLint's parser; never execute it or guess
    // routes from words such as "user". Dynamic/imported contracts stay outside
    // this syntax-only check. No configuration cache can hide an intervening edit.
    const profileTarget = () => {
      const parser = context.languageOptions?.parser
      if (!parser?.parseForESLint || !packages.root) return null
      const parseFile = (path) => {
        try {
          const text = path === filename ? source.text : readFileSync(path, 'utf8')
          return parser.parseForESLint(text, {
            sourceType: 'module',
            ecmaVersion: 'latest',
            filePath: path,
            tsconfigRootDir: packages.root,
            project: false,
            projectService: false,
          }).ast
        } catch (error) {
          if (
            error.code === 'ENOENT' ||
            error.code === 'ENOTDIR' ||
            error instanceof SyntaxError ||
            error.name === 'TSError'
          )
            return null
          throw error
        }
      }
      const declarations = (ast) =>
        ast.body.flatMap((statement) => {
          const declaration =
            statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
          return declaration?.type === 'VariableDeclaration' && declaration.kind === 'const'
            ? declaration.declarations
            : []
        })
      // Do not treat an unused config as the bonded contract. Recognize the
      // scaffold's direct factory + config argument/spread + setClient wiring. An override
      // or a custom composition root cannot be resolved here and stays quiet.
      const bond = ['ts', 'js', 'mjs']
        .map((extension) =>
          parseFile(join(packages.root, 'src', 'bonds', `auth-default.${extension}`)),
        )
        .find(Boolean)
      if (!bond) return null
      const importedName = (module, name) =>
        bond.body
          .find((node) => node.type === 'ImportDeclaration' && node.source.value === module)
          ?.specifiers.find(
            (node) => node.type === 'ImportSpecifier' && node.imported.name === name,
          )?.local.name
      const factory = importedName(AUTH, 'createJWTAuthClient')
      const configImport = importedName('../config.js', 'authConfig')
      const setter = importedName(AUTH, 'setClient')
      const wrappers = [
        'createDefaultAuthClient',
        'createDefaultAuthClientWithHttpSync',
        'createDefaultAuthClientWithFetchClient',
      ]
        .map((name) => importedName('@molecule/app-bonds-default-react', name))
        .filter(Boolean)
      const client = declarations(bond).find(
        (node) =>
          node.init?.type === 'CallExpression' &&
          ((factory && node.id.type === 'Identifier' && node.init.callee.name === factory) ||
            (node.id.type === 'ObjectPattern' &&
              wrappers.includes(node.init.callee.name) &&
              ['authClient', 'setupAuthDefault'].every((name) =>
                node.id.properties.some(
                  (prop) => prop.type === 'Property' && prop.key.name === name,
                ),
              ))),
      )
      if (!configImport || !client) return null
      const wrapped = wrappers.includes(client.init.callee.name)
      if (!wrapped && !setter) return null
      const options = unwrap(client.init.arguments[0])
      if (
        !(options?.type === 'Identifier' && options.name === configImport) &&
        (options?.type !== 'ObjectExpression' ||
          options.properties.filter((prop) => prop.type === 'SpreadElement').length !== 1 ||
          !options.properties.some(
            (prop) => prop.type === 'SpreadElement' && prop.argument.name === configImport,
          ) ||
          options.properties.some(
            (prop) =>
              prop.type === 'Property' &&
              (prop.computed ||
                ['profileEndpoint', 'profileUpdateMethod'].includes(
                  prop.key.name ?? prop.key.value,
                )),
          ))
      )
        return null
      const bonded = (node) => {
        if (!node || typeof node !== 'object') return false
        if (
          node.type === 'CallExpression' &&
          node.callee.name === setter &&
          node.arguments[0]?.name === client.id.name
        )
          return true
        return Object.entries(node).some(
          ([name, child]) =>
            name !== 'parent' && (Array.isArray(child) ? child.some(bonded) : bonded(child)),
        )
      }
      if (!wrapped && !bonded(bond)) return null
      for (const extension of ['ts', 'js', 'mjs']) {
        const configPath = join(packages.root, 'src', `config.${extension}`)
        const ast = parseFile(configPath)
        if (!ast) continue
        const config = unwrap(declarations(ast).find((node) => node.id.name === 'authConfig')?.init)
        if (
          config?.type !== 'ObjectExpression' ||
          config.properties.some((prop) => prop.type === 'SpreadElement')
        )
          return null
        const field = (name) =>
          config.properties.findLast((prop) => (prop.key.name ?? prop.key.value) === name)
        const literal = (node) => {
          node = unwrap(node)
          if (FUNCTIONS.includes(node?.type)) {
            const returns = functionReturns(node)
            node = returns.length === 1 ? unwrap(returns[0]) : null
          }
          if (node?.type === 'Literal' && typeof node.value === 'string') return node.value
          if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
            return node.quasis[0].value.cooked
          return null
        }
        const endpoint = literal(field('profileEndpoint')?.value)
        const methodField = field('profileUpdateMethod')
        const method = methodField ? literal(methodField.value) : 'PATCH'
        return endpoint && ['PUT', 'PATCH', 'POST'].includes(method)
          ? { endpoint, method: method.toLowerCase() }
          : null
      }
      return null
    }
    // Bonding is deliberately a creation-site fact. Only an identifier
    // declarator can hold that client itself; a destructured method cannot.
    const bondedHttpClients = () => {
      const bonded = new Set()
      const add = (client, seen = new Set()) => {
        client = unwrap(client)
        if (!client || seen.has(client)) return
        seen.add(client)
        if (client.type === 'CallExpression' && clientFactory(client.callee)) {
          bonded.add(client)
          return
        }
        const declarator = stableConst(client)
        if (declarator) add(declarator.init, seen)
      }
      for (const client of clientBonds) add(client)
      return bonded
    }
    // A single module can prove an export hand-off, not what its importer does.
    // Containers and calls through arbitrary wrappers stay outside this proof.
    const exportedHttpClients = () => {
      const exported = new Set()
      const creation = (target, seen = new Set()) => {
        target = unwrap(target)
        if (!target || seen.has(target)) return
        seen.add(target)
        if (target.type === 'CallExpression') {
          if (clientFactory(target.callee)) {
            exported.add(target)
            return
          }
          const fn = localFunction(target.callee)
          if (!fn || fn.async || fn.generator) return
          for (const returned of functionReturns(fn)) creation(returned, seen)
          return
        }
        if (FUNCTIONS.includes(target.type)) {
          if (target.async || target.generator) return
          for (const returned of functionReturns(target)) creation(returned, seen)
          return
        }
        if (target.type !== 'Identifier') return
        const declarator = stableConst(target)
        if (declarator) creation(declarator.init, seen)
        else {
          const fn = localFunction(target)
          if (fn) creation(fn, seen)
        }
      }
      for (const statement of source.ast.body) {
        if (statement.exportKind === 'type') continue
        if (statement.type === 'ExportDefaultDeclaration') {
          creation(statement.declaration)
          continue
        }
        if (statement.type !== 'ExportNamedDeclaration') continue
        if (statement.declaration?.type === 'VariableDeclaration') {
          if (statement.declaration.kind !== 'const') continue
          for (const declarator of statement.declaration.declarations)
            if (declarator.id.type === 'Identifier' && declarator.init) creation(declarator.init)
        } else if (statement.declaration?.type === 'FunctionDeclaration') {
          creation(statement.declaration)
        } else if (!statement.declaration && !statement.source) {
          for (const specifier of statement.specifiers)
            if (specifier.exportKind !== 'type') creation(specifier.local)
        }
      }
      return exported
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
      JSXAttribute(node) {
        if (node.name.name === 'onClick' && node.value?.type === 'JSXExpressionContainer')
          clickHandlers.push(node.value.expression)
      },
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
        if (
          packages.http &&
          imported(callee, ['@molecule/app-bond'], ['bond']) &&
          ['http', 'http-client'].includes(string(node.arguments[0]))
        ) {
          const provider =
            node.arguments.length === 2
              ? node.arguments[1]
              : node.arguments.length === 3
                ? node.arguments[2]
                : null
          if (provider) clientBonds.push(provider)
        }
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
        if (packages.article) {
          const module = '@molecule/api-resource-article'
          const updates = calls.filter((call) => {
            if (!imported(call.callee, [module], ['updateArticle'])) return false
            if (call.parent.type !== 'AwaitExpression') return false
            const input = unwrap(call.arguments[2])
            // A literal patch that cannot change the title cannot rename the slug.
            return (
              input?.type !== 'ObjectExpression' ||
              input.properties.some(
                (prop) => prop.type === 'SpreadElement' || key(prop) === 'title',
              )
            )
          })
          for (const read of calls) {
            if (!imported(read.callee, [module], ['getArticleBySlug', 'findArticleRow'])) continue
            const argument = unwrap(read.arguments[0])
            if (argument?.type !== 'Identifier') continue
            const slug = identity(argument)
            const binding = variable(argument)
            const update = updates.find(
              (call) =>
                call.range[1] < read.range[0] &&
                ownerFunction(call) === ownerFunction(read) &&
                identity(call.arguments[0]) === slug &&
                !binding?.references.some(
                  (ref) =>
                    ref.isWrite() &&
                    ref.identifier.range[0] > call.range[1] &&
                    ref.identifier.range[0] < read.range[0],
                ),
            )
            if (update) context.report({ node: read, messageId: 'staleArticleSlug' })
          }
        }
        if (packages.auth) {
          for (const state of states) {
            if (!imported(state.callee, ['react'], ['useState'])) continue
            const hook = ownerFunction(state)
            const name = hook?.id?.name ?? hook?.parent?.id?.name
            const seed = state.arguments[0]
            const setter = state.parent.id?.type === 'ArrayPattern' && state.parent.id.elements[1]
            if (!/^use[A-Z]/.test(name ?? '') || !seed || setter?.type !== 'Identifier') continue
            const clients = new Map()
            for (const call of calls) {
              if (call.range[0] < seed.range[0] || call.range[1] > seed.range[1]) continue
              const callee = unwrap(call.callee)
              if (
                callee.type !== 'MemberExpression' ||
                !['getState', 'getUser', 'getAccessToken'].includes(key(callee))
              )
                continue
              const client = identity(callee.object)
              const readers = clients.get(client) ?? new Set()
              readers.add(key(callee))
              clients.set(client, readers)
            }
            const hookCalls = actionCalls(hook)
            for (const call of [...hookCalls]) {
              if (imported(call.callee, ['react'], ['useEffect', 'useLayoutEffect']))
                hookCalls.push(...actionCalls(localFunction(call.arguments[0])))
            }
            for (const [client, readers] of clients) {
              if (readers.size !== 3) continue
              const subscribed = hookCalls.some((call) => {
                const callee = unwrap(call.callee)
                return (
                  callee.type === 'MemberExpression' &&
                  ['subscribe', 'onAuthChange'].includes(key(callee)) &&
                  identity(callee.object) === client &&
                  actionCalls(localFunction(call.arguments[0])).some(
                    (notify) => variable(notify.callee) === variable(setter),
                  )
                )
              })
              if (!subscribed) {
                context.report({ node: state, messageId: 'authSubscription' })
                break
              }
            }
          }
          // A deliberately narrow sign-out omission: a named click handler whose
          // sole operation is the router's navigate. External sign-out delegates,
          // genuine logout calls and ordinary navigation controls remain valid.
          if (
            calls.some((node) =>
              imported(node.callee, FRAMEWORK_AUTH, ['useAuth', 'useAuthClient']),
            )
          ) {
            const reported = new Set()
            for (const handler of clickHandlers) {
              const fn = localFunction(handler)
              const name = handler.type === 'Identifier' ? handler.name : fn?.id?.name
              if (
                !fn ||
                reported.has(fn) ||
                !/^(?:(?:handle|on))?(?:logout|logOut|signOut)$/i.test(name ?? '')
              )
                continue
              const body = fn.body.type === 'BlockStatement' ? fn.body.body : [fn.body]
              if (body.length !== 1) continue
              const statement = body[0]
              let expression =
                statement.type === 'ExpressionStatement'
                  ? statement.expression
                  : statement.type === 'ReturnStatement'
                    ? statement.argument
                    : statement
              if (expression?.type === 'AwaitExpression') expression = expression.argument
              const navigation = value(expression?.callee)
              if (
                expression?.type === 'CallExpression' &&
                navigation?.type === 'CallExpression' &&
                imported(
                  navigation.callee,
                  ['react-router', 'react-router-dom', '@molecule/app-react'],
                  ['useNavigate'],
                )
              ) {
                reported.add(fn)
                context.report({ node: fn, messageId: 'logout' })
              }
            }
          }
          const writes = calls.filter(
            (node) =>
              node.callee.type === 'MemberExpression' &&
              ['put', 'patch', 'post'].includes(key(node.callee)) &&
              httpSource(node.callee.object),
          )
          const target = writes.length ? profileTarget() : null
          if (target)
            for (const node of writes) {
              if (
                key(node.callee) !== target.method ||
                string(node.arguments[0]) !== target.endpoint
              )
                continue
              const fn = ownerFunction(node)
              if (!fn || !actionCalls(fn).some((call) => authAction(call.callee, 'setUser')))
                context.report({ node, messageId: 'profile' })
            }
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
