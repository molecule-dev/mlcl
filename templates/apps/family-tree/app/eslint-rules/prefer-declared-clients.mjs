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
 * Query checks compare a useQuery key with one extra array around that same binding in a
 * getQueryClient invalidation. Explicit nested keys and different keys remain valid.
 * Value checks follow immutable, module-local bindings: an unconditional identity update of
 * a default optimistic controller and a structured markdown render result at an HTML sink.
 * Conditional updates, custom equality, other stores and other renderers are not inferred.
 * A one-parameter legacy auth requestBody is ambiguous: its argument is the operation,
 * not the values. Require the two explicit positions or the payload-first mapRequestBody.
 * Only imported auth config types and local factory inputs establish that ownership;
 * opaque configs, spreads and callbacks are not inferred.
 */
import { readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, parse, resolve } from 'node:path'
import { URL } from 'node:url'

const AUTH = '@molecule/app-auth'
const HTTP = '@molecule/app-http'
// mlcl/registry.json's app `http` bond category: the core and every provider factory.
const HTTP_FACTORIES = [
  { module: HTTP, name: 'createFetchClient' },
  { module: '@molecule/app-http-axios', name: 'createAxiosClient' },
]
const INDEPENDENT_API_KEY = /api[_-]?key/i
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
        query:
          Object.hasOwn(dependencies, '@molecule/app-query') ||
          Object.hasOwn(dependencies, '@molecule/app-query-react'),
        optimistic:
          Object.hasOwn(dependencies, '@molecule/app-react') ||
          Object.hasOwn(dependencies, '@molecule/app-state'),
        markdown: Object.hasOwn(dependencies, '@molecule/app-markdown'),
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
      renderNavigation:
        'This component calls the useNavigate result during render. React Router cannot navigate on the initial render, so a signed-out deep link can stay on the protected URL. Return <Navigate to={destination} replace /> or use AuthGuard from @molecule/app-ui-react; put imperative navigation in an effect or event handler.',
      nestedQueryKey:
        'This query is stored under key, but invalidate([key]) wraps that same key in another array and does not invalidate it. Pass the original key to invalidate(key). Invalidation only marks cached data stale: refresh mounted data with the hook result.refetch() when the installed version provides it, or invalidate(key) then await client.fetch with the same query options.',
      unchangedOptimisticValue:
        'This optimistic update returns the current value unchanged (or only spreads it). The default shallowEqual comparison sees no change, so commit never runs. Return the desired changed fields, such as { ...current, enabled: !current.enabled }, and update any related count in the same value. Memoizing the input cannot repair an unchanged update.',
      markdownHtml:
        '@molecule/app-markdown render() returns { html, toc }, not an HTML string. Select result.html (or provider.render(source).html) at this HTML sink; passing the whole result renders [object Object] instead of the markdown content.',
      staleArticleSlug:
        'updateArticle can rename the slug, so this lookup can return null after a successful save. Use the successful update result’s article directly; if another lookup is needed, use article.slug from that result instead of the old slug. The service also sets updatedAt.',
      authRequestBodyOrder:
        '@molecule/app-auth calls requestBody(kind, payload): a one-argument callback receives the operation string, not the form values. Use mapRequestBody: (data) => ({ user: data }) with your API’s envelope, or declare both (kind, payload) positions for an intentional legacy adapter. The first argument is a string, so payload-property reads require the second parameter. Kind-only adapters remain supported.',
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
    if (
      !packages.auth &&
      !packages.http &&
      !packages.article &&
      !packages.query &&
      !packages.optimistic &&
      !packages.markdown
    )
      return {}
    const source = context.sourceCode ?? context.getSourceCode()
    const calls = []
    const states = []
    const clickHandlers = []
    const clientBonds = []
    const authConfigs = []
    const mutations = new Map()

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
    const credential = (name, stored) => {
      const candidate = value(stored)
      if (
        candidate?.type === 'CallExpression' &&
        (authAction(candidate.callee, 'getAccessToken') ||
          authAction(candidate.callee, 'getRefreshToken'))
      )
        return true
      return ['molecule:auth:accessToken', 'molecule:auth:refreshToken'].includes(name)
    }
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
    const authConfigType = (node) =>
      node?.type === 'TSTypeReference' &&
      imported(node.typeName, [AUTH], ['AuthClientConfig', 'AuthClientConfigOptions'])
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
    const unchangedOptimisticUpdate = (call) => {
      if (!packages.optimistic) return false
      const callee = unwrap(call.callee)
      if (callee?.type !== 'MemberExpression' || key(callee) !== 'update') return false
      const controller = clientValue(callee.object)
      if (
        controller?.type !== 'CallExpression' ||
        !imported(
          controller.callee,
          ['@molecule/app-react', '@molecule/app-state'],
          ['useOptimisticValue', 'createOptimisticValue'],
        )
      )
        return false
      const options = clientValue(controller.arguments[0])
      // An unknown/custom equality contract may deliberately treat a fresh identity as a change.
      if (
        options?.type !== 'ObjectExpression' ||
        options.properties.some((prop) => prop.type !== 'Property' || key(prop) === 'equals')
      )
        return false
      const callback = localFunction(call.arguments[0])
      if (!callback || callback.async || callback.params[0]?.type !== 'Identifier') return false
      const body = callback.body
      // Do not infer effects, mutations or guarded no-op branches from their return value.
      const result = unwrap(
        body.type === 'BlockStatement'
          ? body.body.length === 1 && body.body[0].type === 'ReturnStatement'
            ? body.body[0].argument
            : null
          : body,
      )
      const current = variable(callback.params[0])
      const same = (node) => node?.type === 'Identifier' && variable(node) === current
      return (
        same(result) ||
        (result?.type === 'ObjectExpression' &&
          result.properties.length > 0 &&
          result.properties.every(
            (prop) => prop.type === 'SpreadElement' && same(unwrap(prop.argument)),
          ))
      )
    }
    const markdownResult = (node, seen = new Set()) => {
      node = clientValue(node)
      if (!node || seen.has(node)) return false
      seen.add(node)
      if (node.type === 'ConditionalExpression')
        return markdownResult(node.consequent, seen) || markdownResult(node.alternate, seen)
      if (node.type === 'LogicalExpression')
        return markdownResult(node.left, seen) || markdownResult(node.right, seen)
      if (node.type !== 'CallExpression') return false
      if (imported(node.callee, ['react'], ['useMemo']))
        return functionReturns(localFunction(node.arguments[0])).some((result) =>
          markdownResult(result, seen),
        )
      const callee = unwrap(node.callee)
      if (callee?.type !== 'MemberExpression' || key(callee) !== 'render') return false
      const provider = clientValue(callee.object)
      return (
        provider?.type === 'CallExpression' &&
        imported(provider.callee, ['@molecule/app-markdown'], ['getProvider', 'requireProvider'])
      )
    }
    const htmlPayload = (node) => {
      node = clientValue(node)
      if (node?.type !== 'ObjectExpression' || mutations.has(identity(node))) return null
      // Later fields win; an unknown spread or computed key may replace __html. Do not
      // diagnose a value the sink does not actually receive.
      for (const prop of [...node.properties].reverse()) {
        if (prop.type !== 'Property' || key(prop) === null) return null
        if (key(prop) === '__html') return prop.value
      }
      return null
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
      VariableDeclarator(node) {
        if (packages.auth && authConfigType(node.id.typeAnnotation?.typeAnnotation))
          authConfigs.push(node.init)
      },
      'TSAsExpression, TSSatisfiesExpression'(node) {
        if (packages.auth && authConfigType(node.typeAnnotation)) authConfigs.push(node.expression)
      },
      JSXAttribute(node) {
        if (node.name.name === 'onClick' && node.value?.type === 'JSXExpressionContainer')
          clickHandlers.push(node.value.expression)
        if (
          packages.markdown &&
          node.name.name === 'dangerouslySetInnerHTML' &&
          node.value?.type === 'JSXExpressionContainer' &&
          markdownResult(htmlPayload(node.value.expression))
        )
          context.report({ node, messageId: 'markdownHtml' })
      },
      AssignmentExpression(node) {
        if (node.left.type !== 'MemberExpression') return
        if (packages.markdown && key(node.left) === 'innerHTML' && markdownResult(node.right))
          context.report({ node, messageId: 'markdownHtml' })
        mutate(node.left.object, key(node.left), node.right)
        if (packages.auth && storage(node.left.object) && credential(key(node.left), node.right)) {
          context.report({ node, messageId: 'credential' })
        }
      },
      CallExpression(node) {
        calls.push(node)
        if (unchangedOptimisticUpdate(node))
          context.report({ node, messageId: 'unchangedOptimisticValue' })
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
            credential(string(node.arguments[0]), node.arguments[1])
          ) {
            context.report({ node, messageId: 'credential' })
          }
        }
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
        if (packages.query) {
          const queries = calls.flatMap((call) => {
            if (!imported(call.callee, ['@molecule/app-query-react'], ['useQuery'])) return []
            const options = value(call.arguments[0])
            if (options?.type !== 'ObjectExpression') return []
            const property = options.properties.find(
              (prop) => prop.type === 'Property' && key(prop) === 'key',
            )
            return property ? [{ key: identity(property.value), owner: ownerFunction(call) }] : []
          })
          for (const call of calls) {
            const callee = unwrap(call.callee)
            if (callee.type !== 'MemberExpression' || key(callee) !== 'invalidate') continue
            const client = value(callee.object)
            if (
              client?.type !== 'CallExpression' ||
              !imported(client.callee, ['@molecule/app-query'], ['getQueryClient'])
            )
              continue
            const argument = value(call.arguments[0])
            if (argument?.type !== 'ArrayExpression' || argument.elements.length !== 1) continue
            const wrapped = identity(argument.elements[0])
            if (
              queries.some(
                (query) =>
                  query.key === wrapped &&
                  query.owner &&
                  query.owner.range[0] < call.range[0] &&
                  query.owner.range[1] > call.range[1],
              )
            )
              context.report({ node: call, messageId: 'nestedQueryKey' })
          }
        }
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
          const configs = [
            ...authConfigs,
            ...calls
              .filter((call) => imported(call.callee, [AUTH], ['createJWTAuthClient']))
              .map((call) => call.arguments[0]),
          ]
          const reportedAdapters = new Set()
          for (const config of configs) {
            const object = value(config)
            // A spread may override the adapter or install mapRequestBody, which wins at runtime.
            if (
              object?.type !== 'ObjectExpression' ||
              object.properties.some((prop) => prop.type !== 'Property' || key(prop) === null)
            )
              continue
            const mapped = value(property(object, 'mapRequestBody', new Set(), true))
            if (mapped && !(mapped.type === 'Identifier' && global(mapped, ['undefined']))) continue
            let adapter = value(property(object, 'requestBody', new Set(), true))
            if (adapter?.type === 'Identifier') {
              const binding = variable(adapter)
              if (
                binding?.defs.length === 1 &&
                binding.defs[0].type === 'FunctionName' &&
                !binding.references.some((ref) => ref.isWrite())
              )
                adapter = binding.defs[0].node
            }
            if (
              !['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'].includes(
                adapter?.type,
              ) ||
              adapter.params.length !== 1 ||
              adapter.params[0].type === 'RestElement' ||
              reportedAdapters.has(adapter)
            )
              continue
            const first =
              adapter.params[0].type === 'AssignmentPattern'
                ? adapter.params[0].left
                : adapter.params[0]
            const binding = first.type === 'Identifier' ? variable(first) : null
            const invalidObjectRead =
              first.type === 'ObjectPattern' ||
              binding?.references.some(({ identifier }) => {
                const parent = identifier.parent
                return (
                  parent?.type === 'MemberExpression' &&
                  parent.object === identifier &&
                  !parent.computed &&
                  !['length', ...Object.getOwnPropertyNames(String.prototype)].includes(
                    parent.property.name,
                  )
                )
              })
            if (!invalidObjectRead) continue
            reportedAdapters.add(adapter)
            context.report({ node: adapter, messageId: 'authRequestBodyOrder' })
          }
          for (const call of calls) {
            const navigation = value(call.callee)
            if (
              navigation?.type !== 'CallExpression' ||
              !imported(navigation.callee, ['react-router', 'react-router-dom'], ['useNavigate'])
            )
              continue
            const component = ownerFunction(navigation)
            const name = component?.id?.name ?? component?.parent?.id?.name
            // A callback in an effect or event runs after render and remains valid. Only a
            // direct call in the component that owns this hook is established by this scope.
            if (/^[A-Z]/.test(name ?? '') && ownerFunction(call) === component)
              context.report({ node: call, messageId: 'renderNavigation' })
          }
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

// Local React data flow, shared by the collection and editable-field diagnostics below.
// Bindings, not spelling, identify hooks/state. No endpoint, copy, selector or CSS vocabulary
// participates in recognition. This is deliberately a single-module syntax check.
const reactFlows = new WeakMap()
function reactStateFlow(context) {
  if (reactFlows.has(context.sourceCode)) return reactFlows.get(context.sourceCode)
  const source = context.sourceCode
  const unwrap = (node) => {
    while (
      [
        'ChainExpression',
        'TSAsExpression',
        'TSNonNullExpression',
        'TSSatisfiesExpression',
        'ParenthesizedExpression',
      ].includes(node?.type)
    )
      node = node.expression
    return node
  }
  const walk = (node, visit, descend = () => true) => {
    if (!node?.type) return
    visit(node)
    if (!descend(node)) return
    for (const key of source.visitorKeys[node.type] ?? []) {
      const value = node[key]
      if (Array.isArray(value)) value.forEach((part) => walk(part, visit, descend))
      else walk(value, visit, descend)
    }
  }
  const variable = (node) => {
    node = unwrap(node)
    if (!['Identifier', 'JSXIdentifier'].includes(node?.type)) return null
    for (let scope = source.getScope(node); scope; scope = scope.upper) {
      if (scope.set.has(node.name)) return scope.set.get(node.name)
    }
    return null
  }
  const member = (node) =>
    node?.type === 'MemberExpression'
      ? node.computed
        ? node.property.value
        : node.property.name
      : null
  const init = (node) => {
    const definition = variable(node)?.defs[0]
    return definition?.type === 'Variable' && definition.parent.kind === 'const'
      ? unwrap(definition.node.init)
      : null
  }
  const react = (node, name, seen = new Set()) => {
    node = unwrap(node)
    if (!node || seen.has(node)) return false
    seen.add(node)
    if (node.type === 'MemberExpression' && member(node) === name) {
      const definition = variable(node.object)?.defs[0]
      return (
        definition?.type === 'ImportBinding' &&
        definition.parent.source.value === 'react' &&
        ['ImportNamespaceSpecifier', 'ImportDefaultSpecifier'].includes(definition.node.type)
      )
    }
    const definition = variable(node)?.defs[0]
    if (definition?.type === 'ImportBinding')
      return definition.parent.source.value === 'react' && definition.node.imported?.name === name
    return react(init(node), name, seen)
  }
  const isFunction = (node) =>
    ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node?.type)
  const owner = (node) => {
    for (let parent = node.parent; parent; parent = parent.parent)
      if (isFunction(parent)) return parent
    return null
  }
  const callback = (node) =>
    isFunction(unwrap(node)) ? unwrap(node) : isFunction(init(node)) ? init(node) : null
  const states = []
  const effects = []
  const formTuple = (call) => {
    if (member(call?.callee) !== 'asState') return false
    let form = unwrap(call.callee.object)
    if (form?.type === 'Identifier') form = init(form)
    if (form?.type !== 'CallExpression') return false
    const imported = variable(form.callee)?.defs[0]
    return (
      imported?.type === 'ImportBinding' &&
      imported.parent.source.value === '@molecule/app-react' &&
      imported.node.imported?.name === 'useForm'
    )
  }
  walk(source.ast, (node) => {
    if (
      node.type === 'VariableDeclarator' &&
      node.id.type === 'ArrayPattern' &&
      node.init?.type === 'CallExpression' &&
      (react(node.init.callee, 'useState') || formTuple(node.init))
    ) {
      const [value, setter] = node.id.elements
      if (value?.type === 'Identifier' && setter?.type === 'Identifier')
        states.push({
          node,
          value: variable(value),
          setter: variable(setter),
          initial: formTuple(node.init) ? null : unwrap(node.init.arguments[0]),
          owner: owner(node),
        })
    }
    if (
      node.type === 'CallExpression' &&
      (react(node.callee, 'useEffect') || react(node.callee, 'useLayoutEffect'))
    ) {
      const fn = callback(node.arguments[0])
      if (fn) effects.push({ node, fn, owner: owner(node), writes: [] })
    }
  })
  const stateFor = (node) => states.find((state) => state.value && state.value === variable(node))
  const contains = (tree, part) => tree.range[0] <= part.range[0] && tree.range[1] >= part.range[1]
  const asyncGroup = (node, effect) => {
    const promise = (call) => {
      while (
        call?.type === 'CallExpression' &&
        ['then', 'catch', 'finally'].includes(member(call.callee))
      )
        call = unwrap(call.callee.object)
      return call
    }
    for (let parent = node; parent; parent = parent.parent) {
      if (
        isFunction(parent) &&
        parent.parent?.type === 'CallExpression' &&
        ['then', 'catch', 'finally'].includes(member(parent.parent.callee))
      )
        return promise(parent.parent)
      if (isFunction(parent) && parent.async) {
        let awaits = false
        walk(
          parent.body,
          (part) => {
            if (part.type === 'AwaitExpression' && part.range[0] < node.range[1]) awaits = true
          },
          (part) => part === parent.body || !isFunction(part),
        )
        if (awaits) return parent
      }
      if (parent === effect.fn) break
    }
    let awaits = false
    walk(node, (part) => {
      if (part.type === 'AwaitExpression') awaits = true
    })
    return awaits ? node : null
  }
  const asyncWrite = (node, effect) => Boolean(asyncGroup(node, effect))
  for (const effect of effects)
    walk(effect.fn.body, (node) => {
      if (node.type !== 'CallExpression') return
      const state = states.find(
        (item) =>
          item.setter && item.setter === variable(node.callee) && item.owner === effect.owner,
      )
      if (state)
        effect.writes.push({
          node,
          state,
          argument: unwrap(node.arguments[0]),
          group: asyncGroup(node, effect),
          async: asyncWrite(node, effect),
        })
      // Promise.then(setItems), without an intermediate arrow callback.
      if (member(node.callee) === 'then') {
        const target = states.find(
          (item) =>
            item.setter &&
            item.setter === variable(node.arguments[0]) &&
            item.owner === effect.owner,
        )
        if (target)
          effect.writes.push({
            node,
            state: target,
            argument: null,
            group: unwrap(node.callee.object),
            async: true,
          })
      }
    })
  const exits = (node) =>
    node?.type === 'ReturnStatement' ||
    node?.type === 'ThrowStatement' ||
    (node?.type === 'BlockStatement' && exits(node.body.at(-1)))
  // Conditions which must hold to reach a syntax location, including earlier return guards.
  const conditions = (node, stop) => {
    const result = []
    for (let part = node; part?.parent && part !== stop; part = part.parent) {
      const parent = part.parent
      if (
        parent.type === 'LogicalExpression' &&
        parent.right === part &&
        ['&&', '||'].includes(parent.operator)
      )
        result.push([parent.left, parent.operator === '&&'])
      if (['IfStatement', 'ConditionalExpression'].includes(parent.type) && parent.test !== part)
        result.push([parent.test, parent.consequent === part])
      if (parent.type === 'BlockStatement') {
        for (const previous of parent.body) {
          if (previous === part) break
          if (previous.range[0] >= part.range[0]) break
          if (previous.type === 'IfStatement' && !previous.alternate && exits(previous.consequent))
            result.push([previous.test, false])
        }
      }
    }
    return result
  }
  const implies = (test, truth, target, expected) => {
    test = unwrap(test)
    if (!test) return false
    if (target(test)) return truth === expected
    if (test.type === 'UnaryExpression' && test.operator === '!')
      return implies(test.argument, !truth, target, expected)
    if (test.type === 'BinaryExpression' && ['===', '!==', '==', '!='].includes(test.operator)) {
      for (const [left, right] of [
        [test.left, test.right],
        [test.right, test.left],
      ])
        if (typeof right.value === 'boolean')
          return implies(
            left,
            truth === !test.operator.includes('!') ? right.value : !right.value,
            target,
            expected,
          )
    }
    if (
      test.type === 'LogicalExpression' &&
      ((test.operator === '&&' && truth) || (test.operator === '||' && !truth))
    )
      return (
        implies(test.left, truth, target, expected) || implies(test.right, truth, target, expected)
      )
    return false
  }
  const guarded = (node, stop, target, expected) =>
    conditions(node, stop).some(([test, truth]) => implies(test, truth, target, expected))
  const attr = (node, name) =>
    node.attributes?.find((part) => part.type === 'JSXAttribute' && part.name.name === name)
  const expression = (attribute) =>
    unwrap(
      attribute?.value?.type === 'JSXExpressionContainer'
        ? attribute.value.expression
        : attribute?.value,
    )
  const actionable = (opening) => {
    if (attr(opening, 'onClick')) return true
    if (opening.name.type !== 'JSXIdentifier') return false
    if (['a', 'area'].includes(opening.name.name)) return Boolean(attr(opening, 'href'))
    const definition = variable(opening.name)?.defs[0]
    return (
      definition?.type === 'ImportBinding' &&
      ['react-router', 'react-router-dom', '@molecule/app-routing-react-router'].includes(
        definition.parent.source.value,
      ) &&
      ['Link', 'NavLink'].includes(definition.node.imported?.name) &&
      Boolean(attr(opening, 'to'))
    )
  }
  const flow = {
    source,
    unwrap,
    walk,
    variable,
    member,
    init,
    react,
    isFunction,
    owner,
    callback,
    states,
    effects,
    stateFor,
    contains,
    asyncWrite,
    conditions,
    implies,
    guarded,
    attr,
    expression,
    actionable,
  }
  reactFlows.set(source, flow)
  return flow
}

/**
 * Reads the components a file renders from their own modules: each relative import is parsed once
 * per linted file with the scaffold parser, and `roots` lists the expressions a component function
 * returns. Shared by the scaffold rules that must see through an imported component.
 *
 * @param parser - The parser the scaffold lints with (typescript-eslint).
 * @param context - The rule context of the file being linted.
 * @returns Resolution helpers sharing one parse cache for this file.
 */
function componentResolver(parser, context) {
  const cache = new Map()
  const scopes = new WeakMap([[context.sourceCode.ast, context.sourceCode.scopeManager.scopes]])
  const unwrap = (node) =>
    ['TSAsExpression', 'TSNonNullExpression', 'ParenthesizedExpression'].includes(node?.type)
      ? unwrap(node.expression)
      : node
  const declaration = (tree, name) => {
    for (const statement of tree.body) {
      const node = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
      if (!node) continue
      if (node.type === 'FunctionDeclaration' && node.id?.name === name) return node
      if (node.type === 'VariableDeclaration') {
        const found = node.declarations.find(
          (item) => item.id.type === 'Identifier' && item.id.name === name,
        )
        if (found) return unwrap(found.init)
      }
    }
    return null
  }
  const imported = (tree, name, filename) => {
    const statement = tree.body.find(
      (node) =>
        node.type === 'ImportDeclaration' &&
        node.specifiers.some((item) => item.local.name === name),
    )
    if (!statement || statement.importKind === 'type' || !statement.source.value.startsWith('.'))
      return null
    const spec = statement.specifiers.find((item) => item.local.name === name)
    if (spec.importKind === 'type') return null
    const stem = new URL(statement.source.value, `file://${filename}`).pathname
    const paths = [
      stem,
      ...['.tsx', '.ts', '.jsx', '.js'].map((ext) => stem.replace(/\.[cm]?jsx?$/, '') + ext),
      stem + '/index.tsx',
    ]
    for (const file of paths) {
      let source = cache.get(file)
      if (source === undefined) {
        try {
          const parsed = parser.parseForESLint(readFileSync(file, 'utf8'), {
            filePath: file,
            tsconfigRootDir: dirname(file),
            ecmaFeatures: { jsx: true },
            sourceType: 'module',
            loc: true,
            range: true,
          })
          source = parsed.ast
          scopes.set(source, parsed.scopeManager.scopes)
        } catch (_error) {
          source = null
        }
        cache.set(file, source)
      }
      if (!source) continue
      const name = spec.type === 'ImportDefaultSpecifier' ? 'default' : spec.imported?.name
      const exported =
        name === 'default'
          ? source.body.find((node) => node.type === 'ExportDefaultDeclaration')?.declaration
          : declaration(source, name)
      return exported ? { node: exported, tree: source, filename: file } : null
    }
    return null
  }
  const roots = (node) => {
    if (node?.type === 'Identifier') return []
    if (
      ['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'].includes(node?.type)
    ) {
      if (node.body.type !== 'BlockStatement') return [node.body]
      const result = []
      const visit = (part) => {
        if (
          !part ||
          ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
            part.type,
          )
        )
          return
        if (part.type === 'ReturnStatement') {
          if (part.argument) result.push(part.argument)
          return
        }
        for (const [key, value] of Object.entries(part)) {
          if (['parent', 'tokens', 'comments', 'loc', 'range'].includes(key)) continue
          if (Array.isArray(value)) for (const item of value) visit(item)
          else if (value && typeof value === 'object') visit(value)
        }
      }
      visit(node.body)
      return result
    }
    return []
  }
  return { scopes, unwrap, imported, roots, declaration }
}

/** Shared scaffold diagnostics. ESLint supplies the parser used for imported source files. */
export function scaffoldRules(parser) {
  const rules = {
    // ESLint owns this syntax policy; neither route names nor supplied tests establish access.
    // Keep a raw URL match independent of the session, or handle access explicitly. TypeScript
    // cannot diagnose a missing navigation effect, and a landing-page probe cannot discover a
    // query view whose link the signed-out render omits. Reuse the module resolver for thin
    // app-owned session hooks rather than guessing authentication from identifier spelling.
    'url-selections-declare-access': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Keep raw React Router URL selections independent of session state, or explicitly handle their access with a route guard.',
        },
        schema: [],
        messages: {
          access:
            'This URL selection is combined with session state without an explicit navigation guard in this component. Hiding its link or disabling its request does not guard a direct visit. Keep public selections independent of the session. For a private view, use useListRoute from @molecule/app-routing-react-router with selections: { public: { path }, private: { path, query, requiresAuth: true } }, auth: { status, redirectTo }, and load only with canLoad. A custom guard may instead return <Navigate> for the signed-out URL selection.',
        },
      },
      create(context) {
        if (TEST.test(context.filename)) return {}
        const source = context.sourceCode
        const routers = ['react-router', 'react-router-dom', '@molecule/app-routing-react-router']
        if (
          !source.ast.body.some(
            (node) =>
              node.type === 'ImportDeclaration' &&
              routers.includes(node.source.value) &&
              node.importKind !== 'type' &&
              node.specifiers.some(
                (spec) =>
                  spec.importKind !== 'type' &&
                  (spec.type === 'ImportNamespaceSpecifier' ||
                    ['useSearchParams', 'useLocation'].includes(spec.imported?.name)),
              ),
          )
        )
          return {}
        const resolver = componentResolver(parser, context)
        const { walk, owner, isFunction, member, unwrap, effects } = reactStateFlow(context)
        const tree = source.ast
        const filename = context.filename
        const binding = (node, ast) => {
          if (!['Identifier', 'JSXIdentifier'].includes(node?.type)) return null
          for (const scope of resolver.scopes.get(ast) ?? []) {
            const reference = scope.references.find((ref) => ref.identifier === node)
            if (reference) return reference.resolved
          }
          return null
        }
        const imported = (node, ast, modules, names) => {
          node = unwrap(node)
          const def = binding(node?.type === 'MemberExpression' ? node.object : node, ast)?.defs[0]
          return (
            def?.type === 'ImportBinding' &&
            def.parent.importKind !== 'type' &&
            def.node.importKind !== 'type' &&
            modules.includes(def.parent.source.value) &&
            (node.type === 'MemberExpression'
              ? def.node.type === 'ImportNamespaceSpecifier' && names.includes(member(node))
              : names.includes(def.node.imported?.name))
          )
        }
        const children = (node) =>
          (source.visitorKeys[node?.type] ?? []).flatMap((key) =>
            Array.isArray(node[key]) ? node[key] : [node[key]],
          )
        // Immutable aliases and destructured hook results preserve provenance. Reassigned
        // values, opaque external hooks and arbitrary function arguments are not inferred.
        const initial = (node, ast) => {
          const variable = binding(node, ast)
          const def = variable?.defs[0]
          return def?.type === 'Variable' &&
            def.parent.kind === 'const' &&
            !variable.references.some((ref) => ref.isWrite() && !ref.init)
            ? def.node.init
            : null
        }
        const session = (node, ast = tree, file = filename, seen = new Set(), projection = []) => {
          node = unwrap(node)
          if (!node || seen.has(node)) return false
          seen.add(node)
          if (node.type === 'Identifier') {
            const pattern = binding(node, ast)?.defs[0]?.node.id
            if (pattern?.type === 'ObjectPattern') {
              const prop = pattern.properties.find((part) => part.value?.name === node.name)
              if (!prop || prop.computed) return false
              projection = [prop.key.name ?? prop.key.value, ...projection]
            }
            return session(initial(node, ast), ast, file, seen, projection)
          }
          if (node.type === 'CallExpression') {
            if (imported(node.callee, ast, ['@molecule/app-react'], ['useAuth'])) return true
            const def = binding(node.callee, ast)?.defs[0]
            if (def?.type === 'ImportBinding' && def.parent.source.value.startsWith('.')) {
              const resolved = resolver.imported(ast, node.callee.name, file)
              return Boolean(
                resolved &&
                resolver
                  .roots(resolved.node)
                  .some((root) =>
                    session(root, resolved.tree, resolved.filename, new Set(seen), projection),
                  ),
              )
            }
            const fn = def?.type === 'FunctionName' ? def.node : initial(node.callee, ast)
            return isFunction(fn)
              ? resolver
                  .roots(fn)
                  .some((root) => session(root, ast, file, new Set(seen), projection))
              : false
          }
          if (node.type === 'MemberExpression')
            return session(node.object, ast, file, seen, [member(node), ...projection])
          if (node.type === 'ObjectExpression' && projection.length) {
            const prop = node.properties.find(
              (part) => !part.computed && (part.key?.name ?? part.key?.value) === projection[0],
            )
            return Boolean(prop && session(prop.value, ast, file, seen, projection.slice(1)))
          }
          if (projection.length) return false
          return children(node).some((child) => session(child, ast, file, seen))
        }
        const query = (node, seen = new Set()) => {
          if (!node || seen.has(node)) return false
          seen.add(node)
          const init = unwrap(initial(node, tree))
          if (init?.type === 'Identifier') return query(init, seen)
          return (
            init?.type === 'CallExpression' &&
            imported(init.callee, tree, routers, ['useSearchParams']) &&
            binding(node, tree)?.defs[0]?.node.id.type === 'ArrayPattern' &&
            binding(node, tree).defs[0].node.id.elements[0]?.name === node.name
          )
        }
        const location = (node, seen = new Set()) => {
          node = unwrap(node)
          if (!node || seen.has(node)) return false
          seen.add(node)
          return node.type === 'CallExpression'
            ? imported(node.callee, tree, routers, ['useLocation'])
            : node.type === 'Identifier' && location(initial(node, tree), seen)
        }
        const urlRead = (node, seen = new Set()) => {
          node = unwrap(node)
          if (!node || seen.has(node)) return false
          seen.add(node)
          if (node.type === 'Identifier') return urlRead(initial(node, tree), seen)
          if (node.type === 'LogicalExpression' && node.operator === '??')
            return urlRead(node.left, seen)
          return (
            (node.type === 'CallExpression' &&
              member(node.callee) === 'get' &&
              query(node.callee.object)) ||
            (member(node) === 'pathname' && location(node.object))
          )
        }
        const match = (node) => {
          if (
            node?.type !== 'BinaryExpression' ||
            !['===', '==', '!==', '!='].includes(node.operator)
          )
            return false
          return [
            [unwrap(node.left), unwrap(node.right)],
            [unwrap(node.right), unwrap(node.left)],
          ].some(
            ([read, value]) =>
              value?.type === 'Literal' &&
              typeof value.value === 'string' &&
              value.value !== '' &&
              urlRead(read),
          )
        }
        const selections = (node, seen = new Set()) => {
          node = unwrap(node)
          if (!node || seen.has(node)) return []
          seen.add(node)
          if (match(node)) return [node]
          if (node.type === 'Identifier') return selections(initial(node, tree), seen)
          if (isFunction(node)) return []
          return children(node).flatMap((child) => selections(child, seen))
        }
        const combinations = []
        const guards = []
        // Session-aware actions on a public filter do not make its view private. Follow
        // immutable aliases to their consumers, excluding event handlers, control attributes
        // and expressions whose only rendered elements are native interactive controls.
        const affectsView = (node, seen = new Set()) => {
          if (!node || seen.has(node)) return false
          seen.add(node)
          for (let part = node; part; part = part.parent)
            if (part.type === 'JSXAttribute' && /^on[A-Z]/.test(part.name?.name)) return false
          for (let part = node; part?.parent; part = part.parent) {
            const parent = part.parent
            if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
              const variable = binding(parent.id, tree)
              return Boolean(
                variable?.references.some(
                  (ref) => ref.isRead() && affectsView(ref.identifier, seen),
                ),
              )
            }
            if (parent.type === 'JSXExpressionContainer') {
              if (parent.parent.type === 'JSXAttribute')
                return ![
                  'disabled',
                  'hidden',
                  'className',
                  'aria-disabled',
                  'aria-current',
                  'aria-selected',
                ].includes(parent.parent.name?.name)
              const elements = []
              walk(part, (child) => {
                if (child.type === 'JSXOpeningElement') elements.push(child.name)
              })
              return (
                !elements.length ||
                !elements.every(
                  (name) =>
                    name.type === 'JSXIdentifier' &&
                    ['a', 'button', 'input', 'select', 'textarea', 'option'].includes(name.name),
                )
              )
            }
            if (
              parent.type === 'CallExpression' ||
              parent.type === 'ReturnStatement' ||
              isFunction(parent)
            )
              return true
          }
          return false
        }
        const renderOwner = (node) => {
          const fn = owner(node)
          return effects.find((effect) => effect.fn === fn)?.owner ?? fn
        }
        const navigates = (node) => {
          node = unwrap(node)
          if (node?.type === 'ReturnStatement') return navigates(node.argument)
          if (node?.type === 'BlockStatement') return node.body.some(navigates)
          if (node?.type === 'ExpressionStatement') return navigates(node.expression)
          if (node?.type === 'CallExpression') {
            const init = unwrap(initial(node.callee, tree))
            return Boolean(
              init?.type === 'CallExpression' &&
              imported(init.callee, tree, routers, ['useNavigate']) &&
              effects.some((effect) => effect.fn === owner(node)),
            )
          }
          return (
            node?.type === 'JSXElement' &&
            imported(node.openingElement.name, tree, routers, ['Navigate']) &&
            Boolean(node.openingElement.attributes.find((attr) => attr.name?.name === 'to'))
          )
        }
        const condition = (node) => {
          const selected = selections(node)
          if (selected.length && session(node))
            combinations.push({ node, selected, owner: renderOwner(node) })
        }
        return {
          LogicalExpression: condition,
          ConditionalExpression(node) {
            condition(node.test)
            if (navigates(node.consequent) || navigates(node.alternate)) guards.push(node.test)
          },
          IfStatement(node) {
            condition(node.test)
            if (navigates(node.consequent) || navigates(node.alternate)) guards.push(node.test)
          },
          'Program:exit'() {
            const reported = new Set()
            for (const combination of combinations) {
              if (!affectsView(combination.node)) continue
              // An explicit guard is a supported custom implementation, not a reason to
              // require our helper. This is guard presence, not proof of its boolean logic.
              const guarded = guards.some(
                (guard) =>
                  renderOwner(guard) === combination.owner &&
                  session(guard) &&
                  selections(guard).some((selection) => combination.selected.includes(selection)),
              )
              if (guarded) continue
              for (const node of combination.selected) {
                if (reported.has(node)) continue
                reported.add(node)
                context.report({ node, messageId: 'access' })
              }
            }
          },
        }
      },
    },
    'effects-preserve-form-edits': {
      meta: {
        type: 'problem',
        schema: [],
        docs: {
          description:
            'Prevent an effect from filling editable field state after edits are possible.',
        },
        messages: {
          overwrite:
            'Mount a keyed form after its record loads; seed state from that record. Or use useForm({ values: loadedData }) from @molecule/app-react to fill pristine fields without erasing edits.',
          unfilled:
            'This draft skips pristine fields after an edit. Mount a keyed form after its record loads, or use useForm({ values: loadedData }) from @molecule/app-react to hydrate fields individually.',
        },
      },
      create(context) {
        return {
          'Program:exit'() {
            const flow = reactStateFlow(context)
            const {
              walk,
              unwrap,
              variable,
              stateFor,
              member,
              attr,
              expression,
              callback,
              effects,
              guarded,
            } = flow
            const fields = []
            // Editability is a state/control fact, independent of how a handler is spelled.
            // A curried helper, useCallback or object method must not hide the field.
            const mutators = (state) => [
              ...new Set(
                state.setter.references
                  .filter(
                    (ref) =>
                      ref.isRead() &&
                      !effects.some((effect) => flow.contains(effect.node, ref.identifier)),
                  )
                  .map((ref) => flow.owner(ref.identifier))
                  .filter((fn) => {
                    if (!fn) return false
                    const name =
                      fn.id ?? (fn.parent?.type === 'VariableDeclarator' ? fn.parent.id : null)
                    return !name || variable(name)?.references.length > 0
                  }),
              ),
            ]
            // A controlled value is a draft only if its own input handler stores it
            // synchronously. Resolve same-file definitions, including factories, but
            // stop at imports, deferred callbacks and the first await of each function.
            const inputStores = (handler, state) => {
              const seen = new Set()
              const dereference = (node, aliases, visited = new Set()) => {
                node = unwrap(node)
                const binding = variable(node)
                if (!binding || visited.has(binding)) return node
                visited.add(binding)
                if (aliases.has(binding)) return dereference(aliases.get(binding), aliases, visited)
                const def = binding.defs[0]
                if (def?.type === 'FunctionName') return def.node
                if (
                  def?.type === 'Variable' &&
                  def.parent.kind === 'const' &&
                  def.node.id.type === 'Identifier'
                )
                  return dereference(def.node.init, aliases, visited)
                return node
              }
              const bind = (fn, args, aliases) => {
                const next = new Map(aliases)
                fn.params.forEach((param, i) => {
                  if (param.type === 'Identifier' && args[i]) next.set(variable(param), args[i])
                })
                return next
              }
              const firstAwait = (fn) => {
                let end = Infinity
                walk(
                  fn.body,
                  (part) => {
                    if (part.type === 'AwaitExpression') end = Math.min(end, part.range[0])
                  },
                  (part) => !flow.isFunction(part),
                )
                return end
              }
              const functionOf = (value, aliases) => {
                value = dereference(value, aliases)
                if (value?.type === 'CallExpression' && flow.react(value.callee, 'useCallback'))
                  value = dereference(value.arguments[0], aliases)
                if (value?.type === 'MemberExpression') {
                  const owners = new Set()
                  const object = dereference(value.object, aliases, owners)
                  const readonly = () => {
                    for (const binding of owners) {
                      if (
                        binding.defs.some(
                          (def) => def.node?.parent?.parent?.type === 'ExportNamedDeclaration',
                        )
                      )
                        return false
                      for (const reference of binding.references) {
                        if (!reference.isRead()) continue
                        const identifier = reference.identifier
                        const parent = identifier.parent
                        if (
                          parent?.type === 'VariableDeclarator' &&
                          parent.init === identifier &&
                          parent.id.type === 'Identifier' &&
                          parent.parent.kind === 'const'
                        ) {
                          const alias = variable(parent.id)
                          if (!alias) return false
                          owners.add(alias)
                          continue
                        }
                        if (parent?.type !== 'MemberExpression' || parent.object !== identifier)
                          return false
                        let access = parent
                        while (
                          access.parent?.type === 'MemberExpression' &&
                          access.parent.object === access
                        )
                          access = access.parent
                        const use = access.parent
                        if (
                          (use?.type === 'AssignmentExpression' && use.left === access) ||
                          (use?.type === 'UpdateExpression' && use.argument === access) ||
                          (use?.type === 'UnaryExpression' && use.operator === 'delete') ||
                          (use?.type === 'CallExpression' &&
                            use.callee === access &&
                            access !== value)
                        )
                          return false
                      }
                    }
                    return true
                  }
                  let prop
                  if (
                    object?.type === 'ObjectExpression' &&
                    !object.properties.some(
                      (part) => part.type === 'Property' && part.kind !== 'init',
                    ) &&
                    readonly()
                  )
                    for (const part of object.properties.toReversed()) {
                      // Later properties win. An opaque override cannot certify a handler.
                      if (
                        part.type === 'SpreadElement' ||
                        (part.computed && part.key.type !== 'Literal')
                      )
                        break
                      if (
                        part.type !== 'Property' ||
                        String(part.key.name ?? part.key.value) !== member(value)
                      )
                        continue
                      if (part.kind === 'init') prop = part
                      break
                    }
                  value = prop && dereference(prop.value, aliases)
                }
                return flow.isFunction(value) ? value : null
              }
              const invoke = (fn, aliases) => {
                if (!fn || seen.has(fn)) return false
                seen.add(fn)
                const end = firstAwait(fn)
                let stored = false
                walk(
                  fn.body,
                  (part) => {
                    if (part.type !== 'CallExpression' || part.range[1] > end) return
                    const callee = dereference(part.callee, aliases)
                    if (variable(callee) === state.setter) stored = true
                    const called = functionOf(callee, aliases)
                    if (called && invoke(called, bind(called, part.arguments, aliases)))
                      stored = true
                  },
                  (part) => !flow.isFunction(part) && part.range[0] < end,
                )
                seen.delete(fn)
                return stored
              }
              const entries = (node, aliases, factories = new Set()) => {
                node = dereference(node, aliases)
                if (!node) return false
                if (variable(node) === state.setter) return true
                const direct = functionOf(node, aliases)
                if (direct) return invoke(direct, aliases)
                if (node.type !== 'CallExpression') return false
                const factory = functionOf(node.callee, aliases)
                if (!factory || factory.async || factories.has(factory)) return false
                const next = bind(factory, node.arguments, aliases)
                const visited = new Set(factories).add(factory)
                const returns = []
                if (factory.body.type !== 'BlockStatement') returns.push(factory.body)
                else
                  walk(
                    factory.body,
                    (part) => {
                      if (part.type === 'ReturnStatement' && part.argument)
                        returns.push(part.argument)
                    },
                    (part) => !flow.isFunction(part),
                  )
                return returns.some((value) => entries(value, next, visited))
              }
              return entries(handler, new Map())
            }
            walk(flow.source.ast, (node) => {
              if (node.type !== 'JSXOpeningElement') return
              const value = expression(attr(node, 'value')) ?? expression(attr(node, 'checked'))
              let root =
                value?.type === 'LogicalExpression' && value.operator === '??'
                  ? unwrap(value.left)
                  : value
              while (root?.type === 'MemberExpression') root = unwrap(root.object)
              const state = stateFor(root)
              const handler =
                expression(attr(node, 'onChange')) ?? expression(attr(node, 'onInput'))
              if (!state || !handler) return
              const mutationBodies = mutators(state).map((fn) => fn.body)
              if (inputStores(handler, state))
                fields.push({ node, state, change: callback(handler), mutationBodies, value })
            })
            // A dirty witness must be written by this field's own change handler.
            const dirtyGuards = (field) => {
              const bodies = []
              // One logical field may use a local helper without a call graph. Every
              // mutator of that state must set the same dirty witness. Multiple-field
              // drafts cannot use one witness to skip their initial fill.
              for (const body of field.mutationBodies) {
                const guards = []
                walk(
                  body,
                  (part) => {
                    if (
                      part.type === 'AssignmentExpression' &&
                      part.operator === '=' &&
                      member(part.left) === 'current' &&
                      part.right.value === true
                    ) {
                      const ref = variable(part.left.object)
                      const initial = flow.init(part.left.object)
                      if (
                        initial?.type === 'CallExpression' &&
                        flow.react(initial.callee, 'useRef') &&
                        initial.arguments[0]?.value === false
                      )
                        guards.push({
                          target: (node) =>
                            member(node) === 'current' && variable(node.object) === ref,
                          ref: true,
                          binding: ref,
                        })
                    }
                    if (part.type === 'CallExpression' && part.arguments[0]?.value === true) {
                      const state = flow.states.find(
                        (item) =>
                          variable(part.callee) === item.setter && item.initial?.value === false,
                      )
                      if (state)
                        guards.push({
                          target: (node) => variable(node) === state.value,
                          ref: false,
                          binding: state.value,
                        })
                    }
                  },
                  (part) => !flow.isFunction(part),
                )
                bodies.push(guards)
              }
              return (bodies[0] ?? []).filter((guard) =>
                bodies.every((body) =>
                  body.some((other) => other.binding === guard.binding && other.ref === guard.ref),
                ),
              )
            }
            // A scalar dirty witness preserves one value. On an initially defaulted
            // object shared by several inputs, it can prevent the *other* inputs from
            // ever receiving their first record. Already-prefilled objects remain valid.
            const defaultedAggregate = (state, editable) => {
              const path = (node) => {
                node = unwrap(node)
                if (node?.type === 'MemberExpression') {
                  const key = member(node)
                  return key == null ? null : `${path(node.object)}.${key}`
                }
                return variable(node) === state.value ? '' : null
              }
              if (
                new Set(editable.map((field) => path(field.value)).filter((key) => key !== null))
                  .size < 2
              )
                return false
              const defaults = (node, seen = new Set()) => {
                node = unwrap(node)
                if (!node || seen.has(node)) return false
                seen.add(node)
                if (node.type === 'Literal') return true
                if (node.type === 'ArrayExpression')
                  return node.elements.every((part) => defaults(part, new Set(seen)))
                if (node.type === 'ObjectExpression')
                  return node.properties.every(
                    (part) => part.type === 'Property' && defaults(part.value, new Set(seen)),
                  )
                return defaults(flow.init(node), seen)
              }
              return defaults(state.initial)
            }
            const unavailable = (field, target, settled) => {
              if (target && guarded(field.node, field.state.owner, target, settled)) return true
              for (
                let element = field.node.parent;
                element && element !== field.state.owner;
                element = element.parent
              ) {
                if (element.type !== 'JSXElement') continue
                const opening = element.openingElement
                const nativeFieldset =
                  opening.name.type === 'JSXIdentifier' && opening.name.name === 'fieldset'
                if (opening !== field.node && !nativeFieldset) continue
                for (const name of ['disabled', ...(opening === field.node ? ['readOnly'] : [])]) {
                  const attribute = attr(opening, name)
                  if (!attribute) continue
                  if (attribute.value === null || expression(attribute)?.value === true) return true
                  // The field is editable only when this disabled/readOnly expression is false.
                  if (target && flow.implies(expression(attribute), false, target, settled))
                    return true
                }
              }
              return false
            }
            const livePreference = (write, field) => {
              // These framework contracts publish the selection immediately. Mirroring their
              // notification is not asynchronous draft hydration. Match both ends, not names.
              const contracts = [
                ['useTranslation', 'locale', 'setLocale'],
                ['useTheme', 'mode', 'setTheme'],
              ]
              return contracts.some(([hook, valueName, setterName]) => {
                let matched = false
                walk(write.argument, (part) => {
                  const definition = variable(part)?.defs[0]
                  const declaration = definition?.node
                  if (
                    declaration?.type !== 'VariableDeclarator' ||
                    declaration.id.type !== 'ObjectPattern' ||
                    declaration.init?.type !== 'CallExpression'
                  )
                    return
                  const imported = variable(declaration.init.callee)?.defs[0]
                  if (
                    imported?.type !== 'ImportBinding' ||
                    imported.parent.source.value !== '@molecule/app-react' ||
                    imported.node.imported?.name !== hook
                  )
                    return
                  if (
                    !declaration.id.properties.some(
                      (property) =>
                        property.key?.name === valueName &&
                        variable(property.value) === variable(part),
                    )
                  )
                    return
                  const setter = declaration.id.properties.find(
                    (property) => property.key?.name === setterName,
                  )?.value
                  if (!setter) return
                  const writes = []
                  walk(field.change?.body, (call) => {
                    if (
                      call.type === 'CallExpression' &&
                      variable(call.callee) === field.state.setter
                    )
                      writes.push(call.arguments[0])
                  })
                  walk(field.change?.body, (call) => {
                    if (
                      call.type === 'CallExpression' &&
                      variable(call.callee) === variable(setter) &&
                      writes.some(
                        (value) =>
                          flow.source.getText(value) === flow.source.getText(call.arguments[0]),
                      )
                    )
                      matched = true
                  })
                })
                return matched
              })
            }
            const routeMirror = (write, field) => {
              if (write.async) return false
              const initial = flow.isFunction(field.state.initial)
                ? unwrap(field.state.initial.body)
                : field.state.initial
              if (!initial || flow.source.getText(initial) !== flow.source.getText(write.argument))
                return false
              let route = false
              walk(write.argument, (part) => {
                const declaration = variable(part)?.defs[0]?.node
                if (
                  declaration?.type !== 'VariableDeclarator' ||
                  declaration.init?.type !== 'CallExpression'
                )
                  return
                const imported = variable(declaration.init.callee)?.defs[0]
                if (
                  imported?.type === 'ImportBinding' &&
                  [
                    'react-router',
                    'react-router-dom',
                    '@molecule/app-routing-react-router',
                    '@molecule/app-react',
                  ].includes(imported.parent.source.value) &&
                  ['useSearchParams', 'useParams', 'useLocation', 'useListRoute'].includes(
                    imported.node.imported?.name,
                  )
                )
                  route = true
              })
              return route
            }
            const guardedUpdater = (argument, target) => {
              const fn = callback(argument)
              if (!fn || fn.params[0]?.type !== 'Identifier') return false
              const previous = variable(fn.params[0])
              const safeValue = (value) => {
                value = unwrap(value)
                if (variable(value) === previous || guarded(value, fn, target, false)) return true
                return (
                  value?.type === 'ConditionalExpression' &&
                  safeValue(value.consequent) &&
                  safeValue(value.alternate)
                )
              }
              if (fn.body.type !== 'BlockStatement') return safeValue(fn.body)
              let returns = 0
              let safe = true
              walk(
                fn.body,
                (part) => {
                  if (part.type === 'ReturnStatement') {
                    returns++
                    if (!safeValue(part.argument)) safe = false
                  }
                },
                (part) => !flow.isFunction(part),
              )
              return returns > 0 && safe
            }
            const guardedFill = (write, effect, target) => {
              let boundary = effect.fn
              for (
                let parent = write.node.parent;
                parent && parent !== effect.fn;
                parent = parent.parent
              ) {
                if (
                  flow.isFunction(parent) &&
                  ((parent.async && parent === write.group) ||
                    (parent.parent?.type === 'CallExpression' &&
                      ['then', 'catch', 'finally'].includes(member(parent.parent.callee))))
                ) {
                  boundary = parent
                  break
                }
              }
              let lastAwait = -1
              walk(
                boundary.body,
                (part) => {
                  if (part.type === 'AwaitExpression' && part.range[0] < write.node.range[1])
                    lastAwait = Math.max(lastAwait, part.range[1])
                },
                (part) => !flow.isFunction(part),
              )
              return flow
                .conditions(write.node, boundary)
                .some(
                  ([test, truth]) =>
                    test.range[0] > lastAwait && flow.implies(test, truth, target, false),
                )
            }
            const replacedKeys = (argument) => {
              const fn = callback(argument)
              if (!fn || fn.params[0]?.type !== 'Identifier') return null
              const previous = variable(fn.params[0])
              const keys = (node) => {
                node = unwrap(node)
                if (variable(node) === previous) return new Set()
                if (node?.type === 'ConditionalExpression') {
                  const yes = keys(node.consequent),
                    no = keys(node.alternate)
                  return yes && no ? new Set([...yes, ...no]) : null
                }
                if (
                  node?.type !== 'ObjectExpression' ||
                  node.properties[0]?.type !== 'SpreadElement' ||
                  variable(node.properties[0].argument) !== previous
                )
                  return null
                const result = new Set()
                for (const prop of node.properties.slice(1)) {
                  if (prop.type !== 'Property' || (prop.computed && prop.key.type !== 'Literal'))
                    return null
                  result.add(String(prop.key.name ?? prop.key.value))
                }
                return result
              }
              if (fn.body.type !== 'BlockStatement') return keys(fn.body)
              const returns = []
              walk(
                fn.body,
                (node) => {
                  if (node.type === 'ReturnStatement') returns.push(keys(node.argument))
                },
                (node) => !flow.isFunction(node),
              )
              return returns.length && returns.every(Boolean)
                ? new Set(returns.flatMap((value) => [...value]))
                : null
            }
            const fieldKey = (field) => {
              let value = unwrap(field.value)
              if (value?.type === 'LogicalExpression' && value.operator === '??')
                value = unwrap(value.left)
              let key = null
              while (value?.type === 'MemberExpression') {
                key = member(value)
                value = unwrap(value.object)
              }
              return key == null ? null : String(key)
            }
            for (const effect of effects)
              for (const write of effect.writes) {
                if (!write.argument || ['Literal', 'ArrayExpression'].includes(write.argument.type))
                  continue
                const editable = fields.filter((field) => field.state === write.state)
                if (!editable.length) continue
                const replaced = replacedKeys(write.argument)
                const aggregate = defaultedAggregate(write.state, editable)
                let skippedInitialFill = false
                const safe = editable.every((field) => {
                  if (replaced && fieldKey(field) !== null && !replaced.has(fieldKey(field)))
                    return true
                  if (unavailable(field)) return true
                  // The write that first creates a nullable record also fills every
                  // field mounted/disabled on that same state. There is no earlier draft.
                  if (
                    write.state.initial?.type === 'Literal' &&
                    write.state.initial.value === null &&
                    unavailable(field, (node) => variable(node) === write.state.value, true)
                  )
                    return true
                  if (livePreference(write, field)) return true
                  if (routeMirror(write, field)) return true
                  const dirty = dirtyGuards(field).some(
                    (guard) =>
                      (guard.ref || !write.async) &&
                      (guardedFill(write, effect, guard.target) ||
                        guardedUpdater(write.argument, guard.target)),
                  )
                  if (dirty && !aggregate) return true
                  if (dirty && aggregate) skippedInitialFill = true
                  // An explicit request cycle owns its unavailable UI through completion.
                  // It is distinct from merely observing that query.data has arrived.
                  if (
                    write.async &&
                    effect.writes.some(
                      (mark) =>
                        mark.group === write.group &&
                        mark.argument?.value === false &&
                        mark.state.initial?.value === true &&
                        unavailable(field, (node) => variable(node) === mark.state.value, false),
                    )
                  )
                    return true
                  // Filling once is safe only if that same completion state controls editability
                  // AND prevents later fills. Query readiness alone is before, not after, the fill.
                  return (
                    !write.async &&
                    effect.writes.some(
                      (mark) =>
                        mark.argument?.value === true &&
                        mark.state.initial?.value === false &&
                        guarded(
                          write.node,
                          effect.fn,
                          (node) => variable(node) === mark.state.value,
                          false,
                        ) &&
                        unavailable(field, (node) => variable(node) === mark.state.value, true),
                    )
                  )
                })
                if (!safe)
                  context.report({
                    node: write.node,
                    messageId: skippedInitialFill ? 'unfilled' : 'overwrite',
                  })
              }
          },
        }
      },
    },
    'async-collections-have-status': {
      meta: {
        type: 'problem',
        schema: [],
        docs: {
          description:
            'Keep pending async collections distinct from settled empty results and keep empty placeholders out of actionable item styling.',
        },
        messages: {
          pending:
            'This collection starts as [] and is filled asynchronously in an effect, so length === 0 also means the request is still pending. Start it as null and render loading before checking length, or guard this empty branch with a completion flag settled by this collection’s own request. With a query hook, render its status/error separately and check data only after success.',
          item: 'This empty placeholder carries every class of this collection’s actionable mapped items, so anything that finds those items by class finds it as another item. Render the empty status separately with its own class; keep item styling on real records.',
          pendingQuery:
            '`{{name}}` is [] until this query’s request settles, because its `data` is undefined while loading, so this empty branch also shows before the data arrives. Render loading from the query’s status first and show the empty state only once it has succeeded, or render the list through QueryContent.',
          statusItem:
            'This status message ({{status}}) carries every class of the items rendered at line {{line}} (`{{classes}}`{{via}}), so anything that finds those items by class (a test, a script, a :first-child style) finds this message as one of them. Give the message its own class and render it beside the list, not as an item.',
          conditionalItem:
            'This message is shown only while a condition holds, and it carries every class of the clickable items rendered at line {{line}} (`{{classes}}`{{via}}), so anything that finds those items by class (a test, a script, a :first-child style) finds this message as one of them, for example a loading label read as the first item. Give the message its own class and render it beside the list, not as an item.',
        },
      },
      create(context) {
        const resolver = componentResolver(parser, context)
        return {
          'Program:exit'() {
            const flow = reactStateFlow(context)
            const {
              walk,
              unwrap,
              member,
              stateFor,
              effects,
              guarded,
              variable,
              attr,
              expression,
              contains,
            } = flow
            // A hook's query result (`useQuery(...)`, any `use*` hook) holds `data` undefined until
            // its request settles, so `data ?? []`, `data || []` or a `= []` destructuring default
            // reads a pending request as an empty collection. Code that reads anything else of the
            // same result (status, isLoading, error, or the result passed on whole) is taken to
            // tell loading apart itself; only a result read for nothing but its defaulted `data`
            // is reported.
            const hookCall = (node) => {
              node = unwrap(node)
              if (node?.type !== 'CallExpression') return false
              const name =
                node.callee.type === 'Identifier' ? node.callee.name : member(node.callee)
              return typeof name === 'string' && /^use[A-Z]/.test(name)
            }
            const emptyArray = (node) => {
              node = unwrap(node)
              return node?.type === 'ArrayExpression' && node.elements.length === 0
            }
            const keyName = (property) => property.key?.name ?? property.key?.value
            // The single `data` property of `const { data } = useX(...)`, or null.
            const soleDataProperty = (identifier) => {
              const definition = variable(identifier)?.defs[0]
              const pattern =
                definition?.type === 'Variable' &&
                definition.node.id.type === 'ObjectPattern' &&
                hookCall(definition.node.init)
                  ? definition.node.id
                  : null
              if (pattern?.properties.length !== 1) return null
              const [property] = pattern.properties
              const value =
                property.value?.type === 'AssignmentPattern' ? property.value.left : property.value
              return property.type === 'Property' &&
                keyName(property) === 'data' &&
                value === definition.name
                ? property
                : null
            }
            const onlyData = (binding) =>
              binding.references.every((reference) => {
                if (reference.isWrite()) return true
                const parent = reference.identifier.parent
                return (
                  parent?.type === 'MemberExpression' &&
                  parent.object === reference.identifier &&
                  member(parent) === 'data'
                )
              })
            const pendingQueryData = (collection) => {
              let node = unwrap(collection)
              let name = null
              if (node?.type === 'Identifier') {
                name = node.name
                const sole = soleDataProperty(node)
                if (sole)
                  return sole.value.type === 'AssignmentPattern' && emptyArray(sole.value.right)
                    ? { name }
                    : null
                const definition = variable(node)?.defs[0]
                if (definition?.type !== 'Variable' || definition.node.id.type !== 'Identifier')
                  return null
                node = unwrap(definition.node.init)
              }
              if (
                node?.type !== 'LogicalExpression' ||
                !['??', '||'].includes(node.operator) ||
                !emptyArray(node.right)
              )
                return null
              const data = unwrap(node.left)
              name ??= context.sourceCode.getText(data)
              if (data?.type === 'Identifier') return soleDataProperty(data) ? { name } : null
              if (member(data) !== 'data') return null
              const object = unwrap(data.object)
              if (hookCall(object)) return { name }
              if (object?.type !== 'Identifier') return null
              const binding = variable(object)
              const definition = binding?.defs[0]
              return definition?.type === 'Variable' &&
                definition.node.id.type === 'Identifier' &&
                hookCall(definition.node.init) &&
                onlyData(binding)
                ? { name }
                : null
            }
            // An empty placeholder already reported as an item is not reported again below.
            const reportedItems = new Set()
            const emptyBranches = []
            walk(flow.source.ast, (node) => {
              let length
              let emptyWhen = true
              if (
                node.type === 'BinaryExpression' &&
                ['===', '==', '<', '<='].includes(node.operator) &&
                node.right.value === (node.operator === '<' ? 1 : 0)
              )
                length = unwrap(node.left)
              else if (
                node.type === 'BinaryExpression' &&
                ['===', '=='].includes(node.operator) &&
                node.left.value === 0
              )
                length = unwrap(node.right)
              else if (node.type === 'UnaryExpression' && node.operator === '!')
                length = unwrap(node.argument)
              else if (
                node.type === 'MemberExpression' &&
                member(node) === 'length' &&
                node.parent.type === 'ConditionalExpression' &&
                node.parent.test === node
              ) {
                length = node
                emptyWhen = false
              }
              if (member(length) !== 'length') return
              const state = stateFor(length.object)
              const owner = state?.owner ?? flow.owner(node)
              if (!owner) return
              let branch = node
              while (
                branch.parent?.type === 'LogicalExpression' &&
                branch.parent.operator === '&&' &&
                branch.parent.right === branch
              )
                branch = branch.parent
              const parent = branch.parent
              const body =
                parent?.type === 'ConditionalExpression' && parent.test === branch
                  ? emptyWhen
                    ? parent.consequent
                    : parent.alternate
                  : parent?.type === 'LogicalExpression' &&
                      parent.operator === '&&' &&
                      parent.left === branch
                    ? parent.right
                    : parent?.type === 'IfStatement' && parent.test === branch
                      ? parent.consequent
                      : null
              if (!body) return
              let jsx = false
              walk(body, (part) => {
                if (part.type === 'JSXElement') jsx = true
              })
              if (jsx) emptyBranches.push({ node, state, body, owner, collection: length.object })
            })
            for (const { node, state, body, owner, collection } of emptyBranches) {
              const initial = flow.isFunction(state?.initial)
                ? unwrap(state.initial.body)
                : state?.initial
              const loaders = state
                ? effects.filter((effect) =>
                    effect.writes.some((write) => write.state === state && write.async),
                  )
                : []
              const completed =
                loaders.length > 0 &&
                loaders.every((effect) =>
                  effect.writes.some((write) => {
                    const value = write.argument?.value
                    return (
                      write.async &&
                      effect.writes.some(
                        (load) => load.state === state && load.group === write.group,
                      ) &&
                      typeof value === 'boolean' &&
                      write.state.initial?.value === !value &&
                      guarded(
                        node,
                        state.owner,
                        (part) => variable(part) === write.state.value,
                        value,
                      )
                    )
                  }),
                )
              if (
                initial?.type === 'ArrayExpression' &&
                initial.elements.length === 0 &&
                loaders.length &&
                !completed
              )
                context.report({ node, messageId: 'pending' })
              else {
                const pending = pendingQueryData(collection)
                if (pending) context.report({ node, messageId: 'pendingQuery', data: pending })
              }
              // Compare syntax-owned class values only: no selectors or class vocabulary. An
              // ordinary empty card may share layout; the item must actually have an action.
              const placeholders = []
              walk(body, (part) => {
                if (part.type !== 'JSXOpeningElement') return
                const value = expression(attr(part, 'className'))
                if (typeof value?.value === 'string' && value.value.trim())
                  placeholders.push({
                    node: part,
                    classes: value.value.trim().split(/\s+/).sort().join(' '),
                  })
              })
              if (!placeholders.length) continue
              const sameCollection = (left, right) => {
                left = unwrap(left)
                right = unwrap(right)
                if (left?.type === 'Identifier' && right?.type === 'Identifier')
                  return variable(left) !== null && variable(left) === variable(right)
                return (
                  left?.type === 'MemberExpression' &&
                  right?.type === 'MemberExpression' &&
                  member(left) !== null &&
                  member(left) === member(right) &&
                  sameCollection(left.object, right.object)
                )
              }
              const container = (part) => {
                for (let parent = part.parent; parent && parent !== owner; parent = parent.parent)
                  if (parent.type === 'JSXElement') return parent
                return null
              }
              const listContainer = container(node)
              walk(owner, (part) => {
                if (
                  part.type !== 'CallExpression' ||
                  member(part.callee) !== 'map' ||
                  !sameCollection(part.callee.object, collection) ||
                  container(part) !== listContainer
                )
                  return
                walk(part.arguments[0], (item) => {
                  if (item.type !== 'JSXOpeningElement' || !flow.actionable(item)) return
                  const value = expression(attr(item, 'className'))
                  if (typeof value?.value !== 'string') return
                  const classes = value.value.trim().split(/\s+/).sort().join(' ')
                  // Every class of the item, with or without a modifier of its own: whatever finds
                  // the items by one of their classes finds this placeholder too.
                  for (const placeholder of placeholders) {
                    const own = new Set(placeholder.classes.split(' '))
                    if (
                      classes.split(' ').every((name) => own.has(name)) &&
                      !contains(body, item) &&
                      !reportedItems.has(placeholder.node)
                    ) {
                      reportedItems.add(placeholder.node)
                      context.report({ node: placeholder.node, messageId: 'item' })
                    }
                  }
                })
              })
            }
            // A message its author marked as status (role status/alert/progressbar, or aria-busy)
            // that carries every class of an item a .map() in this file renders is found by
            // whatever finds those items by class. So is an unmarked message shown only while a
            // condition holds (a branch of ?: or the right side of &&), with fixed text and no
            // action of its own, that carries every class of a clickable item (X1 l3003, P394:
            // {tags.loading ? <span className="tag-pill tag-default">Loading...</span> : null}
            // beside tags.map(... <Link className="tag-pill tag-default" to=…>); the test read
            // the first .tag-pill and got "Loading..."). An item rendered through a component is
            // read from the className passed to it, else from that component's single root
            // element, declared here or in the relative module it is imported from. Static class
            // strings only; a message inside an item is the item's own and is never compared.
            const staticClasses = (open) => {
              const value = expression(attr(open, 'className'))
              return typeof value?.value === 'string' && value.value.trim()
                ? value.value.trim().split(/\s+/)
                : null
            }
            const statusOf = (open) => {
              const role = expression(attr(open, 'role'))
              if (
                typeof role?.value === 'string' &&
                ['status', 'alert', 'progressbar'].includes(role.value)
              )
                return `role="${role.value}"`
              const busy = attr(open, 'aria-busy')
              if (busy && (busy.value === null || [true, 'true'].includes(expression(busy)?.value)))
                return 'aria-busy'
              return null
            }
            // Shown only while a condition holds: reached from a JSX child through ?: branches
            // and && right sides (fragments between them included), never as a test.
            const conditional = (element) => {
              let through = false
              for (let node = element; node.parent; node = node.parent) {
                const parent = node.parent
                if (parent.type === 'JSXFragment') continue
                if (parent.type === 'ConditionalExpression' && parent.test !== node) through = true
                else if (parent.type === 'LogicalExpression' && parent.right === node)
                  through = true
                else return through && parent.type === 'JSXExpressionContainer'
              }
              return false
            }
            // Fixed text: some text, and nothing read from data. A call whose arguments are all
            // literals (an i18n `t('key', {}, { defaultValue })`) is fixed text too.
            const literal = (node) => {
              node = unwrap(node)
              if (!node) return true
              if (node.type === 'Literal') return true
              if (node.type === 'TemplateLiteral') return node.expressions.length === 0
              if (node.type === 'ObjectExpression')
                return node.properties.every(
                  (p) => p.type === 'Property' && !p.computed && literal(p.value),
                )
              if (node.type === 'ArrayExpression') return node.elements.every(literal)
              return false
            }
            const fixedText = (element) => {
              let text = false
              let fixed = true
              walk(element, (part) => {
                if (part.type === 'JSXText' && part.value.trim()) text = true
                if (part.type !== 'JSXExpressionContainer' || part.parent?.type === 'JSXAttribute')
                  return
                const value = unwrap(part.expression)
                if (value.type === 'JSXEmptyExpression') return
                if (value.type === 'CallExpression' && value.arguments.every(literal)) text = true
                else if (literal(value) && typeof value.value === 'string') text = true
                else if (!literal(value)) fixed = false
              })
              return text && fixed
            }
            // The element whose children hold a node: the list a .map() renders into, or the one
            // a message is shown in.
            const parentElement = (node) => {
              for (let parent = node.parent; parent; parent = parent.parent)
                if (parent.type === 'JSXElement') return parent
              return null
            }
            const tree = flow.source.ast
            const rootElement = (node) => {
              node = unwrap(node)
              return node?.type === 'JSXElement' &&
                node.openingElement.name.type === 'JSXIdentifier'
                ? node.openingElement
                : null
            }
            const items = []
            const callbacks = []
            walk(tree, (part) => {
              if (part.type !== 'CallExpression' || member(part.callee) !== 'map') return
              const callback = part.arguments[0]
              if (!flow.isFunction(callback)) return
              callbacks.push(callback)
              for (const root of resolver.roots(callback)) {
                const open = rootElement(root)
                if (!open) continue
                const name = open.name.name
                let classes = null
                let actionable = flow.actionable(open)
                if (/^[a-z]/.test(name)) classes = staticClasses(open)
                // A className passed to a component (a router <Link>) is the class it renders.
                else if (staticClasses(open)) classes = staticClasses(open)
                else {
                  const binding = variable(open.name)?.defs[0]
                  const target =
                    binding?.type === 'FunctionName'
                      ? { node: binding.node }
                      : binding?.type === 'Variable'
                        ? { node: unwrap(binding.node.init) }
                        : binding?.type === 'ImportBinding'
                          ? resolver.imported(tree, name, context.filename)
                          : null
                  const returns = target ? resolver.roots(target.node) : []
                  const inner = returns.length === 1 ? rootElement(returns[0]) : null
                  if (inner && /^[a-z]/.test(inner.name.name)) {
                    classes = staticClasses(inner)
                    actionable ||= flow.actionable(inner)
                  }
                  if (classes) classes.component = name
                }
                if (classes)
                  items.push({ node: open, classes, actionable, list: parentElement(part) })
              }
            })
            if (!items.length) return
            walk(tree, (part) => {
              if (part.type !== 'JSXOpeningElement') return
              const status = statusOf(part)
              const shown =
                !status &&
                !flow.actionable(part) &&
                conditional(part.parent) &&
                fixedText(part.parent)
              const classes = (status || shown) && staticClasses(part)
              if (!classes || callbacks.some((callback) => contains(callback, part))) return
              if (reportedItems.has(part)) return
              // An empty-list message is the empty check's above (same collection only); an unmarked
              // message counts here only inside the element that holds the items.
              if (!status && emptyBranches.some(({ body }) => contains(body, part))) return
              const list = shown && parentElement(part.parent)
              const item = items.find(
                ({ classes: wanted, actionable, list: holder }) =>
                  (status || (actionable && holder === list)) &&
                  wanted.every((name) => classes.includes(name)),
              )
              if (item)
                context.report({
                  node: part,
                  messageId: status ? 'statusItem' : 'conditionalItem',
                  data: {
                    status,
                    line: item.node.loc.start.line,
                    classes: item.classes.join(' '),
                    via: item.classes.component ? `, the root of <${item.classes.component}>` : '',
                  },
                })
            })
          },
        }
      },
    },
    'no-fixed-navigation-truncation': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Report a fixed prefix that silently hides items from a rendered navigation collection.',
        },
        schema: [],
        messages: {
          truncated:
            'This navigation renders only the first {{limit}} items. Later destinations become unreachable as the collection grows or changes order. Render the complete collection, provide pagination or expansion, or take an explicit limit from the caller. For an intentional fixed leaderboard, use a reasoned ESLint disable at this slice.',
        },
      },
      create(context) {
        const navigates = (opening) => {
          if (opening.name.type !== 'JSXIdentifier') return false
          const name = opening.name.name
          if (name === 'a' || name === 'area')
            return opening.attributes.some(
              (attribute) => attribute.type === 'JSXAttribute' && attribute.name.name === 'href',
            )
          let scope = context.sourceCode.getScope(opening)
          while (scope) {
            const variable = scope.set.get(name)
            if (variable)
              return variable.defs.some(
                (definition) =>
                  definition.type === 'ImportBinding' &&
                  [
                    'react-router',
                    'react-router-dom',
                    '@molecule/app-routing-react-router',
                  ].includes(definition.parent.source.value) &&
                  ['Link', 'NavLink'].includes(definition.node.imported?.name),
              )
            scope = scope.upper
          }
          return false
        }
        return {
          CallExpression(node) {
            const map = node.callee
            if (map.type !== 'MemberExpression' || map.computed || map.property.name !== 'map')
              return
            const slice = map.object
            if (
              slice.type !== 'CallExpression' ||
              slice.callee.type !== 'MemberExpression' ||
              slice.callee.computed ||
              slice.callee.property.name !== 'slice'
            )
              return
            const [start, end] = slice.arguments
            if (
              start?.type !== 'Literal' ||
              start.value !== 0 ||
              end?.type !== 'Literal' ||
              !Number.isInteger(end.value) ||
              end.value <= 0
            )
              return
            let navigation = false
            const visit = (part) => {
              if (!part || typeof part.type !== 'string') return
              if (part.type === 'JSXOpeningElement' && navigates(part)) navigation = true
              for (const key of context.sourceCode.visitorKeys[part.type] ?? []) {
                const value = part[key]
                if (Array.isArray(value)) value.forEach(visit)
                else visit(value)
              }
            }
            visit(node.arguments[0])
            if (navigation)
              context.report({ node: slice, messageId: 'truncated', data: { limit: end.value } })
          },
        }
      },
    },
    // A nullable validator may accept omission (undefined) and reject invalid input (null).
    // A falsy guard combines those outcomes and silently abandons the HTTP request.
    'no-unanswered-optional-guard': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          unanswered:
            '{{helper}} can return undefined without sending a response. This bare return abandons the HTTP request. If null is the invalid-input sentinel, compare {{value}} === null; otherwise send a response or call next before returning.',
        },
      },
      create(context) {
        const source = context.sourceCode
        const binding = (node) => {
          for (let scope = source.getScope(node); scope; scope = scope.upper) {
            const variable = scope.set.get(node.name)
            if (variable) return variable.defs[0]?.node
          }
          return null
        }
        const bare = (node) => node?.type === 'ReturnStatement' && !node.argument
        const unwrap = (node) =>
          node?.type === 'BlockStatement' && node.body.length === 1 ? node.body[0] : node
        const identifierUsed = (node, name) => {
          if (!node) return false
          if (node.type === 'Identifier' && node.name === name) return true
          return (source.visitorKeys[node.type] ?? []).some((key) => {
            const value = node[key]
            return Array.isArray(value)
              ? value.some((part) => identifierUsed(part, name))
              : identifierUsed(value, name)
          })
        }
        return {
          IfStatement(node) {
            if (
              node.test.type !== 'UnaryExpression' ||
              node.test.operator !== '!' ||
              node.test.argument.type !== 'Identifier' ||
              !bare(unwrap(node.consequent))
            )
              return
            const value = node.test.argument
            const declaration = binding(value)
            if (
              declaration?.type !== 'VariableDeclarator' ||
              declaration.parent.kind !== 'const' ||
              declaration.init?.type !== 'CallExpression'
            )
              return
            const call = declaration.init
            if (call.callee.type !== 'Identifier') return
            const definition = binding(call.callee)
            const helper = definition?.type === 'VariableDeclarator' ? definition.init : definition
            if (
              !['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
                helper?.type,
              )
            )
              return
            const union = helper.returnType?.typeAnnotation
            if (
              union?.type !== 'TSUnionType' ||
              !union.types.some((type) => type.type === 'TSUndefinedKeyword') ||
              !union.types.some(
                (type) =>
                  type.type === 'TSNullKeyword' ||
                  (type.type === 'TSLiteralType' && type.literal.value === null),
              )
            )
              return
            let handler = node.parent
            while (
              handler &&
              !['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
                handler.type,
              )
            )
              handler = handler.parent
            const route = handler?.parent
            if (
              route?.type !== 'CallExpression' ||
              route.callee.type !== 'MemberExpression' ||
              !['get', 'post', 'put', 'patch', 'delete', 'all'].includes(route.callee.property.name)
            )
              return
            const response = handler.params[1]
            if (response?.type !== 'Identifier') return
            // An unconditional earlier send already completed this route's response.
            const guardAt =
              handler.body?.body?.findIndex(
                (statement) =>
                  statement.range[0] <= node.range[0] && node.range[1] <= statement.range[1],
              ) ?? -1
            const answered =
              guardAt >= 0 &&
              handler.body.body.slice(0, guardAt).some((statement) => {
                const expression =
                  statement.type === 'ExpressionStatement' ? statement.expression : null
                if (
                  expression?.type !== 'CallExpression' ||
                  expression.callee.type !== 'MemberExpression' ||
                  !['json', 'send', 'end', 'sendStatus', 'redirect'].includes(
                    expression.callee.property.name,
                  )
                )
                  return false
                let receiver = expression.callee.object
                while (
                  receiver?.type === 'CallExpression' &&
                  receiver.callee.type === 'MemberExpression'
                )
                  receiver = receiver.callee.object
                return receiver?.type === 'Identifier' && receiver.name === response.name
              })
            if (answered) return
            const responseIndex = call.arguments.findIndex(
              (arg) => arg.type === 'Identifier' && arg.name === response.name,
            )
            const helperResponse = helper.params[responseIndex]
            if (helperResponse?.type !== 'Identifier' || helper.body?.type !== 'BlockStatement')
              return
            // Prove an early undefined path does not touch the response. Unknown calls or
            // more complex control flow stay unverified; no fix is applied automatically.
            let omitted = false
            for (const statement of helper.body.body) {
              if (identifierUsed(statement, helperResponse.name)) break
              if (statement.type !== 'IfStatement') continue
              const returned = unwrap(statement.consequent)
              if (
                returned?.type === 'ReturnStatement' &&
                returned.argument?.type === 'Identifier' &&
                returned.argument.name === 'undefined' &&
                !binding(returned.argument)
              )
                omitted = true
            }
            if (omitted)
              context.report({
                node,
                messageId: 'unanswered',
                data: { helper: call.callee.name, value: value.name },
              })
          },
        }
      },
    },
    // HTML paragraphs accept phrasing content. Resolve local component roots too: a markdown
    // renderer returning a div must not be hidden behind a component name inside a p.
    'no-block-in-paragraph': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          block:
            '<p> at line {{line}} contains <{{tag}}> through {{component}}. Paragraphs cannot contain block elements; use a <div> for the outer wrapper because browsers close a paragraph before block content.',
        },
      },
      create(context) {
        const block = new Set([
          'address',
          'article',
          'aside',
          'blockquote',
          'details',
          'div',
          'dl',
          'fieldset',
          'figcaption',
          'figure',
          'footer',
          'form',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'header',
          'hgroup',
          'hr',
          'main',
          'menu',
          'nav',
          'ol',
          'p',
          'pre',
          'search',
          'section',
          'table',
          'ul',
        ])
        const { scopes, unwrap, imported, roots } = componentResolver(parser, context)
        const find = (node, tree, filename, seen = new Set(), rootOnly = false) => {
          node = unwrap(node)
          if (!node || seen.has(node) || seen.size >= 24) return null
          seen = new Set(seen).add(node)
          if (node.type === 'JSXElement' || node.type === 'JSXSelfClosingElement') {
            const open = node.openingElement ?? node
            const name = open.name.type === 'JSXIdentifier' ? open.name.name : ''
            if (block.has(name)) return { tag: name, component: name }
            if (['template', 'svg', 'math'].includes(name)) return null
            if (/^[A-Z]/.test(name)) {
              const containing = (scopes.get(tree) ?? [])
                .filter(
                  (scope) =>
                    scope.block.range &&
                    scope.block.range[0] <= open.range[0] &&
                    scope.block.range[1] >= open.range[1],
                )
                .sort(
                  (a, b) =>
                    a.block.range[1] - a.block.range[0] - (b.block.range[1] - b.block.range[0]),
                )
              let scope = containing[0],
                binding = null
              while (scope && !binding) {
                binding = scope.variables.find((variable) => variable.name === name)
                scope = scope.upper
              }
              const def = binding?.defs[0]
              const local =
                def?.type === 'FunctionName'
                  ? def.node
                  : def?.type === 'Variable'
                    ? unwrap(def.node.init)
                    : null
              const target = local
                ? { node: local, tree, filename }
                : def?.type === 'ImportBinding'
                  ? imported(tree, name, filename)
                  : null
              const returns = target ? roots(target.node) : []
              if (returns.length === 1)
                for (const root of returns) {
                  const found = find(root, target.tree, target.filename, seen, true)
                  if (found) return { ...found, component: name }
                }
              // Opaque components may discard their children. Never infer that they render them.
              return null
            }
            if (rootOnly) return null
            for (const child of node.children ?? []) {
              const found = find(child, tree, filename, seen)
              if (found) return found
            }
          } else if (node.type === 'JSXFragment') {
            for (const child of node.children) {
              const found = find(child, tree, filename, seen, rootOnly)
              if (found) return found
            }
          } else if (node.type === 'JSXExpressionContainer')
            return find(node.expression, tree, filename, seen)
          else if (node.type === 'ConditionalExpression') {
            if (rootOnly) return null
            const test = unwrap(node.test)
            if (test.type === 'Literal')
              return find(test.value ? node.consequent : node.alternate, tree, filename, seen)
            return (
              find(node.consequent, tree, filename, seen) ??
              find(node.alternate, tree, filename, seen)
            )
          } else if (node.type === 'LogicalExpression') {
            if (rootOnly) return null
            const left = unwrap(node.left)
            if (left.type === 'Literal') {
              const right =
                node.operator === '&&'
                  ? Boolean(left.value)
                  : node.operator === '||'
                    ? !left.value
                    : left.value === null
              return find(right ? node.right : node.left, tree, filename, seen)
            }
            return find(node.left, tree, filename, seen) ?? find(node.right, tree, filename, seen)
          }
          return null
        }
        return {
          JSXElement(node) {
            if (
              node.openingElement.name.type !== 'JSXIdentifier' ||
              node.openingElement.name.name !== 'p'
            )
              return
            for (const child of node.children) {
              const found = find(child, context.sourceCode.ast, context.filename)
              if (found) {
                context.report({
                  node: node.openingElement,
                  messageId: 'block',
                  data: { ...found, line: node.loc.start.line },
                })
                break
              }
            }
          },
        }
      },
    },
    // A datastore lookup has no update context. Use ESLint's AST and bindings to
    // catch an existence-only duplicate check before a same-table update. The
    // compiler cannot know that the query also matches the unchanged row.
    'unique-update-excludes-self': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          selfConflict:
            "This '{{fields}}' existence check can reject an unchanged value before the update at line {{line}}. Exclude { field: 'id', operator: '!=', value: {{id}} } in the lookup, or pass {{id}} to the helper and reject only another row.",
        },
      },
      create(context) {
        const source = context.sourceCode
        const functions = new Set([
          'FunctionDeclaration',
          'FunctionExpression',
          'ArrowFunctionExpression',
        ])
        const calls = []
        const checks = []
        const unwrap = (node) => {
          while (
            node &&
            [
              'AwaitExpression',
              'TSAsExpression',
              'TSNonNullExpression',
              'TSTypeAssertion',
              'ChainExpression',
            ].includes(node.type)
          )
            node = node.argument ?? node.expression
          return node
        }
        const variable = (node) => {
          if (node?.type !== 'Identifier') return null
          for (let scope = source.getScope(node); scope; scope = scope.upper) {
            const found = scope.set.get(node.name)
            if (found) return found
          }
          return null
        }
        const value = (node, bindings = new Map(), seen = new Set()) => {
          node = unwrap(node)
          if (node?.type !== 'Identifier') return node
          const binding = variable(node)
          if (!binding || seen.has(binding)) return node
          seen.add(binding)
          if (bindings.has(binding)) return value(bindings.get(binding), bindings, seen)
          const definition = binding.defs[0]
          if (
            binding.defs.length === 1 &&
            definition.type === 'Variable' &&
            definition.node.parent.kind === 'const' &&
            definition.node.id.type === 'Identifier' &&
            !binding.references.some((ref) => ref.isWrite() && !ref.init)
          )
            return value(definition.node.init, bindings, seen)
          return node
        }
        const key = (node) => (node?.computed ? node.property?.value : node?.property?.name)
        const imported = (node, name) => {
          node = unwrap(node)
          const identifier = node?.type === 'MemberExpression' ? node.object : node
          const definition = variable(identifier)?.defs[0]
          if (
            definition?.type !== 'ImportBinding' ||
            definition.parent.source.value !== '@molecule/api-database' ||
            definition.parent.importKind === 'type' ||
            definition.node.importKind === 'type'
          )
            return false
          return node.type === 'MemberExpression'
            ? definition.node.type === 'ImportNamespaceSpecifier' && key(node) === name
            : definition.node.imported?.name === name
        }
        const enclosingFunction = (node) => {
          for (let parent = node.parent; parent; parent = parent.parent)
            if (functions.has(parent.type)) return parent
          return null
        }
        const same = (left, right, bindings) => {
          left = value(left, bindings)
          right = value(right)
          if (!left || !right) return false
          if (left === right) return true
          if (left.type === 'Literal' && right.type === 'Literal') return left.value === right.value
          if (left.type === 'MemberExpression' && right.type === 'MemberExpression')
            return (
              key(left) !== undefined &&
              key(left) === key(right) &&
              same(left.object, right.object, bindings)
            )
          return (
            left.type === 'Identifier' &&
            right.type === 'Identifier' &&
            variable(left) !== null &&
            variable(left) === variable(right)
          )
        }
        const property = (node, name) =>
          node?.properties?.find(
            (prop) =>
              prop.type === 'Property' &&
              !prop.computed &&
              (prop.key.name ?? prop.key.value) === name,
          )?.value
        // Deliberately bounded to local helpers returning only existence, not
        // arbitrary application logic or a guessed name such as *Taken().
        const lookup = (node, bindings = new Map(), seen = new Set()) => {
          node = value(node, bindings)
          if (!node || seen.has(node)) return null
          seen = new Set([...seen, node])
          if (
            node.type === 'UnaryExpression' &&
            node.operator === '!' &&
            node.argument.type === 'UnaryExpression' &&
            node.argument.operator === '!'
          )
            return lookup(node.argument.argument, bindings, seen)
          if (node.type !== 'CallExpression') return null
          if (
            node.callee.type === 'Identifier' &&
            node.callee.name === 'Boolean' &&
            !variable(node.callee)?.defs.length &&
            node.arguments.length === 1
          )
            return lookup(node.arguments[0], bindings, seen)
          if (imported(node.callee, 'findOne')) {
            const array = value(node.arguments[1], bindings)
            if (array?.type !== 'ArrayExpression' || !array.elements.length) return null
            if (
              array.elements.every(
                (entry) => value(property(entry, 'value'), bindings)?.type === 'Literal',
              )
            )
              return null
            const conditions = array.elements.map((entry) => {
              const field = value(property(entry, 'field'), bindings)
              const operator = value(property(entry, 'operator'), bindings)
              if (
                field?.type !== 'Literal' ||
                typeof field.value !== 'string' ||
                operator?.type !== 'Literal' ||
                !['=', '!='].includes(operator.value)
              )
                return null
              return {
                field: field.value,
                operator: operator.value,
                value: property(entry, 'value'),
              }
            })
            if (
              conditions.some((entry) => !entry) ||
              !conditions.some((entry) => entry.operator === '=')
            )
              return null
            return { table: node.arguments[0], conditions, bindings }
          }
          let fn = value(node.callee, bindings)
          if (fn?.type === 'Identifier') {
            const binding = variable(fn)
            const definition = binding?.defs[0]
            if (
              binding?.defs.length !== 1 ||
              definition.type !== 'FunctionName' ||
              binding.references.some((ref) => ref.isWrite() && !ref.init)
            )
              return null
            fn = definition.node
          }
          if (!functions.has(fn?.type)) return null
          let returned = fn.body
          if (returned.type === 'BlockStatement') {
            const statements = returned.body
            if (
              !statements.length ||
              statements.at(-1).type !== 'ReturnStatement' ||
              statements
                .slice(0, -1)
                .some(
                  (statement) =>
                    statement.type !== 'VariableDeclaration' || statement.kind !== 'const',
                )
            )
              return null
            returned = statements.at(-1).argument
          }
          const args = new Map(bindings)
          for (const [i, param] of fn.params.entries()) {
            if (param.type !== 'Identifier') return null
            // Resolve caller arguments before binding parameters (including a
            // recursive invocation of the same helper).
            args.set(variable(param), value(node.arguments[i], bindings))
          }
          return lookup(returned, args, seen)
        }
        const endsWithReturn = (block) => {
          const last = block.type === 'BlockStatement' ? block.body.at(-1) : block
          return last?.type === 'ReturnStatement'
        }
        const duplicateBranch = (block) => {
          if (!endsWithReturn(block)) return false
          const duplicateText = (node) => {
            if (!node || functions.has(node.type)) return false
            if (node.type === 'Literal' && typeof node.value === 'string')
              return /\b(?:already (?:been )?(?:taken|used|registered|exists|in use)|duplicate|uniqueness)\b/i.test(
                node.value,
              )
            return (source.visitorKeys[node.type] ?? []).some((key) => {
              const next = node[key]
              return Array.isArray(next) ? next.some(duplicateText) : duplicateText(next)
            })
          }
          const clientError = (node) =>
            node?.type === 'Literal' &&
            typeof node.value === 'number' &&
            node.value >= 400 &&
            node.value < 500
          const stack = [block]
          while (stack.length) {
            const node = stack.pop()
            if (!node || functions.has(node.type)) continue
            if (
              node.type === 'CallExpression' &&
              node.callee.type === 'Identifier' &&
              clientError(node.arguments[1]) &&
              node.arguments.some(duplicateText)
            )
              return true
            if (
              node.type === 'CallExpression' &&
              node.callee.type === 'MemberExpression' &&
              ['json', 'send', 'end'].includes(key(node.callee))
            ) {
              const status = node.callee.object
              if (
                status.type === 'CallExpression' &&
                status.callee.type === 'MemberExpression' &&
                key(status.callee) === 'status' &&
                clientError(status.arguments[0]) &&
                node.arguments.some(duplicateText)
              )
                return true
            }
            if (
              node.type === 'ObjectExpression' &&
              clientError(property(node, 'statusCode')) &&
              duplicateText(property(node, 'body'))
            )
              return true
            for (const child of source.visitorKeys[node.type] ?? []) {
              const next = node[child]
              if (Array.isArray(next)) stack.push(...next)
              else if (next) stack.push(next)
            }
          }
          return false
        }
        const comparesCurrent = (test, query, operators, conjunction = '&&') => {
          test = unwrap(test)
          if (test?.type === 'LogicalExpression' && test.operator === conjunction)
            return (
              comparesCurrent(test.left, query, operators, conjunction) ||
              comparesCurrent(test.right, query, operators, conjunction)
            )
          if (test?.type !== 'BinaryExpression' || !operators.includes(test.operator)) return false
          return [
            [test.left, test.right],
            [test.right, test.left],
          ].some(
            ([next, current]) =>
              current.type === 'MemberExpression' &&
              query.conditions.some(
                (condition) =>
                  condition.field === key(current) && same(condition.value, next, query.bindings),
              ),
          )
        }
        const changedValueGuard = (node, query) => {
          let child = node
          for (
            let parent = node.parent;
            parent && !functions.has(parent.type);
            child = parent, parent = parent.parent
          ) {
            if (parent.type === 'BlockStatement') {
              const prior = parent.body[parent.body.indexOf(child) - 1]
              if (
                prior?.type === 'IfStatement' &&
                !prior.alternate &&
                endsWithReturn(prior.consequent) &&
                comparesCurrent(prior.test, query, ['==', '==='])
              )
                return true
            }
            if (parent.type !== 'IfStatement') continue
            const differs = parent.consequent === child ? ['!=', '!=='] : ['==', '===']
            if (
              comparesCurrent(
                parent.test,
                query,
                differs,
                parent.consequent === child ? '&&' : '||',
              )
            )
              return true
          }
          return false
        }
        const childOf = (node, ancestor) => {
          for (let child = node; child?.parent; child = child.parent)
            if (child.parent === ancestor) return child
          return null
        }
        const canReachWrite = (check, write) => {
          if (enclosingFunction(write) !== enclosingFunction(check)) return false
          for (
            let parent = check.parent;
            parent && !functions.has(parent.type);
            parent = parent.parent
          ) {
            const writeChild = childOf(write, parent)
            if (
              parent.type === 'IfStatement' &&
              writeChild &&
              childOf(check, parent) !== writeChild
            )
              return false
            if (
              parent.type === 'SwitchStatement' &&
              writeChild &&
              childOf(check, parent) !== writeChild
            )
              return false
            if (parent.type === 'BlockStatement' && !writeChild && endsWithReturn(parent))
              return false
          }
          return true
        }
        return {
          CallExpression(node) {
            if (imported(node.callee, 'updateById')) calls.push(node)
          },
          IfStatement(node) {
            checks.push(node)
          },
          'Program:exit'() {
            for (const check of checks) {
              if (!duplicateBranch(check.consequent)) continue
              const query = lookup(check.test)
              if (!query || changedValueGuard(check, query)) continue
              const write = calls.find(
                (call) =>
                  call.range[0] > check.range[1] &&
                  canReachWrite(check, call) &&
                  same(query.table, call.arguments[0], query.bindings) &&
                  query.conditions.some(
                    (condition) =>
                      condition.operator === '=' &&
                      value(condition.value, query.bindings)?.type !== 'Literal' &&
                      same(
                        condition.value,
                        property(value(call.arguments[2]), condition.field),
                        query.bindings,
                      ),
                  ),
              )
              if (
                !write ||
                query.conditions.some(
                  (condition) =>
                    condition.field === 'id' &&
                    condition.operator === '!=' &&
                    same(condition.value, write.arguments[1], query.bindings),
                )
              )
                continue
              context.report({
                node: check.test,
                messageId: 'selfConflict',
                data: {
                  fields: query.conditions
                    .filter((condition) => condition.operator === '=')
                    .map((condition) => condition.field)
                    .join(', '),
                  line: write.loc.start.line,
                  id: source.getText(write.arguments[1]),
                },
              })
            }
          },
        }
      },
    },
    // The bond owns the runtime setting, so this rule only moves router imports.
    // Type-only imports cannot render a router and are deliberately left alone.
    // `HydratedRouter` and the DOM `RouterProvider` (`react-router/dom`, re-exported by
    // `react-router-dom`) move to the bond's `/dom` entry, which keeps `react-dom` out
    // of its main entry.
    'router-commits-with-url': {
      meta: {
        type: 'problem',
        fixable: 'code',
        schema: [],
        messages: {
          synchronous:
            "Import this router from '{{module}}', whose wrapper sets useTransitions={false} so the URL and rendered page change together.",
          namespace:
            'This namespace renders a router component outside the declared routing provider wrapper. Import that router component from @molecule/app-routing-react-router to use its documented transition setting. Hook-only namespace imports remain supported.',
          dynamic:
            "Import router components directly from '@molecule/app-routing-react-router' instead of a dynamic React Router import (dynamic module uses are not tracked), because its wrappers set useTransitions={false} so the URL and rendered page change together.",
        },
      },
      create(context) {
        const source = context.sourceCode
        const packages = new Set(['react-router', 'react-router-dom', 'react-router/dom'])
        const routers = new Set([
          'BrowserRouter',
          'HashRouter',
          'MemoryRouter',
          'Router',
          'RouterProvider',
          'HydratedRouter',
          'unstable_HistoryRouter',
        ])
        const bond = '@molecule/app-routing-react-router'
        const domEntries = new Set(['react-router/dom', 'react-router-dom'])
        const target = (module, name) =>
          name === 'HydratedRouter' || (name === 'RouterProvider' && domEntries.has(module))
            ? `${bond}/dom`
            : bond
        // Moved specifiers grouped by the bond entry each one moves to, in source order.
        const byTarget = (specifiers, module, nameOf) => {
          const groups = new Map()
          for (const specifier of specifiers) {
            const destination = target(module, nameOf(specifier))
            groups.set(destination, [...(groups.get(destination) ?? []), specifier])
          }
          return [...groups]
        }
        const importedName = (specifier) => specifier.imported.name ?? specifier.imported.value
        const exportedLocal = (specifier) => specifier.local.name ?? specifier.local.value
        const declaration = (specifiers, module, semicolon) => {
          const parts = specifiers
            .filter((specifier) => specifier.type !== 'ImportSpecifier')
            .map((specifier) => source.getText(specifier))
          const named = specifiers.filter((specifier) => specifier.type === 'ImportSpecifier')
          if (named.length > 0)
            parts.push(`{ ${named.map((specifier) => source.getText(specifier)).join(', ')} }`)
          return `import ${parts.join(', ')} from '${module}'${semicolon}`
        }
        const exportDeclaration = (specifiers, module, semicolon) =>
          `export { ${specifiers.map((specifier) => source.getText(specifier)).join(', ')} } from '${module}'${semicolon}`
        const moduleName = (node) => {
          if (node.type === 'Literal') return node.value
          if (node.type === 'TemplateLiteral' && node.expressions.length === 0)
            return node.quasis[0].value.cooked ?? node.quasis[0].value.raw
          return null
        }
        return {
          ImportDeclaration(node) {
            if (!packages.has(moduleName(node.source)) || node.importKind === 'type') return
            const namespace = node.specifiers.find(
              (entry) => entry.type === 'ImportNamespaceSpecifier',
            )
            if (namespace) {
              const variable = context.sourceCode
                .getDeclaredVariables(node)
                .find((entry) => entry.name === namespace.local.name)
              const used = variable?.references.some(({ identifier }) => {
                const member = identifier.parent
                return (
                  (member?.type === 'MemberExpression' &&
                    member.object === identifier &&
                    !member.computed &&
                    routers.has(member.property.name)) ||
                  (member?.type === 'JSXMemberExpression' &&
                    member.object === identifier &&
                    routers.has(member.property.name))
                )
              })
              if (used) context.report({ node, messageId: 'namespace' })
              return
            }
            const module = moduleName(node.source)
            const moved = node.specifiers.filter(
              (specifier) =>
                specifier.type === 'ImportSpecifier' &&
                specifier.importKind !== 'type' &&
                routers.has(importedName(specifier)),
            )
            if (moved.length === 0) return
            context.report({
              node: moved[0],
              messageId: 'synchronous',
              data: { module: target(module, importedName(moved[0])) },
              fix(fixer) {
                const semicolon = source.getText(node).trimEnd().endsWith(';') ? ';' : ''
                const bondImports = byTarget(moved, module, importedName).map(
                  ([destination, specifiers]) => declaration(specifiers, destination, semicolon),
                )
                const remaining = node.specifiers.filter((specifier) => !moved.includes(specifier))
                if (remaining.length > 0)
                  bondImports.unshift(declaration(remaining, module, semicolon))
                return fixer.replaceText(node, bondImports.join('\n'))
              },
            })
          },
          ExportNamedDeclaration(node) {
            if (
              !node.source ||
              !packages.has(moduleName(node.source)) ||
              node.exportKind === 'type'
            )
              return
            const module = moduleName(node.source)
            const moved = node.specifiers.filter(
              (specifier) =>
                specifier.type === 'ExportSpecifier' &&
                specifier.exportKind !== 'type' &&
                routers.has(exportedLocal(specifier)),
            )
            if (moved.length === 0) return
            context.report({
              node: moved[0],
              messageId: 'synchronous',
              data: { module: target(module, exportedLocal(moved[0])) },
              fix(fixer) {
                const semicolon = source.getText(node).trimEnd().endsWith(';') ? ';' : ''
                const bondExports = byTarget(moved, module, exportedLocal).map(
                  ([destination, specifiers]) =>
                    exportDeclaration(specifiers, destination, semicolon),
                )
                const remaining = node.specifiers.filter((specifier) => !moved.includes(specifier))
                if (remaining.length > 0)
                  bondExports.push(exportDeclaration(remaining, module, semicolon))
                return fixer.replaceText(node, bondExports.join('\n'))
              },
            })
          },
        }
      },
    },
    'url-lists-use-list-route': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            "Warn when a component's local state controls a list component or list-fetching hook, including array callbacks, derived values and request options. Reactive URL reads, inline JSX iterations and opaque cross-file prop chains are outside this rule.",
        },
        schema: [],
        messages: {
          useListRoute:
            'This local state snapshots a URL value once. If this is URL-owned list state, derive it on every render with useSearchParams/useListRoute so navigation stays synchronized; keep intentional editable drafts local.',
        },
      },
      create(context) {
        const source = context.sourceCode
        const states = []
        const collections = []
        const variableFor = (node, name) => {
          let scope = source.getScope(node)
          while (scope) {
            const variable = scope.set.get(name)
            if (variable) return variable
            scope = scope.upper
          }
          return null
        }
        const isFunction = (node) =>
          node?.type === 'FunctionDeclaration' ||
          node?.type === 'FunctionExpression' ||
          node?.type === 'ArrowFunctionExpression'
        const functionName = (node) => {
          if (node.id?.type === 'Identifier') return node.id.name
          if (node.parent?.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier')
            return node.parent.id.name
          return ''
        }
        const componentFor = (node) => {
          for (let current = node.parent; current; current = current.parent) {
            if (isFunction(current) && /^[A-Z]/.test(functionName(current))) return current
          }
          return null
        }
        const within = (node, ancestor) => {
          for (let current = node; current; current = current.parent) {
            if (current === ancestor) return true
          }
          return false
        }
        const isScalarState = (call, hook) => {
          const initial = call.arguments[hook === 'useReducer' ? 1 : 0]
          return (
            !initial ||
            (!['ArrayExpression', 'ObjectExpression'].includes(initial.type) &&
              !(initial.type === 'Literal' && initial.value === null))
          )
        }
        const method = (node) =>
          node?.type === 'MemberExpression' && !node.computed ? node.property.name : null
        const transforms = new Set(['filter', 'sort', 'toSorted', 'slice', 'map', 'flatMap'])
        const controls = new Set(['filter', 'sort', 'toSorted', 'slice'])
        const listAttribute = (attribute) =>
          attribute?.type === 'JSXAttribute' &&
          attribute.parent.name.type === 'JSXIdentifier' &&
          /(?:List|Results|Table|Grid|Catalog)$/.test(attribute.parent.name.name)
        const reads = (variable, owner) =>
          variable.references
            .filter((reference) => reference.isRead() && within(reference.identifier, owner))
            .map((reference) => reference.identifier)

        // Follow the result, not the mere presence of .filter/useQuery. Counts,
        // form validation and chart calculations do not prove a rendered list.
        const rendered = (value, owner, seen = new Set()) => {
          if (seen.has(value)) return false
          seen.add(value)
          const parent = value.parent
          if (!parent || value === owner) return false
          if (parent.type === 'VariableDeclarator' && parent.init === value) {
            const variable =
              parent.id.type === 'Identifier' && variableFor(parent.id, parent.id.name)
            return variable && reads(variable, owner).some((read) => rendered(read, owner, seen))
          }
          if (parent.type === 'JSXExpressionContainer') {
            const attribute = parent.parent
            return (
              listAttribute(attribute) && /^(?:items|rows|data|children)$/.test(attribute.name.name)
            )
          }
          if (parent.type === 'MemberExpression' && parent.object === value) {
            const call = parent.parent
            if (call?.type !== 'CallExpression' || call.callee !== parent)
              return (
                ['data', 'items', 'rows', 'results'].includes(method(parent)) &&
                rendered(parent, owner, seen)
              )
            if (transforms.has(method(parent))) return rendered(call, owner, seen)
            if (method(parent) === 'then') {
              const callback = call.arguments[0]
              if (!callback) return false
              if (
                collections.some(
                  (collection) =>
                    collection.owner === owner &&
                    collection.setter.references.some((ref) => within(ref.identifier, callback)) &&
                    reads(collection.variable, owner).some((read) => rendered(read, owner, seen)),
                )
              )
                return true
              return rendered(call, owner, seen)
            }
            return false
          }
          if (
            parent.type === 'CallExpression' &&
            parent.arguments.includes(value) &&
            parent.callee.type === 'Identifier'
          ) {
            const setter = variableFor(parent.callee, parent.callee.name)
            return collections.some(
              (collection) =>
                collection.owner === owner &&
                collection.setter === setter &&
                reads(collection.variable, owner).some((read) => rendered(read, owner, seen)),
            )
          }
          if (parent.type === 'ReturnStatement' || (isFunction(parent) && parent.body === value)) {
            let callback = parent
            while (callback && !isFunction(callback)) callback = callback.parent
            const call = callback?.parent
            return (
              call?.type === 'CallExpression' &&
              call.callee.type === 'Identifier' &&
              call.callee.name === 'useMemo' &&
              call.arguments[0] === callback &&
              rendered(call, owner, seen)
            )
          }
          if (
            [
              'ChainExpression',
              'AwaitExpression',
              'TSAsExpression',
              'TSNonNullExpression',
              'ConditionalExpression',
              'LogicalExpression',
              'SpreadElement',
              'ArrayExpression',
            ].includes(parent.type)
          )
            return rendered(parent, owner, seen)
          return false
        }
        const hasListConsumer = (reference, owner, seen = new Set()) => {
          if (seen.has(reference)) return false
          seen.add(reference)
          let optionKey = null
          for (let node = reference; node && node !== owner; node = node.parent) {
            const parent = node.parent
            if (!parent) return false
            if (isFunction(parent)) {
              const call = parent.parent
              if (
                call?.type !== 'CallExpression' ||
                !controls.has(method(call.callee)) ||
                !call.arguments.includes(parent)
              )
                return false
            }
            if (parent.type === 'VariableDeclarator' && parent.init === node) {
              const variable =
                parent.id.type === 'Identifier' && variableFor(parent.id, parent.id.name)
              if (
                variable &&
                reads(variable, owner).some((read) => hasListConsumer(read, owner, seen))
              )
                return true
              return false
            }
            if (parent.type === 'Property' && parent.value === node && optionKey === null) {
              optionKey = parent.key.type === 'Identifier' ? parent.key.name : parent.key.value
            }
            if (
              parent.type === 'CallExpression' &&
              node === parent.arguments[0] &&
              parent.callee.type === 'Identifier' &&
              rendered(parent, owner) &&
              typeof optionKey === 'string'
            )
              return true
            if (
              parent.type === 'CallExpression' &&
              parent.arguments.includes(node) &&
              (controls.has(method(parent.callee)) ||
                ((method(parent.callee) === 'get' || parent.callee.name === 'fetch') &&
                  typeof optionKey === 'string')) &&
              rendered(parent, owner)
            )
              return true
            if (parent.type === 'JSXExpressionContainer') {
              const attribute = parent.parent
              const opening = attribute?.type === 'JSXAttribute' ? attribute.parent : null
              if (
                opening?.type === 'JSXOpeningElement' &&
                opening.name.type === 'JSXIdentifier' &&
                /(?:List|Results|Table|Grid|Catalog)$/.test(opening.name.name) &&
                attribute.name.type === 'JSXIdentifier'
              )
                return true
            }
          }
          return false
        }
        // Resolve the actual React export through immutable aliases. A local object or
        // callback sharing a hook's name is not evidence that React runs the assignment.
        const importedExport = (expression, seen = new Set()) => {
          if (
            [
              'TSAsExpression',
              'TSTypeAssertion',
              'TSNonNullExpression',
              'TSSatisfiesExpression',
              'ChainExpression',
            ].includes(expression?.type)
          )
            return importedExport(expression.expression, seen)
          if (expression?.type === 'MemberExpression') {
            const origin = importedExport(expression.object, seen)
            if (origin?.name !== '*') return null
            const name = expression.computed ? expression.property.value : expression.property.name
            return typeof name === 'string'
              ? { module: origin.module, name: name === 'default' ? '*' : name }
              : null
          }
          if (expression?.type !== 'Identifier') return null
          const variable = variableFor(expression, expression.name)
          if (!variable || seen.has(variable)) return null
          seen.add(variable)
          const definition = variable.defs[0]
          if (definition?.type === 'ImportBinding') {
            const declaration = definition.parent || definition.node.parent
            if (declaration?.importKind === 'type' || definition.node.importKind === 'type')
              return null
            const name =
              definition.node.type === 'ImportSpecifier'
                ? definition.node.imported.name || definition.node.imported.value
                : '*'
            return { module: declaration?.source?.value, name: name === 'default' ? '*' : name }
          }
          if (definition?.parent?.kind !== 'const') return null
          const origin = importedExport(definition.node.init, seen)
          if (definition.node.id.type !== 'ObjectPattern') return origin
          if (origin?.name !== '*') return null
          const property = definition.node.id.properties.find((property) => {
            if (property.type !== 'Property') return false
            const value =
              property.value.type === 'AssignmentPattern' ? property.value.left : property.value
            return value.type === 'Identifier' && value.name === expression.name
          })
          if (!property) return null
          const name = property.computed
            ? property.key.value
            : property.key.name || property.key.value
          return typeof name === 'string'
            ? { module: origin.module, name: name === 'default' ? '*' : name }
            : null
        }
        const synchronized = (state) => {
          if (!state.setter) return false
          let found = false
          const urlVariables = (expression, result = new Set()) => {
            if (!expression || typeof expression.type !== 'string') return result
            if (expression.type === 'Identifier' && state.readsUrl(expression)) {
              const variable = variableFor(expression, expression.name)
              if (variable) result.add(variable)
            }
            for (const [key, value] of Object.entries(expression)) {
              if (key === 'parent') continue
              if (Array.isArray(value)) value.forEach((child) => urlVariables(child, result))
              else if (value && typeof value.type === 'string') urlVariables(value, result)
            }
            return result
          }
          const visit = (node) => {
            if (found || !node || typeof node.type !== 'string') return
            if (isFunction(node) && node !== state.owner) return
            if (
              node.type === 'CallExpression' &&
              importedExport(node.callee)?.module === 'react' &&
              ['useEffect', 'useLayoutEffect'].includes(importedExport(node.callee)?.name)
            ) {
              const callback = node.arguments[0],
                dependencies = node.arguments[1]
              const expression =
                callback?.body?.type === 'BlockStatement'
                  ? callback.body.body.length === 1 &&
                    ['ExpressionStatement', 'ReturnStatement'].includes(callback.body.body[0].type)
                    ? callback.body.body[0].expression || callback.body.body[0].argument
                    : null
                  : callback?.body
              if (
                expression?.type === 'CallExpression' &&
                expression.callee.type === 'Identifier' &&
                variableFor(expression.callee, expression.callee.name) === state.setter &&
                dependencies?.type === 'ArrayExpression'
              ) {
                const assigned = urlVariables(expression.arguments[0])
                const reactive = urlVariables(dependencies)
                if (assigned.size && [...assigned].every((variable) => reactive.has(variable)))
                  found = true
              }
            }
            for (const [key, value] of Object.entries(node)) {
              if (key === 'parent') continue
              if (Array.isArray(value)) value.forEach(visit)
              else if (value && typeof value.type === 'string') visit(value)
            }
          }
          visit(state.owner)
          return found
        }
        return {
          VariableDeclarator(node) {
            if (node.id.type !== 'ArrayPattern' || node.init?.type !== 'CallExpression') return
            const hook = importedExport(node.init.callee)
            if (hook?.module !== 'react' || !['useState', 'useReducer'].includes(hook.name)) return
            const first = node.id.elements[0]
            const owner = componentFor(node)
            if (first?.type !== 'Identifier' || !owner) return
            const variable = variableFor(first, first.name)
            if (!variable) return
            if (node.init.arguments[0]?.type === 'ArrayExpression') {
              const second = node.id.elements[1]
              const setter = second?.type === 'Identifier' && variableFor(second, second.name)
              if (setter) collections.push({ variable, setter, owner })
            }
            // Local filters are valid. Only warn about a snapshot of a URL-owned value.
            const initializer = node.init.arguments[hook.name === 'useReducer' ? 1 : 0]
            const readsUrl = (expression, seen = new Set()) => {
              if (!expression || seen.has(expression)) return false
              seen.add(expression)
              if (expression.type === 'Identifier') {
                const definition = variableFor(expression, expression.name)?.defs[0]?.node
                if (
                  definition?.init?.type === 'CallExpression' &&
                  [
                    'react-router',
                    'react-router-dom',
                    '@molecule/app-routing-react-router',
                  ].includes(importedExport(definition.init.callee)?.module) &&
                  ['useSearchParams', 'useListRoute'].includes(
                    importedExport(definition.init.callee)?.name,
                  )
                )
                  return true
                if (definition?.init && definition.init !== expression)
                  return readsUrl(definition.init, seen)
              }
              return Object.entries(expression).some(
                ([key, child]) =>
                  key !== 'parent' &&
                  (Array.isArray(child)
                    ? child.some(
                        (entry) => entry && typeof entry.type === 'string' && readsUrl(entry, seen),
                      )
                    : child && typeof child.type === 'string' && readsUrl(child, seen)),
              )
            }
            const snapshotsUrl =
              readsUrl(initializer) ||
              (hook.name === 'useReducer' && readsUrl(node.init.arguments[2]))
            if (snapshotsUrl && isScalarState(node.init, hook.name))
              states.push({
                node: first,
                variable,
                owner,
                readsUrl,
                setter:
                  hook.name === 'useState' && node.id.elements[1]?.type === 'Identifier'
                    ? variableFor(node.id.elements[1], node.id.elements[1].name)
                    : null,
              })
          },
          'Program:exit'() {
            const reported = new Set()
            for (const state of states) {
              if (reported.has(state.variable) || synchronized(state)) continue
              const consumed = state.variable.references.some(
                (reference) =>
                  within(reference.identifier, state.owner) &&
                  hasListConsumer(reference.identifier, state.owner),
              )
              if (consumed) {
                reported.add(state.variable)
                context.report({ node: state.node, messageId: 'useListRoute' })
              }
            }
          },
        }
      },
    },
    // A favorite/follow/like/bookmark button or a setting switch that shows the toggled value at
    // once and saves each click with its own request: a second click races the first, so a slower
    // response (or a refetch of older data) flips the button back. `useOptimisticValue` sends the
    // saves in order and keeps the newest choice. Structural only: a `useState` setter writes the
    // toggled value (`!current` or a variable holding it) before a request that receives it, is
    // chosen by it, or chooses its HTTP method between DELETE and a write.
    'server-toggles-use-optimistic-value': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Warn when a React module saves a toggled value with its own request instead of useOptimisticValue.',
        },
        schema: [
          {
            type: 'object',
            properties: {
              persistenceFunctions: { type: 'array', items: { type: 'string' } },
              mode: { enum: ['all', 'advisory', 'dropped-intent'] },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          useOptimisticValue:
            'This shows a toggled value at once and saves it with its own request, so a pending guard can drop the next click, or a slower response/refetch can replace it. Use `useOptimisticValue` from `@molecule/app-react`. {{rewrite}}',
          awaitRefetch:
            '{{location}}: This toggle waits for its save and a query refetch before changing the control. Use `useOptimisticValue` from `@molecule/app-react`: seed value from the loaded record, move this save into commit and return the confirmed value, render the hook value, and call update(current => !current) on click. Enable the control only after its initial record loads and keep it mounted during refetches. Preserve authentication checks; pending saves must not discard clicks.',
          awaitSave:
            '{{location}}: This toggle waits for its save before changing the control. Use `useOptimisticValue` from `@molecule/app-react`: seed value from the loaded record, save in commit and return the confirmed value, render the hook value, and call update(current => !current) on click. Enable the control only after its initial record loads. Preserve authentication checks and keep the control mounted during saves.',
          droppedIntent:
            'This control shows its next value before awaiting work, but its busy guard discards another click while that work is pending. Keep the control disabled for that busy state, or queue the latest intent with useOptimisticValue from @molecule/app-react. An imported callback does not make the busy guard safe.',
          unreadyRecord:
            '{{fix}} The handler drops actions until {{record}} loads. Keep it mounted during refetches.',
          unreadyForm:
            'Add disabled={!{{record}}} to this form’s submit button, or mount it only when {{record}} exists. It drops early submits. Keep it mounted during refetches.',
        },
      },
      create(context) {
        const mode = context.options[0]?.mode ?? 'all'
        const helpers = new Set(['useOptimisticValue', 'createOptimisticValue'])
        let reactModule = false
        const candidates = []
        const controls = []
        const submitHandlers = new Set()
        const helperCommits = new Set()
        const isFunction = (node) =>
          node?.type === 'FunctionDeclaration' ||
          node?.type === 'FunctionExpression' ||
          node?.type === 'ArrowFunctionExpression'
        const enclosingFunction = (node) => {
          let current = node.parent
          while (current && !isFunction(current)) current = current.parent
          return current ?? null
        }
        const unwrap = (node) => {
          let current = node
          while (
            current &&
            (current.type === 'AwaitExpression' ||
              current.type === 'TSAsExpression' ||
              current.type === 'TSSatisfiesExpression' ||
              current.type === 'TSTypeAssertion' ||
              current.type === 'TSNonNullExpression' ||
              current.type === 'ChainExpression')
          )
            current = current.type === 'AwaitExpression' ? current.argument : current.expression
          return current
        }
        const variableFor = (node) => {
          if (node?.type !== 'Identifier') return null
          let scope = context.sourceCode.getScope(node)
          while (scope) {
            if (scope.set.has(node.name)) return scope.set.get(node.name)
            scope = scope.upper
          }
          return null
        }
        const functionFor = (node) => {
          const expression = unwrap(node)
          if (isFunction(expression)) return expression
          const definition = variableFor(expression)?.defs[0]
          const value =
            definition?.type === 'FunctionName' ? definition.node : definition?.node.init
          if (value?.type === 'CallExpression' && isFunction(value.arguments[0])) {
            const callee = unwrap(value.callee)
            const namespace = callee?.type === 'MemberExpression'
            const binding = variableFor(namespace ? callee.object : callee)?.defs[0]
            const hook = namespace
              ? callee.computed
                ? callee.property.value
                : callee.property.name
              : binding?.node.imported?.name
            if (
              binding?.type === 'ImportBinding' &&
              binding.parent.source.value === 'react' &&
              hook === 'useCallback' &&
              (!namespace ||
                ['ImportNamespaceSpecifier', 'ImportDefaultSpecifier'].includes(binding.node.type))
            )
              return value.arguments[0]
          }
          return isFunction(value) ? value : null
        }
        // A conditional onClick still exposes each selected local handler. Keep the
        // selection conditions so actions unreachable with a missing record are excluded.
        // Whether a handler-less control should be disabled is a separate contract.
        const clickHandlers = (node, conditions = [], seen = new Set()) => {
          node = unwrap(node)
          if (!node || seen.has(node)) return []
          const next = new Set(seen).add(node)
          if (node.type === 'ConditionalExpression')
            return [
              ...clickHandlers(node.consequent, [...conditions, [node.test, true]], next),
              ...clickHandlers(node.alternate, [...conditions, [node.test, false]], next),
            ]
          if (node.type === 'LogicalExpression' && ['&&', '||'].includes(node.operator))
            return [
              ...(node.operator === '&&' ? [] : clickHandlers(node.left, conditions, next)),
              ...clickHandlers(
                node.right,
                [...conditions, [node.left, node.operator === '&&']],
                next,
              ),
            ]
          const handler = functionFor(node)
          if (handler) return [{ handler, conditions }]
          const definition = variableFor(node)?.defs[0]
          return definition?.type === 'Variable' &&
            definition.parent.kind === 'const' &&
            definition.node.id.type === 'Identifier'
            ? clickHandlers(definition.node.init, conditions, next)
            : []
        }
        const callName = (node) => {
          const callee = unwrap(node?.callee)
          return callee?.type === 'Identifier'
            ? callee.name
            : callee?.type === 'MemberExpression'
              ? callee.computed
                ? callee.property.value
                : callee.property.name
              : null
        }
        // Promise use alone does not imply persistence (animations, dialogs and analytics
        // also return promises). Recognize HTTP/mutation methods, application save actions,
        // and imported API clients. This remains a structural warning, not a whole-program
        // proof that an arbitrarily named custom function reaches a server.
        const persistenceCall = (node, seen = new Set()) => {
          if (node?.type !== 'CallExpression' || seen.has(node)) return false
          seen.add(node)
          const callee = unwrap(node.callee)
          if (setters.has(variableFor(callee))) return false
          if (
            (context.options[0]?.persistenceFunctions ?? []).includes(
              context.sourceCode.getText(node.callee),
            )
          )
            return true
          const verbs = new Set(['post', 'put', 'patch', 'delete', 'del'])
          const modules = new Set([
            '@molecule/app-http',
            '@molecule/app-http-fetch',
            '@molecule/app-http-axios',
            'axios',
            'ky',
            'superagent',
          ])
          const origin = (id) => {
            const def = variableFor(id)?.defs[0]
            return def?.type === 'ImportBinding' ? def.parent.source.value : null
          }
          const client = (expression, visited = new Set()) => {
            expression = unwrap(expression)
            if (!expression || visited.has(expression)) return false
            visited.add(expression)
            if (expression.type === 'Identifier') {
              if (modules.has(origin(expression))) return true
              const def = variableFor(expression)?.defs[0]
              return def?.type === 'Variable' && client(def.node.init, visited)
            }
            if (expression.type === 'CallExpression') {
              const factory = unwrap(expression.callee)
              if (factory.type === 'Identifier') {
                const def = variableFor(factory)?.defs[0]
                return (
                  def?.type === 'ImportBinding' &&
                  ['getClient', 'useHttpClient'].includes(def.node.imported?.name) &&
                  (modules.has(def.parent.source.value) ||
                    [
                      '@molecule/app-react',
                      '@molecule/app-vue',
                      '@molecule/app-react-native',
                    ].includes(def.parent.source.value))
                )
              }
              return (
                factory.type === 'MemberExpression' &&
                factory.property.name === 'getClient' &&
                client(factory.object, visited)
              )
            }
            return false
          }
          const writeMethod = (value) =>
            (value?.type === 'Literal' &&
              typeof value.value === 'string' &&
              ['POST', 'PUT', 'PATCH', 'DELETE'].includes(value.value.toUpperCase())) ||
            (value?.type === 'ConditionalExpression' &&
              writeMethod(value.consequent) &&
              writeMethod(value.alternate))
          if (
            callee.type === 'Identifier' &&
            callee.name === 'fetch' &&
            !variableFor(callee)?.defs.length
          ) {
            const options = unwrap(node.arguments[1])
            return (
              options?.type === 'ObjectExpression' &&
              options.properties.some(
                (property) =>
                  property.type === 'Property' &&
                  (property.key.name ?? property.key.value) === 'method' &&
                  writeMethod(unwrap(property.value)),
              )
            )
          }
          if (
            callee.type === 'MemberExpression' &&
            verbs.has(String(callName(node)).toLowerCase()) &&
            client(callee.object)
          )
            return true
          if (
            callee.type === 'Identifier' &&
            verbs.has(callee.name.toLowerCase()) &&
            modules.has(origin(callee))
          )
            return true
          const fn = functionFor(callee)
          if (!fn) return false
          let persists = false
          walk(fn.body, (child) => {
            if (child.type === 'CallExpression' && persistenceCall(child, seen)) persists = true
          })
          return persists
        }
        // `!value` or `!record.field`: the opposite of a value read now. A call's negation
        // (`!confirm()`) is a question, not a toggled value.
        const negatedRead = (node) =>
          unwrap(node)?.type === 'UnaryExpression' &&
          unwrap(node).operator === '!' &&
          ['Identifier', 'MemberExpression'].includes(unwrap(unwrap(node).argument)?.type)
        // `const next = !favorited` inside the function: names that hold a toggled value.
        const toggledNames = (fn) => {
          const names = new Set()
          const visit = (node) => {
            if (!node || typeof node.type !== 'string') return
            if (node !== fn && isFunction(node)) return
            if (
              node.type === 'VariableDeclarator' &&
              node.id.type === 'Identifier' &&
              negatedRead(node.init)
            )
              names.add(variableFor(node.id))
            for (const key of Object.keys(node)) {
              if (key === 'parent') continue
              const value = node[key]
              if (Array.isArray(value)) value.forEach(visit)
              else if (value && typeof value.type === 'string') visit(value)
            }
          }
          visit(fn.body)
          return names
        }
        const toggled = (node, names, seen = new Set()) => {
          const expression = unwrap(node)
          if (!expression || seen.has(expression) || seen.size > 24) return false
          const next = new Set(seen).add(expression)
          if (negatedRead(expression)) return true
          if (expression.type === 'ObjectExpression')
            return expression.properties.some(
              (property) => property.type === 'Property' && toggled(property.value, names, next),
            )
          if (expression.type !== 'Identifier') return false
          const variable = variableFor(expression)
          if (names.has(variable)) return true
          const definition = variable?.defs[0]
          // A previous immutable alias can hold an object containing the flipped field.
          // Mutable values and destructuring stay unknown.
          return (
            definition?.node.type === 'VariableDeclarator' &&
            definition.node.id.type === 'Identifier' &&
            definition.parent?.kind === 'const' &&
            definition.node.range[1] <= expression.range[0] &&
            toggled(definition.node.init, names, next)
          )
        }
        // `{ notifications: !settings.notifications }`: a field set to the opposite of itself.
        const selfToggle = (property) => {
          if (property.type !== 'Property' || !negatedRead(property.value)) return false
          const read = unwrap(unwrap(property.value).argument)
          const key = property.key.type === 'Identifier' ? property.key.name : property.key.value
          const field = read.type === 'MemberExpression' ? read.property.name : read.name
          return key === field
        }
        // Awaited, or chained with then/catch/finally, directly or through the variable it is stored in.
        const promiseUsed = (node, fn, seen = new Set()) => {
          if (seen.has(node)) return false
          seen.add(node)
          let current = node
          while (
            current.parent &&
            [
              'TSAsExpression',
              'TSSatisfiesExpression',
              'TSTypeAssertion',
              'TSNonNullExpression',
              'ChainExpression',
            ].includes(current.parent.type)
          )
            current = current.parent
          const parent = current.parent
          if (parent?.type === 'AwaitExpression') return true
          if (
            parent?.type === 'MemberExpression' &&
            parent.object === current &&
            ['then', 'catch', 'finally'].includes(parent.property.name) &&
            parent.parent?.type === 'CallExpression'
          )
            return true
          if (parent?.type === 'ReturnStatement' || (parent === fn && fn.expression)) return true
          if (parent?.type === 'ConditionalExpression' && parent.test !== current)
            return promiseUsed(parent, fn, seen)
          if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
            const variable = context.sourceCode
              .getDeclaredVariables(parent)
              .find((entry) => entry.name === parent.id.name)
            return (variable?.references ?? []).some(
              (reference) =>
                reference.identifier !== parent.id && promiseUsed(reference.identifier, fn, seen),
            )
          }
          return false
        }
        const methodLiteral = (node) =>
          node?.type === 'Literal' && typeof node.value === 'string'
            ? node.value.toUpperCase()
            : null
        // The `useState` setters of this module: `const [value, setValue] = useState(…)`.
        const setters = new Set()
        const states = new Map()
        const effects = []
        const walk = (node, visit, nested = false) => {
          if (!node || typeof node.type !== 'string') return
          if (!nested && isFunction(node)) return
          visit(node)
          for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
            const value = node[key]
            if (Array.isArray(value)) value.forEach((child) => walk(child, visit, nested))
            else walk(value, visit, nested)
          }
        }
        const writesBefore = (fn, save) => {
          const writes = []
          walk(fn.body, (node) => {
            const state = node.type === 'CallExpression' && states.get(variableFor(node.callee))
            const argument = node.arguments?.[0]
            if (!state || !argument || node.range[0] >= save.range[0]) return
            let awaited = false
            walk(
              argument,
              (part) => {
                if (part.type === 'AwaitExpression') awaited = true
              },
              true,
            )
            // Busy flags and feedback resets are not the value being saved.
            if (awaited || ['Literal', 'ArrayExpression'].includes(unwrap(argument)?.type)) return
            writes.push({ state, argument, node })
          })
          return writes
        }
        // A positive busy flag in an OR guard unconditionally discards this intent.
        // Do not infer persistence from an async callback's name or import path.
        const positiveFlag = (node, variable) => {
          const value = unwrap(node)
          if (value?.type === 'Identifier') return variableFor(value) === variable
          return (
            value?.type === 'LogicalExpression' &&
            value.operator === '||' &&
            (positiveFlag(value.left, variable) || positiveFlag(value.right, variable))
          )
        }
        const busyGuards = (fn, save) => {
          const guards = new Set()
          walk(fn.body, (node) => {
            if (node.type !== 'IfStatement' || node.range[0] >= save.range[0]) return
            const body = node.consequent
            const returns =
              body.type === 'ReturnStatement' ||
              (body.type === 'BlockStatement' && body.body[0]?.type === 'ReturnStatement')
            if (!returns) return
            for (const busy of states.values()) {
              if (!positiveFlag(node.test, busy.variable)) continue
              if (
                busy.setter.references.some((reference) => {
                  const call = reference.identifier.parent
                  return (
                    call?.type === 'CallExpression' &&
                    enclosingFunction(call) === fn &&
                    call.range[0] < save.range[0] &&
                    call.arguments[0]?.value === true
                  )
                })
              )
                guards.add(busy.variable)
            }
          })
          return guards
        }
        const guardedControlIsDisabled = (fn, guards) => {
          const matches = controls.filter(({ handler }) => {
            if (handler === fn) return true
            let calls = false
            walk(handler?.body, (node) => {
              if (node.type === 'CallExpression' && functionFor(node.callee) === fn) calls = true
            })
            return calls
          })
          return (
            matches.length > 0 &&
            matches.every(({ opening }) =>
              opening.attributes.some((attribute) => {
                if (attribute.type !== 'JSXAttribute' || attribute.name.name !== 'disabled')
                  return false
                if (!attribute.value) return true
                const expression = attribute.value.expression
                return (
                  expression?.value === true ||
                  [...guards].some((flag) => positiveFlag(expression, flag))
                )
              }),
            )
          )
        }
        const droppedOrRefetched = (fn, save) => {
          const writes = writesBefore(fn, save)
          const guarded = busyGuards(fn, save).size > 0
          const refetched = writes.some(({ state }) =>
            effects.some((effect) => {
              let replaces = false
              // Direct prop hydration can repeat while the control is active. An async
              // initial load alone does not prove that: readiness, dependencies and
              // cancellation belong to the separate action-ready analysis.
              walk(effect.body, (node) => {
                if (
                  node.type === 'CallExpression' &&
                  variableFor(node.callee) === state.setter &&
                  !isFunction(unwrap(node.arguments[0]))
                )
                  replaces = true
              })
              return replaces
            }),
          )
          // A busy guard beside an unrelated POST (panel analytics, for example) does not
          // establish that the local flag is server-backed. Require a server seed too.
          return (
            (guarded &&
              writes.some(
                ({ state }) =>
                  state.seed &&
                  !['Literal', 'ArrayExpression', 'ObjectExpression'].includes(state.seed.type),
              )) ||
            refetched
          )
        }
        const serialized = (fn) => {
          const call = fn.parent
          if (
            call?.type !== 'CallExpression' ||
            callName(call) !== 'then' ||
            call.callee.type !== 'MemberExpression'
          )
            return false
          let result = call
          while (
            result.parent?.type === 'MemberExpression' &&
            ['catch', 'finally'].includes(result.parent.property.name) &&
            result.parent.parent?.type === 'CallExpression'
          )
            result = result.parent.parent
          const assignment = result.parent
          return (
            assignment?.type === 'AssignmentExpression' &&
            assignment.operator === '=' &&
            assignment.right === result &&
            context.sourceCode.getText(assignment.left) ===
              context.sourceCode.getText(call.callee.object)
          )
        }
        // A revision setter after the save invalidates a query whose hook reads that revision.
        // Do not infer a refetch from a setter name, an arbitrary callback or a form reset.
        const queryRead = (node, query, seen = new Set()) => {
          const value = unwrap(node)
          if (!value || seen.has(value) || seen.size > 16) return false
          const next = new Set(seen).add(value)
          if (value.type === 'MemberExpression') {
            const field = value.computed ? value.property.value : value.property.name
            const definition = variableFor(unwrap(value.object))?.defs[0]
            if (field === 'data' && unwrap(definition?.node.init) === query) return true
            return queryRead(value.object, query, next)
          }
          const definition = variableFor(value)?.defs[0]
          return (
            definition?.parent?.kind === 'const' && queryRead(definition.node.init, query, next)
          )
        }
        const saveReadsQuery = (fn, save, query) => {
          let reads = false
          const inspect = (node) =>
            walk(node, (part) => {
              reads ||= queryRead(part, query)
            })
          inspect(save)
          for (let at = save.parent; at && at !== fn; at = at.parent)
            if (['IfStatement', 'ConditionalExpression'].includes(at.type)) inspect(at.test)
          return reads
        }
        const refreshAfter = (fn, save) => {
          let refresh = false
          walk(fn.body, (node) => {
            if (node.type !== 'CallExpression' || node.range[0] <= save.range[1]) return
            const state = states.get(variableFor(node.callee))
            if (!state) return
            refresh ||= state.variable.references.some((reference) => {
              let at = reference.identifier.parent
              while (at && !isFunction(at)) {
                if (
                  at.type === 'CallExpression' &&
                  /^use[A-Z]/.test(callName(at) ?? '') &&
                  !['useState', 'useRef', 'useMemo', 'useCallback', 'useEffect'].includes(
                    callName(at),
                  ) &&
                  saveReadsQuery(fn, save, at)
                )
                  return true
                at = at.parent
              }
              return false
            })
          })
          return refresh
        }
        const oppositeRequests = (branch) => {
          if (branch.type !== 'IfStatement' || !branch.alternate) return false
          const methods = (body) => {
            const result = new Set()
            walk(body, (part) => {
              if (persistenceCall(part)) result.add(callName(part)?.toUpperCase())
            })
            return result
          }
          const yes = methods(branch.consequent)
          const no = methods(branch.alternate)
          return ['POST', 'PUT', 'PATCH'].some(
            (write) => (yes.has('DELETE') && no.has(write)) || (no.has('DELETE') && yes.has(write)),
          )
        }
        // The rewrite uses the component's own state, updater, request and response reads.
        // It is advice, never an automatic edit: auth guards and app-specific callbacks stay.
        const rewriteFor = (fn, save) => {
          let unverifiedResource = null
          const fromSave = (expression, seen = new Set()) => {
            const node = unwrap(expression)
            if (!node) return false
            if (node.range[0] <= save.range[0] && node.range[1] >= save.range[1]) return true
            const variable = variableFor(node)
            if (!variable || seen.has(variable) || seen.size >= 8) return false
            seen.add(variable)
            const definition = variable.defs[0]
            if (definition?.type === 'Variable' && definition.parent?.kind === 'const')
              return fromSave(definition.node.init, seen)
            const callback = definition?.type === 'Parameter' ? variable.scope.block : null
            const then = callback?.parent
            return !!(
              then?.type === 'CallExpression' &&
              then.arguments[0] === callback &&
              callback.params[0] === definition.name &&
              callName(then) === 'then' &&
              fromSave(then.callee.object, seen)
            )
          }
          walk(
            fn.body,
            (node) => {
              if (node.type !== 'CallExpression' || node.parent?.type !== 'VariableDeclarator')
                return
              if (!fromSave(node.arguments[0])) return
              const definition = variableFor(node.callee)?.defs[0]
              if (
                definition?.type === 'ImportBinding' &&
                definition.parent?.source?.value === '@molecule/app-http' &&
                (definition.node.imported?.name ?? definition.node.imported?.value) ===
                  'unwrapSingle'
              )
                unverifiedResource = context.sourceCode.getText(node)
            },
            true,
          )
          if (unverifiedResource)
            return `First verify the saved resource read by ${unverifiedResource}. unwrapSingle unwraps data, not named resource keys: a response body { record: value } remains { record: value }. If the API uses a named envelope, select its actual field before notifying the parent or returning confirmed values. For a bare resource body, keep that resource directly. This single-file scan cannot prove that field, so it cannot supply a runnable migration for this save. Then move the verified save into useOptimisticValue, keep the control mounted, and key it by record identity.`
          if (writesBefore(fn, save).some(({ state }) => state.seed?.type === 'ObjectExpression'))
            return 'Keep the control disabled while this request is pending, or queue each intent with useOptimisticValue. Its commit must choose one request from the desired field value and return the saved result. Preserve auth checks and the server response shape; verify both directions with a delayed first response.'
          const writes = writesBefore(fn, save)
          const selected = [...new Map(writes.map((write) => [write.state.setter, write])).values()]
          if (!selected.length)
            return 'Move the optimistic state and this save into the hook; keep auth/loading guards, but remove pending guards.'
          // A row parameter cannot be lifted into a component hook. A UI event used only
          // for propagation/default handling stays in the click handler, though: it is
          // neither a save dependency nor a record identity (and needs no extracted row).
          const parameterReads = context.sourceCode.getDeclaredVariables(fn).filter(
            (variable) =>
              variable.defs.some((definition) => definition.type === 'Parameter') &&
              variable.references.some((reference) => {
                if (!reference.isRead()) return false
                const member = reference.identifier.parent
                const call = member?.parent
                const statement = call?.parent
                return !(
                  member?.type === 'MemberExpression' &&
                  member.object === reference.identifier &&
                  !member.computed &&
                  ['preventDefault', 'stopPropagation'].includes(member.property.name) &&
                  call?.type === 'CallExpression' &&
                  call.callee === member &&
                  statement?.type === 'ExpressionStatement' &&
                  statement.range[1] < save.range[0]
                )
              }),
          )
          if (parameterReads.length)
            return `In this component, move ${selected.map(({ state }) => state.name).join(', ')} out of the per-click setters (${selected.map(({ state }) => state.setter.name).join(', ')}). The handler reads ${parameterReads.map((variable) => variable.name).join(', ')}, which is not available at the hook call site: keep event handling in the click handler, pass the desired data to update, or extract a control keyed by record identity. Put its server-backed fields in useOptimisticValue and move this request into commit: ${context.sourceCode.getText(save)}. Render the hook's value and use a functional update so each click starts from the latest intent. Keep auth/initial-loading guards, remove pending guards, and return the saved flag and count from commit.`
          const allNames = new Set(
            context.sourceCode.getScope(fn).variables.map((variable) => variable.name),
          )
          for (const scope of context.sourceCode.scopeManager.scopes)
            for (const variable of scope.variables) allNames.add(variable.name)
          const fresh = (base) => {
            let name = base
            while (allNames.has(name)) name += 'Value'
            allNames.add(name)
            return name
          }
          const controller = fresh('optimisticValue')
          const desired = fresh('desiredValue')
          const current = fresh('currentValue')
          const confirmed = fresh('confirmedValue')
          const held = toggledNames(fn)
          const aliases = new Map()
          for (const { state, argument } of selected) {
            if (unwrap(argument)?.type === 'Identifier' && held.has(variableFor(unwrap(argument))))
              aliases.set(variableFor(unwrap(argument)), state.name)
            if (unwrap(argument)?.type === 'ObjectExpression')
              for (const property of unwrap(argument).properties) {
                if (
                  property.type === 'Property' &&
                  unwrap(property.value)?.type === 'Identifier' &&
                  held.has(variableFor(unwrap(property.value)))
                )
                  aliases.set(
                    variableFor(unwrap(property.value)),
                    `${state.name}.${property.key.name ?? property.key.value}`,
                  )
              }
          }
          const stateReads = new Map(selected.map(({ state }) => [state.variable, state.name]))
          const scalarFlips = new Set(
            selected
              .filter(({ argument }) => {
                const value = unwrap(argument)
                if (negatedRead(value) || aliases.has(variableFor(value))) return true
                if (!isFunction(value)) return false
                const result =
                  value.body.type === 'BlockStatement'
                    ? value.body.body.find((statement) => statement.type === 'ReturnStatement')
                        ?.argument
                    : value.body
                return (
                  negatedRead(result) &&
                  variableFor(unwrap(unwrap(result).argument)) === variableFor(value.params[0])
                )
              })
              .map(({ state }) => state.variable),
          )
          const render = (node, mode, parameter, field) => {
            const replacements = []
            const visit = (part) => {
              if (!part || typeof part.type !== 'string') return
              if (mode === 'commit' && part.type === 'CallExpression') {
                const state = selected.find(
                  ({ state }) => state.setter === variableFor(part.callee),
                )?.state
                if (state && part.arguments[0]) {
                  const argument = unwrap(part.arguments[0])
                  const value = isFunction(argument)
                    ? `(${render(argument, mode)})(${confirmed}.${state.name})`
                    : render(argument, mode)
                  replacements.push([
                    part.range[0],
                    part.range[1],
                    `${confirmed} = { ...${confirmed}, ${state.name}: ${value} }`,
                  ])
                  return
                }
                if (
                  part.callee.type === 'MemberExpression' &&
                  ['catch', 'finally'].includes(callName(part))
                ) {
                  replacements.push([
                    part.range[0],
                    part.range[1],
                    render(part.callee.object, mode),
                  ])
                  return
                }
              }
              if (mode === 'commit' && negatedRead(part)) {
                const read = unwrap(unwrap(part).argument)
                const variable =
                  read.type === 'Identifier' ? variableFor(read) : variableFor(read.object)
                if (stateReads.has(variable)) {
                  const suffix = read.type === 'MemberExpression' ? `.${read.property.name}` : ''
                  replacements.push([
                    part.range[0],
                    part.range[1],
                    `${desired}.${stateReads.get(variable)}${suffix}`,
                  ])
                  return
                }
              }
              if (part.type === 'Identifier') {
                const variable = variableFor(part)
                // Only reads: object keys, declarations and member names are not variable reads.
                if (
                  variable?.references.some(
                    (reference) => reference.identifier === part && reference.isRead(),
                  )
                ) {
                  let value
                  if (parameter && variable === parameter) value = `${current}.${field}`
                  else if (mode === 'commit' && aliases.has(variable))
                    value = `${desired}.${aliases.get(variable)}`
                  else if (stateReads.has(variable)) {
                    value = `${mode === 'commit' ? desired : current}.${stateReads.get(variable)}`
                    if (mode === 'commit' && scalarFlips.has(variable)) value = `!${value}`
                  }
                  if (value)
                    replacements.push([
                      part.range[0],
                      part.range[1],
                      part.parent?.type === 'Property' && part.parent.shorthand
                        ? `${part.name}: ${value}`
                        : value,
                    ])
                }
              }
              for (const key of context.sourceCode.visitorKeys[part.type] ?? []) {
                const value = part[key]
                if (Array.isArray(value)) value.forEach(visit)
                else visit(value)
              }
            }
            visit(node)
            let text = context.sourceCode.getText(node)
            for (const [start, end, value] of replacements.sort((a, b) => b[0] - a[0]))
              text = text.slice(0, start - node.range[0]) + value + text.slice(end - node.range[0])
            return text
          }
          let statement = save
          while (statement.parent && statement.parent.type !== 'BlockStatement')
            statement = statement.parent
          const block = statement.parent
          const success =
            block?.type === 'BlockStatement' ? block.body.slice(block.body.indexOf(statement)) : []
          const commitLines = success.map((line) => {
            if (line.type === 'ReturnStatement' && line.argument)
              return `await ${render(line.argument, 'commit')};`
            const expression = line.type === 'ExpressionStatement' && unwrap(line.expression)
            const chain = ['then', 'catch', 'finally'].includes(callName(expression))
            return `${chain && line.expression.type !== 'AwaitExpression' ? 'await ' : ''}${render(line, 'commit')}`
          })
          // Carry declarations the request uses (endpoint/path/etc.), but not toggled aliases.
          const declarations = []
          walk(fn.body, (node) => {
            if (
              node.type === 'VariableDeclaration' &&
              node.range[1] < statement.range[0] &&
              node.declarations.every(
                (declaration) =>
                  declaration.id.type === 'Identifier' && !held.has(variableFor(declaration.id)),
              )
            )
              declarations.push(render(node, 'commit'))
          })
          const updates = selected.map(({ state, argument }) => {
            const update = unwrap(argument)
            return `${state.name}: ${isFunction(update) ? `(${render(update, 'update')})(${current}.${state.name})` : render(argument, 'update')}`
          })
          const updateLocals = new Set()
          const collectLocals = (node) =>
            walk(
              node,
              (part) => {
                const variable = variableFor(part)
                const declaration = variable?.defs[0]?.node
                if (
                  declaration?.type !== 'VariableDeclarator' ||
                  !declaration.init ||
                  enclosingFunction(declaration) !== fn ||
                  updateLocals.has(declaration)
                )
                  return
                updateLocals.add(declaration)
                collectLocals(declaration.init)
              },
              true,
            )
          for (const { argument } of selected) collectLocals(argument)
          const aliasesForUpdate = [...updateLocals]
            .sort((a, b) => a.range[0] - b.range[0])
            .map((node) => {
              const field = aliases.get(variableFor(node.id))
              return `const ${node.id.name} = ${field ? `!${current}.${field}` : render(node.init, 'update')};`
            })
          // A null local override can display a loaded server flag via `override ?? record.flag`.
          // Seed the controller from that same view, otherwise it remains null forever.
          const fallbackSeeds = new Map()
          for (const { state } of selected) {
            if (state.seed?.type !== 'Literal' || state.seed.value !== null) continue
            const fallbacks = state.variable.references.flatMap((reference) => {
              const node = reference.identifier.parent
              return node?.type === 'LogicalExpression' &&
                node.operator === '??' &&
                variableFor(unwrap(node.left)) === state.variable &&
                enclosingFunction(node) === enclosingFunction(fn)
                ? [context.sourceCode.getText(node)]
                : []
            })
            if (new Set(fallbacks).size === 1) fallbackSeeds.set(state.variable, fallbacks[0])
          }
          const seeds = selected.map(
            ({ state }) =>
              `${state.name}: ${fallbackSeeds.get(state.variable) ?? (state.seed && state.seed.type !== 'Literal' ? (isFunction(state.seed) ? `(${context.sourceCode.getText(state.seed)})()` : context.sourceCode.getText(state.seed)) : state.name)}`,
          )
          const kept = selected.filter(({ state }) => !state.seed || state.seed.type === 'Literal')
          const nullable = kept.filter(({ state }) => state.seed?.value === null)
          const guard = nullable.map(
            ({ state }) => `if (${desired}.${state.name} == null) return ${desired};`,
          )
          return `Rewrite the state in this component (keep auth/initial-loading checks):\n\`\`\`tsx\nconst ${controller} = useOptimisticValue({\n  value: { ${seeds.join(', ')} },\n  commit: async (${desired}) => {\n    ${guard.join('\n    ')}\n    let ${confirmed} = ${desired};\n    ${[...declarations, ...commitLines].join('\n    ')}\n    return ${confirmed};\n  },\n});\n${selected.map(({ state }) => `const ${kept.some((entry) => entry.state === state) ? `optimistic${state.name[0].toUpperCase()}${state.name.slice(1)}` : state.name} = ${controller}.value.${state.name};`).join('\n')}\n// In the click handler, replace its local setters/save/rollback with:\n${controller}.update((${current}) => {\n  ${nullable.map(({ state }) => `if (${current}.${state.name} == null) return ${current};`).join('\n  ')}\n  ${aliasesForUpdate.join('\n  ')}\n  return { ${updates.join(', ')} };\n});\n\`\`\`\nRemove the pending guard/disabled-on-pending flag and effects that copy props into the replaced display setters (${selected.map(({ state }) => state.setter.name).join(', ')}). ${kept.length ? 'Keep the original query state/setter for loading server data. Use the optimistic alias above for rendering AND loading guards; do not clear an already-loaded record before a same-record refetch, and keep its control mounted. ' : ''}Let commit reject on failure. Key the mounted control by record identity, and render/enable it only after its initial record loads.`
        }
        // Shown at once: a setter called with the toggled value before the save starts
        // (`setFavorited(next)`, `setItems((prev) => … !item.checked …)`). An awaited response
        // applied by the setter is the save itself, so the walk stops at `await`. A toggle that
        // waits for the server before it changes what is shown cannot flip back.
        const shownBefore = (fn, held, save) => {
          let found = false
          const mentionsToggle = (node) => {
            if (found || !node || typeof node.type !== 'string') return
            if (node.type === 'AwaitExpression') return
            if (toggled(node, held)) {
              found = true
              return
            }
            for (const key of Object.keys(node)) {
              if (key === 'parent') continue
              const value = node[key]
              if (Array.isArray(value)) value.forEach(mentionsToggle)
              else if (value && typeof value.type === 'string') mentionsToggle(value)
            }
          }
          const visit = (node) => {
            if (found || !node || typeof node.type !== 'string') return
            if (isFunction(node)) return
            if (
              node.type === 'CallExpression' &&
              node.callee.type === 'Identifier' &&
              setters.has(variableFor(node.callee)) &&
              node.range[0] < save.range[0]
            )
              node.arguments.forEach(mentionsToggle)
            for (const key of Object.keys(node)) {
              if (key === 'parent') continue
              const value = node[key]
              if (Array.isArray(value)) value.forEach(visit)
              else if (value && typeof value.type === 'string') visit(value)
            }
          }
          visit(fn.body)
          return found
        }
        return {
          VariableDeclarator(node) {
            const callee = node.init?.type === 'CallExpression' ? node.init.callee : null
            const hook =
              callee?.type === 'Identifier'
                ? callee.name
                : callee?.type === 'MemberExpression'
                  ? callee.property.name
                  : null
            if (hook !== 'useState' || node.id.type !== 'ArrayPattern') return
            const setter = node.id.elements[1]
            if (setter?.type === 'Identifier') {
              const variable = variableFor(setter)
              setters.add(variable)
              const value = node.id.elements[0]
              if (value?.type === 'Identifier')
                states.set(variable, {
                  setter: variable,
                  variable: variableFor(value),
                  name: value.name,
                  seed: node.init.arguments[0],
                })
            }
          },
          ImportDeclaration(node) {
            if (node.source.value === 'react') reactModule = true
            for (const specifier of node.specifiers) {
              const name = specifier.imported?.name ?? specifier.local?.name
              if (helpers.has(name)) helpers.add(specifier.local.name)
            }
          },
          JSXAttribute(node) {
            if (node.name.name === 'onClick')
              controls.push(
                ...clickHandlers(node.value?.expression).map((entry) => ({
                  opening: node.parent,
                  ...entry,
                })),
              )
            else if (
              mode === 'dropped-intent' &&
              node.parent.name?.type === 'JSXIdentifier' &&
              /^[A-Z]/.test(node.parent.name.name)
            )
              controls.push(
                ...clickHandlers(node.value?.expression).map((entry) => ({
                  opening: node.parent,
                  forwardedProp: node.name.name,
                  forwardedAttribute: node,
                  ...entry,
                })),
              )
            if (node.name.name !== 'onSubmit') return
            // A form submits from its button and from Enter in a field, so the form is the control.
            if (node.parent.name?.type === 'JSXIdentifier' && node.parent.name.name === 'form')
              controls.push(
                ...clickHandlers(node.value?.expression).map((entry) => ({
                  opening: node.parent,
                  form: true,
                  ...entry,
                })),
              )
            const fn = functionFor(node.value?.expression)
            const collect = (handler) => {
              if (!handler || submitHandlers.has(handler)) return
              submitHandlers.add(handler)
              const visit = (node) => {
                if (!node || typeof node.type !== 'string' || isFunction(node)) return
                if (node.type === 'CallExpression') collect(functionFor(node.callee))
                for (const key of Object.keys(node)) {
                  if (key === 'parent') continue
                  const value = node[key]
                  if (Array.isArray(value)) value.forEach(visit)
                  else if (value && typeof value.type === 'string') visit(value)
                }
              }
              visit(handler.body)
            }
            collect(fn)
          },
          JSXElement() {
            reactModule = true
          },
          JSXFragment() {
            reactModule = true
          },
          CallExpression(node) {
            candidates.push({ kind: 'call', node })
            if (callName(node) === 'useEffect') {
              const effect = functionFor(node.arguments[0])
              if (effect) effects.push(effect)
            }
            if (helpers.has(callName(node))) {
              const options = unwrap(node.arguments[0])
              if (options?.type === 'ObjectExpression') {
                for (const property of options.properties) {
                  if (property.type !== 'Property') continue
                  const key = property.key.name ?? property.key.value
                  if (key !== 'commit') continue
                  const fn = functionFor(property.value)
                  if (fn) helperCommits.add(fn)
                }
              }
            }
          },
          ConditionalExpression(node) {
            candidates.push({ kind: 'choice', node })
          },
          Property(node) {
            const key = node.key.type === 'Identifier' ? node.key.name : node.key.value
            if (key !== 'method' || node.value.type !== 'ConditionalExpression') return
            const methods = [node.value.consequent, node.value.alternate].map(methodLiteral)
            if (
              methods.includes('DELETE') &&
              methods.some((method) => ['POST', 'PUT', 'PATCH'].includes(method))
            )
              candidates.push({ kind: 'method', node })
          },
          'Program:exit'() {
            if (!reactModule) return
            if (mode === 'dropped-intent') {
              const flow = reactStateFlow(context)
              // An enabled control must not silently drop an action for a value that this
              // component's JSX treats as possibly missing, unless disabled or mounted on it.
              // A TypeScript project exceeded the write-time server's 256 MiB heap budget.
              // Use the design's single-file fallback: JSX presence tests or x?.
              // No query-package list, imported module parsing, or load provenance is needed.
              const records = []
              // Predicate expressions always produce booleans, including false. A JSX test
              // of one does not establish that a data value can be null or undefined.
              const predicate = (node, seen = new Set()) => {
                node = unwrap(node)
                if (!node || seen.has(node)) return false
                const next = new Set(seen).add(node)
                if (node.type === 'Literal') return typeof node.value === 'boolean'
                if (node.type === 'UnaryExpression' && node.operator === '!') return true
                if (node.type === 'BinaryExpression')
                  return [
                    '==',
                    '===',
                    '!=',
                    '!==',
                    '<',
                    '<=',
                    '>',
                    '>=',
                    'in',
                    'instanceof',
                  ].includes(node.operator)
                if (node.type === 'LogicalExpression')
                  return predicate(node.left, next) && predicate(node.right, next)
                if (node.type === 'ConditionalExpression')
                  return predicate(node.consequent, next) && predicate(node.alternate, next)
                if (node.type === 'CallExpression') {
                  if (node.callee.name === 'Boolean' && !variableFor(node.callee)?.defs.length)
                    return true
                  if (flow.react(node.callee, 'useMemo')) {
                    const fn = functionFor(node.arguments[0])
                    if (fn?.expression) return predicate(fn.body, next)
                    // All explicit exits must be predicates, with no implicit undefined exit.
                    if (fn?.body.body?.at(-1)?.type !== 'ReturnStatement') return false
                    const returns = []
                    flow.walk(
                      fn.body,
                      (part) => {
                        if (part.type === 'ReturnStatement') returns.push(part.argument)
                      },
                      (part) => !isFunction(part),
                    )
                    return returns.length > 0 && returns.every((part) => predicate(part, next))
                  }
                  return false
                }
                const definition = variableFor(node)?.defs[0]
                return (
                  definition?.type === 'Variable' &&
                  definition.parent.kind === 'const' &&
                  predicate(definition.node.init, next)
                )
              }
              const routeParams = (node, seen = new Set()) => {
                node = unwrap(node)
                if (!node || seen.has(node)) return false
                const next = new Set(seen).add(node)
                if (node.type === 'MemberExpression') return routeParams(node.object, next)
                const definition = variableFor(node)?.defs[0]
                if (definition?.type !== 'Variable' || definition.parent.kind !== 'const')
                  return false
                const init = unwrap(definition.node.init)
                if (init?.type === 'CallExpression') {
                  const callee = unwrap(init.callee)
                  const imported = variableFor(
                    callee?.type === 'MemberExpression' ? callee.object : callee,
                  )?.defs[0]
                  return (
                    imported?.type === 'ImportBinding' &&
                    (callee?.type === 'Identifier'
                      ? imported.node.imported?.name === 'useParams'
                      : imported.node.type === 'ImportNamespaceSpecifier' &&
                        !callee.computed &&
                        callee.property.name === 'useParams')
                  )
                }
                return routeParams(init, next)
              }
              // Interpret one presence-test language for discovery, guards and disabled.
              // Null and undefined comparisons both express absence; this syntax-only rule
              // cannot infer a hook's sentinel. Other predicates and hook flags stay unknown.
              // `read` supplies the presence of an identifier, or null when it is unknown.
              const presenceTest = (node, read, seen = new Set()) => {
                node = unwrap(node)
                if (!node || seen.has(node)) return null
                const next = new Set(seen).add(node)
                if (node.type === 'Identifier') {
                  const result = read(node)
                  if (result !== null) return result
                  const definition = variableFor(node)?.defs[0]
                  return definition?.type === 'Variable' &&
                    definition.parent.kind === 'const' &&
                    definition.node.id.type === 'Identifier'
                    ? presenceTest(definition.node.init, read, next)
                    : null
                }
                if (node.type === 'Literal')
                  return typeof node.value === 'boolean' ? node.value : null
                if (node.type === 'UnaryExpression' && node.operator === '!') {
                  const result = presenceTest(node.argument, read, next)
                  return result === null ? null : !result
                }
                if (
                  node.type === 'CallExpression' &&
                  node.callee.type === 'Identifier' &&
                  node.callee.name === 'Boolean' &&
                  !variableFor(node.callee)?.defs.length
                )
                  return presenceTest(node.arguments[0], read, next)
                if (
                  node.type === 'BinaryExpression' &&
                  ['==', '!=', '===', '!=='].includes(node.operator)
                )
                  for (const [subject, sentinel] of [
                    [unwrap(node.left), unwrap(node.right)],
                    [unwrap(node.right), unwrap(node.left)],
                  ])
                    if (
                      subject?.type === 'Identifier' &&
                      !predicate(subject) &&
                      ((sentinel?.type === 'Literal' && sentinel.value === null) ||
                        (sentinel?.type === 'Identifier' &&
                          sentinel.name === 'undefined' &&
                          !variableFor(sentinel)?.defs.length))
                    ) {
                      const result = presenceTest(subject, read, next)
                      return result === null ? null : node.operator.includes('!') ? result : !result
                    }
                if (node.type === 'LogicalExpression' && ['&&', '||'].includes(node.operator)) {
                  const left = presenceTest(node.left, read, next),
                    right = presenceTest(node.right, read, next)
                  if (node.operator === '&&')
                    return left === false || right === false ? false : left === true ? right : null
                  return left === true || right === true ? true : left === false ? right : null
                }
                if (node.type === 'ConditionalExpression') {
                  const condition = presenceTest(node.test, read, next),
                    yes = presenceTest(node.consequent, read, next),
                    no = presenceTest(node.alternate, read, next)
                  return condition === null ? (yes === no ? yes : null) : condition ? yes : no
                }
                return null
              }
              const tested = (node, owner) => {
                node = unwrap(node)
                const variable = variableFor(node)
                if (!variable || predicate(node) || routeParams(node)) return
                // JSX callbacks close over the component's binding. They are not a new
                // component boundary for that record's guards or mount conditions.
                const bindingOwner = variable.scope.variableScope?.block
                if (isFunction(bindingOwner)) owner = bindingOwner
                if (
                  records.some((record) => record.variable === variable && record.owner === owner)
                )
                  return
                records.push({ variable, owner, name: variable.name })
              }
              const calls = new Map(),
                escaped = new Set()
              flow.walk(context.sourceCode.ast, (node) => {
                // Only a helper whose references are all direct local calls has known mount
                // sites. Passing it as a callback or component leaves its caller unknown.
                if (node.type === 'Identifier' && node.parent.type !== 'TSTypeQuery') {
                  const fn = functionFor(node)
                  if (
                    fn &&
                    variableFor(node)?.references.some(
                      (ref) =>
                        ref.identifier === node && ref.isRead() && ref.isValueReference !== false,
                    )
                  ) {
                    if (node.parent.type === 'CallExpression' && node.parent.callee === node) {
                      const sites = calls.get(fn) ?? []
                      sites.push(node.parent)
                      calls.set(fn, sites)
                    } else escaped.add(fn)
                  }
                }
                if (node.type !== 'JSXExpressionContainer') return
                const owner = flow.owner(node)
                if (!owner) return
                flow.walk(
                  node.expression,
                  (part) => {
                    const discover = (subject) => {
                      tested(subject, owner)
                      return null
                    }
                    if (part.type === 'ConditionalExpression') presenceTest(part.test, discover)
                    if (part.type === 'LogicalExpression' && ['&&', '||'].includes(part.operator))
                      presenceTest(part.left, discover)
                    if (part.type === 'MemberExpression' && part.optional)
                      tested(part.object, owner)
                    if (part.type === 'CallExpression' && part.optional) tested(part.callee, owner)
                  },
                  (part) => !isFunction(part),
                )
              })
              const refers = (node, record) => {
                node = unwrap(node)
                return node?.type === 'Identifier' && variableFor(node) === record.variable
              }
              const absentTest = (node, record) =>
                presenceTest(node, (subject) => (refers(subject, record) ? false : null))
              const present = (node, expected, record) => {
                let readsRecord = false
                const result = presenceTest(node, (subject) => {
                  if (!refers(subject, record)) return null
                  readsRecord = true
                  return false
                })
                return readsRecord && result === !expected
              }
              // Evaluate only availability expressions with this record at its missing
              // value. Other values stay unknown: no loading-flag, route or cross-control inference.
              const UNKNOWN = Symbol('unknown'),
                TRUTHY = Symbol('truthy'),
                FALSY = Symbol('falsy'),
                SHORT = Symbol('optional-short-circuit')
              const value = (result) => (result === SHORT ? undefined : result)
              const truth = (result) => {
                result = value(result)
                return result === UNKNOWN
                  ? null
                  : result === TRUTHY
                    ? true
                    : result === FALSY
                      ? false
                      : Boolean(result)
              }
              const primitive = (result) =>
                result !== UNKNOWN &&
                result !== TRUTHY &&
                result !== FALSY &&
                (result === null || !['object', 'function', 'symbol'].includes(typeof result))
              const evaluate = (node, record, seen = new Set()) => {
                if (!node || seen.has(node)) return UNKNOWN
                const next = new Set(seen).add(node)
                if (
                  [
                    'TSAsExpression',
                    'TSSatisfiesExpression',
                    'TSTypeAssertion',
                    'TSNonNullExpression',
                  ].includes(node.type)
                )
                  return evaluate(node.expression, record, next)
                if (node.type === 'ChainExpression')
                  return value(evaluate(node.expression, record, next))
                if (refers(node, record)) return null
                if (node.type === 'Literal') return node.value
                if (node.type === 'ArrayExpression') return node.elements.length === 0 ? [] : TRUTHY
                if (node.type === 'ObjectExpression') return TRUTHY
                if (
                  node.type === 'Identifier' &&
                  node.name === 'undefined' &&
                  !variableFor(node)?.defs.length
                )
                  return undefined
                if (node.type === 'UnaryExpression' && node.operator === '!') {
                  const result = truth(evaluate(node.argument, record, next))
                  return result === null ? UNKNOWN : !result
                }
                if (node.type === 'LogicalExpression') {
                  const left = value(evaluate(node.left, record, next)),
                    known = truth(left)
                  if (node.operator === '??') {
                    if (left === null || left === undefined)
                      return value(evaluate(node.right, record, next))
                    return left === UNKNOWN || left === FALSY ? UNKNOWN : left
                  }
                  if (known !== null)
                    return (node.operator === '&&') === known
                      ? value(evaluate(node.right, record, next))
                      : left
                  const right = value(evaluate(node.right, record, next)),
                    rightTruth = truth(right)
                  return node.operator === '||' && rightTruth === true
                    ? TRUTHY
                    : node.operator === '&&' && rightTruth === false
                      ? FALSY
                      : UNKNOWN
                }
                if (node.type === 'ConditionalExpression') {
                  const condition = truth(evaluate(node.test, record, next))
                  if (condition !== null)
                    return value(
                      evaluate(condition ? node.consequent : node.alternate, record, next),
                    )
                  const yes = value(evaluate(node.consequent, record, next)),
                    no = value(evaluate(node.alternate, record, next))
                  if (primitive(yes) && primitive(no) && Object.is(yes, no)) return yes
                  const same = truth(yes) === truth(no) ? truth(yes) : null
                  return same === null ? UNKNOWN : same ? TRUTHY : FALSY
                }
                if (node.type === 'MemberExpression') {
                  const object = evaluate(node.object, record, next)
                  if (object === SHORT) return SHORT
                  if (object === null || object === undefined)
                    return node.optional ? SHORT : UNKNOWN
                  const key = node.computed
                    ? value(evaluate(node.property, record, next))
                    : node.property.name
                  return Array.isArray(object) && key === 'length' ? object.length : UNKNOWN
                }
                if (node.type === 'CallExpression') {
                  if (
                    node.callee.type === 'Identifier' &&
                    node.callee.name === 'Boolean' &&
                    !variableFor(node.callee)?.defs.length
                  ) {
                    const result = truth(
                      node.arguments.length ? evaluate(node.arguments[0], record, next) : undefined,
                    )
                    return result === null ? UNKNOWN : result
                  }
                  if (flow.react(node.callee, 'useMemo')) {
                    const fn = functionFor(node.arguments[0])
                    const body =
                      fn?.body.type === 'BlockStatement' &&
                      fn.body.body.length === 1 &&
                      fn.body.body[0].type === 'ReturnStatement'
                        ? fn.body.body[0].argument
                        : fn?.expression
                          ? fn.body
                          : null
                    return body ? value(evaluate(body, record, next)) : UNKNOWN
                  }
                  const callee = evaluate(node.callee, record, next)
                  if (callee === SHORT) return SHORT
                  return node.optional && (callee === null || callee === undefined)
                    ? SHORT
                    : UNKNOWN
                }
                if (node.type === 'BinaryExpression') {
                  const presence = absentTest(node, record)
                  if (presence !== null) return presence
                  const left = value(evaluate(node.left, record, next)),
                    right = value(evaluate(node.right, record, next))
                  if (!primitive(left) || !primitive(right)) return UNKNOWN
                  switch (node.operator) {
                    case '==':
                      return left == right
                    case '!=':
                      return left != right
                    case '===':
                      return left === right
                    case '!==':
                      return left !== right
                    case '<':
                      return left < right
                    case '<=':
                      return left <= right
                    case '>':
                      return left > right
                    case '>=':
                      return left >= right
                    default:
                      return UNKNOWN
                  }
                }
                const definition = variableFor(node)?.defs[0]
                return definition?.type === 'Variable' &&
                  definition.parent.kind === 'const' &&
                  definition.node.id.type === 'Identifier'
                  ? evaluate(definition.node.init, record, next)
                  : UNKNOWN
              }
              const prefixEnds = new WeakMap()
              const prefixEnd = (fn) => {
                if (prefixEnds.has(fn)) return prefixEnds.get(fn)
                let end = Infinity
                walk(fn.body, (node) => {
                  if (
                    ![
                      'CallExpression',
                      'NewExpression',
                      'AssignmentExpression',
                      'UpdateExpression',
                      'AwaitExpression',
                    ].includes(node.type)
                  )
                    return
                  // Event bookkeeping alone does not perform the form's action or give feedback.
                  if (
                    node.type === 'CallExpression' &&
                    node.callee.type === 'MemberExpression' &&
                    ['preventDefault', 'stopPropagation'].includes(flow.member(node.callee)) &&
                    fn.params.some(
                      (param) =>
                        variableFor(param) &&
                        variableFor(param) === variableFor(node.callee.object),
                    )
                  )
                    return
                  end = Math.min(end, node.range[1])
                })
                prefixEnds.set(fn, end)
                return end
              }
              const silentReturn = (node) =>
                (node?.type === 'ReturnStatement' && !node.argument) ||
                (node?.type === 'BlockStatement' &&
                  node.body.length === 1 &&
                  silentReturn(node.body[0]))
              // The positive spelling has the same missing-record path as `if (!record)
              // return`. Restrict it to a sole guarded action: other calls can provide
              // feedback or do useful work without this record, and are not ours to guess.
              const skippedAction = (node, record) => {
                node = unwrap(node)
                if (node?.type === 'BlockStatement') {
                  const statements = node.body.filter((part) => part.type !== 'EmptyStatement')
                  return statements.length === 1 && skippedAction(statements[0], record)
                }
                if (node?.type === 'ExpressionStatement')
                  return skippedAction(node.expression, record)
                let test, expected, action
                if (
                  node?.type === 'IfStatement' &&
                  (!node.alternate || silentReturn(node.alternate))
                ) {
                  test = node.test
                  expected = true
                  action = node.consequent
                } else if (
                  node?.type === 'LogicalExpression' &&
                  ['&&', '||'].includes(node.operator)
                ) {
                  test = node.left
                  expected = node.operator === '&&'
                  action = node.right
                } else return false
                if (!present(test, expected, record) || truth(evaluate(test, record)) !== !expected)
                  return false
                let feedback = false
                walk(test, (part) => {
                  if (
                    [
                      'CallExpression',
                      'NewExpression',
                      'AwaitExpression',
                      'AssignmentExpression',
                      'UpdateExpression',
                    ].includes(part.type) &&
                    !(
                      part.type === 'CallExpression' &&
                      part.callee.name === 'Boolean' &&
                      !variableFor(part.callee)?.defs.length
                    )
                  )
                    feedback = true
                })
                if (feedback) return false
                let work = false
                walk(action, (part) => {
                  if (
                    [
                      'CallExpression',
                      'NewExpression',
                      'AssignmentExpression',
                      'UpdateExpression',
                    ].includes(part.type)
                  )
                    work = true
                })
                return work
              }
              const soleCall = (node) => {
                node = unwrap(node)
                if (node?.type === 'BlockStatement') {
                  const statements = node.body.filter((part) => part.type !== 'EmptyStatement')
                  return statements.length === 1 ? soleCall(statements[0]) : null
                }
                if (node?.type === 'ExpressionStatement') return soleCall(node.expression)
                if (node?.type === 'UnaryExpression' && node.operator === 'void')
                  return soleCall(node.argument)
                return node?.type === 'CallExpression' ? node : null
              }
              const skipsAction = (fn, record, seen = new Set()) => {
                if (!fn || seen.has(fn)) return false
                seen.add(fn)
                return (
                  skippedAction(fn.body, record) ||
                  skipsAction(functionFor(soleCall(fn.body)?.callee), record, seen)
                )
              }
              const handlers = (fn, seen = new Set()) => {
                if (!fn || seen.has(fn)) return []
                seen.add(fn)
                const found = [fn]
                walk(fn.body, (node) => {
                  if (node.type === 'CallExpression' && node.range[1] <= prefixEnd(fn))
                    found.push(...handlers(functionFor(node.callee), seen))
                })
                return found
              }
              const takesDisabled = (element) =>
                element.name.type !== 'JSXIdentifier' ||
                /^[A-Z]/.test(element.name.name) ||
                [
                  'button',
                  'input',
                  'select',
                  'textarea',
                  'fieldset',
                  'optgroup',
                  'option',
                ].includes(element.name.name)
              // Whether this element is disabled whenever the record is missing.
              const disabledWithout = (element, record) => {
                const disabled = flow.attr(element, 'disabled')
                return Boolean(
                  takesDisabled(element) &&
                  disabled &&
                  (!disabled.value ||
                    truth(
                      evaluate(
                        disabled.value.type === 'JSXExpressionContainer'
                          ? disabled.value.expression
                          : disabled.value,
                        record,
                      ),
                    ) === true),
                )
              }
              // A form's submit buttons. HTML submits a form from Enter in a field only through
              // its default button, so a form whose every submit button is disabled cannot submit.
              const submitters = (form) => {
                const found = []
                const canSubmit = (node, button, seen = new Set()) => {
                  node = unwrap(node)
                  if (!node || seen.has(node)) return true
                  const next = new Set(seen).add(node)
                  if (node.type === 'Literal')
                    return button
                      ? !['button', 'reset'].includes(node.value)
                      : ['submit', 'image'].includes(node.value)
                  if (node.type === 'ConditionalExpression')
                    return (
                      canSubmit(node.consequent, button, next) ||
                      canSubmit(node.alternate, button, next)
                    )
                  const init = flow.init(node)
                  return init ? canSubmit(init, button, next) : true
                }
                flow.walk(form.parent, (node) => {
                  if (
                    node.type !== 'JSXOpeningElement' ||
                    node === form ||
                    node.name.type !== 'JSXIdentifier'
                  )
                    return
                  const type = flow.attr(node, 'type')
                  const button = node.name.name === 'button'
                  if (
                    (button || node.name.name === 'input') &&
                    (type ? canSubmit(flow.expression(type), button) : button)
                  )
                    found.push(node)
                })
                return found
              }
              const reportedControls = new Set()
              const mountedWithout = (node, record, seen = new Set()) => {
                const fn = flow.owner(node)
                if (
                  flow.conditions(node, fn).some(([test, expected]) => {
                    const actual = truth(evaluate(test, record))
                    return actual !== null && actual !== expected
                  })
                )
                  return true
                if (!fn || escaped.has(fn) || seen.has(fn)) return false
                // Inline render callbacks share the call's mount site, not a helper's
                // declaration site (a hoisted helper can run before a preceding return).
                if (fn.parent?.type === 'CallExpression' && fn.parent.arguments.includes(fn))
                  return mountedWithout(fn.parent, record, new Set(seen).add(fn))
                const parameter = fn.params.findIndex((param) => refers(param, record))
                // A function's own local data cannot inherit its caller's record gate.
                if (fn === record.owner && parameter < 0) return false
                const sites = calls.get(fn)
                return (
                  Boolean(sites?.length) &&
                  sites.every((site) => {
                    let outer = record
                    if (parameter >= 0) {
                      const argument = unwrap(site.arguments[parameter])
                      const variable = variableFor(argument)
                      if (!variable) return false
                      outer = {
                        variable,
                        owner: variable.scope.variableScope.block,
                        name: variable.name,
                      }
                    }
                    return mountedWithout(site, outer, new Set(seen).add(fn))
                  })
                )
              }
              let components
              const forwarding = new Map()
              // Resolve only a suspect callback, and only its direct local component.
              // Prop spelling alone does not make a callback an input action: the
              // component must forward that same lexical binding to an enabled native
              // onClick in its unconditional return. Opaque/guarded renderers stay local.
              const forwardsClick = (opening, prop) => {
                const component = flow.variable(opening.name)
                if (!component) return false
                let properties = forwarding.get(component)
                if (!properties) forwarding.set(component, (properties = new Map()))
                if (properties.has(prop)) return properties.get(prop)
                properties.set(prop, false)
                components ??= componentResolver(parser, context)
                const definition = component.defs[0]
                const found =
                  definition?.type === 'ImportBinding'
                    ? components.imported(
                        flow.source.ast,
                        opening.name.name,
                        resolve(context.cwd, context.filename),
                      )
                    : {
                        node:
                          definition?.type === 'FunctionName'
                            ? definition.node
                            : definition?.node.init,
                        tree: flow.source.ast,
                      }
                const fn = found?.node
                if (!isFunction(fn)) return false
                if (
                  fn.body.type === 'BlockStatement' &&
                  (fn.body.body.length !== 1 || fn.body.body[0].type !== 'ReturnStatement')
                )
                  return false
                const parameter = fn.params[0]
                const property =
                  parameter?.type === 'ObjectPattern'
                    ? parameter.properties.find(
                        (part) =>
                          part.type === 'Property' &&
                          (!part.computed || part.key.type === 'Literal') &&
                          (part.key.name ?? part.key.value) === prop,
                      )
                    : null
                const bindingName =
                  parameter?.type === 'Identifier' ? parameter.name : property?.value?.name
                if (!bindingName) return false
                const binding = components.scopes
                  .get(found.tree)
                  ?.find((scope) => scope.block === fn)
                  ?.set.get(bindingName)
                if (!binding) return false
                const references = new Set(binding.references.map((ref) => ref.identifier))
                const forwarded = (value) =>
                  parameter.type === 'Identifier'
                    ? value?.type === 'MemberExpression' &&
                      references.has(value.object) &&
                      flow.member(value) === prop
                    : references.has(value)
                const rendered = (node) => {
                  if (node?.type === 'JSXFragment') return node.children.some(rendered)
                  if (node?.type === 'JSXExpressionContainer') return rendered(node.expression)
                  if (node?.type !== 'JSXElement') return false
                  const element = node.openingElement
                  if (element.name.type !== 'JSXIdentifier' || !/^[a-z]/.test(element.name.name))
                    return false
                  if (
                    element.attributes.some(
                      (attr) =>
                        attr.type === 'JSXSpreadAttribute' ||
                        ['disabled', 'hidden', 'inert'].includes(attr.name?.name),
                    )
                  )
                    return false
                  const click = flow.expression(flow.attr(element, 'onClick'))
                  return forwarded(click) || node.children.some(rendered)
                }
                const result = components.roots(fn).some(rendered)
                properties.set(prop, result)
                return result
              }
              for (const {
                opening,
                handler,
                conditions,
                form,
                forwardedProp,
                forwardedAttribute,
              } of controls) {
                if (reportedControls.has(opening)) continue
                const relevant = handlers(handler)
                for (const record of records) {
                  if (!flow.contains(record.owner, opening)) continue
                  // A predicate alias alone is not a nullable data dependency of this handler.
                  if (
                    !record.variable.references.some((ref) =>
                      relevant.some((fn) => flow.contains(fn.body, ref.identifier)),
                    )
                  )
                    continue
                  if (
                    conditions.some(([test, expected]) => {
                      const actual = truth(evaluate(test, record))
                      return actual !== null && actual !== expected
                    })
                  )
                    continue
                  const ignoresMissing =
                    skipsAction(handler, record) ||
                    relevant.some(
                      (fn) =>
                        fn.body.type === 'BlockStatement' &&
                        fn.body.body.some(
                          (statement) =>
                            statement.type === 'IfStatement' &&
                            statement.range[0] < prefixEnd(fn) &&
                            !statement.alternate &&
                            silentReturn(statement.consequent) &&
                            truth(evaluate(statement.test, record)) === true &&
                            present(statement.test, false, record),
                        ),
                    )
                  if (!ignoresMissing) continue
                  if (forwardedProp) {
                    let effective
                    for (const attribute of opening.attributes.toReversed()) {
                      if (attribute.type === 'JSXSpreadAttribute') break
                      if (attribute.name?.name === forwardedProp) {
                        effective = attribute
                        break
                      }
                    }
                    if (effective !== forwardedAttribute || !forwardsClick(opening, forwardedProp))
                      continue
                  }
                  if (form) {
                    const buttons = submitters(opening)
                    if (
                      buttons.length > 0 &&
                      buttons.every((button) => disabledWithout(button, record))
                    )
                      continue
                  } else if (!forwardedProp && disabledWithout(opening, record)) continue
                  if (mountedWithout(opening, record)) continue
                  context.report({
                    node: opening,
                    messageId: form ? 'unreadyForm' : 'unreadyRecord',
                    data: {
                      record: record.name,
                      fix:
                        !forwardedProp && takesDisabled(opening)
                          ? `Add disabled={!${record.name}} to this control, or mount it only when ${record.name} exists.`
                          : `Mount this control only when ${record.name} exists.`,
                    },
                  })
                  reportedControls.add(opening)
                  break
                }
              }
            }
            const reported = new Set()
            const names = new Map()
            const namesFor = (fn) => {
              if (!names.has(fn)) names.set(fn, toggledNames(fn))
              return names.get(fn)
            }
            for (const { kind, node } of candidates) {
              const fn = enclosingFunction(node)
              if (
                !fn ||
                reported.has(fn) ||
                submitHandlers.has(fn) ||
                helperCommits.has(fn) ||
                serialized(fn)
              )
                continue
              let hit = false
              const refetch = kind === 'call' && refreshAfter(fn, node)
              if (kind === 'method') {
                const object = node.parent
                const usedAsRequestOptions = (expression) => {
                  const request = expression.parent
                  return (
                    persistenceCall(request) &&
                    request.arguments.includes(expression) &&
                    promiseUsed(request, fn)
                  )
                }
                if (object?.type === 'ObjectExpression') {
                  hit = usedAsRequestOptions(object)
                  if (!hit && object.parent?.type === 'VariableDeclarator') {
                    const variable = variableFor(object.parent.id)
                    hit = (variable?.references ?? []).some((reference) =>
                      usedAsRequestOptions(reference.identifier),
                    )
                  }
                }
              }
              if (kind === 'call') {
                const held = namesFor(fn)
                hit =
                  persistenceCall(node) &&
                  (node.arguments.some(
                    (argument) =>
                      toggled(argument, held) ||
                      (argument.type === 'ObjectExpression' &&
                        argument.properties.some(
                          (property) =>
                            selfToggle(property) ||
                            (property.type === 'Property' && toggled(property.value, held)),
                        )),
                  ) ||
                    droppedOrRefetched(fn, node) ||
                    (() => {
                      let branch = node.parent
                      while (branch && branch !== fn) {
                        if (
                          ['IfStatement', 'ConditionalExpression'].includes(branch.type) &&
                          ((refetch && oppositeRequests(branch)) ||
                            [...states.values()].some((state) =>
                              state.variable.references.some(
                                (reference) =>
                                  reference.identifier.range[0] >= branch.test.range[0] &&
                                  reference.identifier.range[1] <= branch.test.range[1],
                              ),
                            ))
                        )
                          return true
                        branch = branch.parent
                      }
                      return false
                    })()) &&
                  promiseUsed(node, fn)
              }
              if (kind === 'choice') {
                const branches = [node.consequent, node.alternate].map(unwrap)
                const methods = branches.map((branch) => callName(branch)?.toUpperCase())
                const deleteAndWrite =
                  methods.includes('DELETE') &&
                  methods.some((method) => ['POST', 'PUT', 'PATCH'].includes(method))
                hit =
                  (toggled(unwrap(node.test), namesFor(fn)) || deleteAndWrite) &&
                  branches.every((branch) => persistenceCall(branch)) &&
                  (promiseUsed(node, fn) ||
                    [node.consequent, node.alternate].every(
                      (branch) => branch.type === 'AwaitExpression',
                    ))
              }
              const optimistic = shownBefore(fn, namesFor(fn), node)
              const guards =
                optimistic && (mode !== 'all' || !hit) && kind === 'call' && promiseUsed(node, fn)
                  ? busyGuards(fn, node)
                  : new Set()
              const dropsIntent = guards.size > 0 && !guardedControlIsDisabled(fn, guards)
              if (dropsIntent && mode === 'advisory') continue
              if (dropsIntent && (mode === 'dropped-intent' || !hit)) {
                reported.add(fn)
                context.report({ node, messageId: 'droppedIntent' })
                continue
              }
              if (mode === 'dropped-intent') continue
              if (!hit || !optimistic) continue
              reported.add(fn)
              context.report({
                node,
                messageId: optimistic
                  ? 'useOptimisticValue'
                  : refetch
                    ? 'awaitRefetch'
                    : 'awaitSave',
                data: optimistic
                  ? { rewrite: rewriteFor(fn, node) }
                  : {
                      location: `${context.filename}:${node.loc.start.line}:${node.loc.start.column + 1}`,
                    },
              })
            }
          },
        }
      },
    },
    // A `<button type="button">` with no handler does nothing when pressed: `type="button"`
    // switches off the one thing a button does by itself (submit its form). It is usually a
    // placeholder drawn for the layout while the component that owns the action was written
    // elsewhere and never rendered here. Structural only: the element's own attributes and its
    // JSX ancestors in this file. Anything that can give the button behaviour from outside this
    // element keeps the rule quiet: spread props, a ref, a native invoker attribute, a `data-*`
    // attribute (a script may bind by it), a permanently unavailable control, or an ancestor
    // with its own event handler (delegation).
    'buttons-have-an-action': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Report a `<button type="button">` that has no way to do anything.',
        },
        schema: [],
        messages: {
          inert:
            '{{location}}: No action or external binding hook is declared on this type=button element or its local JSX ancestors. Add its handler, props/ref, or an explicit external binding hook. If a containing component owns delegation, document that at this element.',
        },
      },
      create(context) {
        const nameOf = (attribute) =>
          attribute.type === 'JSXAttribute'
            ? attribute.name.type === 'JSXNamespacedName'
              ? `${attribute.name.namespace.name}:${attribute.name.name.name}`
              : attribute.name.name
            : null
        const handles = (name) => /^on[A-Z]/.test(name)
        // Native ways a button acts with no script, and hooks a script outside React binds by.
        const external = (name) =>
          name === 'id' ||
          name === 'ref' ||
          name === 'disabled' ||
          name === 'aria-disabled' ||
          name === 'form' ||
          name === 'formAction' ||
          /^popovertarget/i.test(name) ||
          /^command(for)?$/i.test(name) ||
          name.startsWith('data-')
        return {
          JSXOpeningElement(node) {
            if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'button') return
            let explicitButton = false
            for (const attribute of node.attributes) {
              const name = nameOf(attribute)
              // Spread props can carry a handler this file cannot see.
              if (name === null || handles(name) || external(name)) return
              if (
                name === 'type' &&
                attribute.value?.type === 'Literal' &&
                attribute.value.value === 'button'
              )
                explicitButton = true
            }
            // Without an explicit type the button may submit a form rendered by a parent.
            if (!explicitButton) return
            for (let parent = node.parent.parent; parent; parent = parent.parent) {
              if (parent.type !== 'JSXElement') continue
              if (
                parent.openingElement.attributes.some((attribute) => {
                  const name = nameOf(attribute)
                  return name === null || handles(name)
                })
              )
                return
              const tag = parent.openingElement.name
              // A label forwards its click, and a summary toggles its details.
              if (tag.type === 'JSXIdentifier' && (tag.name === 'label' || tag.name === 'summary'))
                return
            }
            context.report({
              node,
              messageId: 'inert',
              data: { location: `${context.filename}:${node.loc.start.line}` },
            })
          },
        }
      },
    },
    // A hand-written copy of the query hook. X1 P317: all 8 projects shipped a typed resource
    // module on the shared query cache and 7 of 8 runs wrote `useAsync(loader, deps)` /
    // `useFetch(load, deps)` instead — a hook that calls a loader it is handed inside an effect
    // and keeps the answer in component state. That is `useQuery` without the cache: two
    // components showing one record fetch it twice, and a write elsewhere leaves this copy stale.
    // Structural: a function named use*, one of whose PARAMETERS is called inside its
    // `useEffect` (directly, or through a ref it was stored in), with a `useState` setter called
    // in that effect. A hook that fetches a fixed thing, debounces, or measures the window never
    // calls a parameter there. Enabled only where @molecule/app-query-react is declared.
    'fetch-hooks-use-the-query-cache': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Report a hook that runs a loader it is handed in an effect and keeps the result in state, where the shared query cache is declared.',
        },
        schema: [],
        messages: {
          useQuery:
            '{{location}}: `{{name}}` awaits a loader in an effect and stores its result in component state. This workspace declares @molecule/app-query-react. If the loader reads shared server data, use useQuery for shared requests and invalidation; keep measurement, subscription and side-effect hooks local.',
        },
      },
      create(context) {
        const source = context.sourceCode
        const isFunction = (node) =>
          node?.type === 'FunctionDeclaration' ||
          node?.type === 'FunctionExpression' ||
          node?.type === 'ArrowFunctionExpression'
        const nameOf = (node) =>
          node.id?.type === 'Identifier'
            ? node.id.name
            : node.parent?.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier'
              ? node.parent.id.name
              : ''
        const walk = (node, visit) => {
          if (!node || typeof node.type !== 'string') return
          visit(node)
          for (const key of Object.keys(node)) {
            if (key === 'parent') continue
            const value = node[key]
            if (Array.isArray(value)) for (const child of value) walk(child, visit)
            else if (value && typeof value.type === 'string') walk(value, visit)
          }
        }
        const check = (node) => {
          const name = nameOf(node)
          if (!/^use[A-Z]/.test(name) || node.body?.type !== 'BlockStatement') return
          const params = new Set(
            node.params.filter((param) => param.type === 'Identifier').map((param) => param.name),
          )
          if (params.size === 0) return
          // Refs that hold a parameter (`const loadRef = useRef(load)`) and state setters.
          const refs = new Set()
          const setters = new Set()
          for (const statement of node.body.body) {
            if (statement.type !== 'VariableDeclaration') continue
            for (const declaration of statement.declarations) {
              const call = declaration.init
              if (call?.type !== 'CallExpression' || call.callee.type !== 'Identifier') continue
              if (
                call.callee.name === 'useRef' &&
                declaration.id.type === 'Identifier' &&
                call.arguments[0]?.type === 'Identifier' &&
                params.has(call.arguments[0].name)
              )
                refs.add(declaration.id.name)
              if (
                call.callee.name === 'useState' &&
                declaration.id.type === 'ArrayPattern' &&
                declaration.id.elements[1]?.type === 'Identifier'
              )
                setters.add(declaration.id.elements[1].name)
            }
          }
          if (setters.size === 0) return
          for (const statement of node.body.body) {
            const call = statement.type === 'ExpressionStatement' ? statement.expression : null
            if (
              call?.type !== 'CallExpression' ||
              call.callee.type !== 'Identifier' ||
              call.callee.name !== 'useEffect' ||
              !isFunction(call.arguments[0])
            )
              continue
            const binding = (id) => {
              if (id?.type !== 'Identifier') return null
              for (let scope = source.getScope(id); scope; scope = scope.upper) {
                const found = scope.set.get(id.name)
                if (found) return found
              }
              return null
            }
            const parameters = new Set(
              node.params.filter((param) => param.type === 'Identifier').map(binding),
            )
            const loaderCall = (expression) =>
              expression?.type === 'CallExpression' &&
              ((expression.callee.type === 'Identifier' &&
                parameters.has(binding(expression.callee))) ||
                (expression.callee.type === 'MemberExpression' &&
                  expression.callee.property.name === 'current' &&
                  refs.has(expression.callee.object.name)))
            const resultFromLoader = (expression, seen = new Set()) => {
              if (!expression || seen.has(expression)) return false
              seen.add(expression)
              if (expression.type === 'AwaitExpression') return loaderCall(expression.argument)
              if (expression.type === 'Identifier') {
                const definition = binding(expression)?.defs[0]
                if (definition?.type === 'Variable')
                  return resultFromLoader(definition.node.init, seen)
                if (definition?.type === 'Parameter') {
                  const fn = definition.node,
                    owner = fn.parent
                  return (
                    owner?.type === 'CallExpression' &&
                    owner.callee.type === 'MemberExpression' &&
                    owner.callee.property.name === 'then' &&
                    loaderCall(owner.callee.object) &&
                    fn.params[0] === definition.name
                  )
                }
                return false
              }
              if (expression.type === 'MemberExpression')
                return resultFromLoader(expression.object, seen)
              if (expression.type === 'ObjectExpression')
                return expression.properties.some((property) =>
                  resultFromLoader(property.value ?? property.argument, seen),
                )
              if (expression.type === 'ArrayExpression')
                return expression.elements.some((element) => resultFromLoader(element, seen))
              if (
                ['TSAsExpression', 'TSNonNullExpression', 'ChainExpression'].includes(
                  expression.type,
                )
              )
                return resultFromLoader(expression.expression, seen)
              return false
            }
            let storesLoaderResult = false
            walk(call.arguments[0].body, (inner) => {
              if (
                inner.type === 'CallExpression' &&
                inner.callee.type === 'Identifier' &&
                setters.has(inner.callee.name) &&
                inner.arguments.some((argument) => resultFromLoader(argument))
              )
                storesLoaderResult = true
            })
            if (!storesLoaderResult) continue
            context.report({
              node: node.id ?? node,
              messageId: 'useQuery',
              data: {
                name,
                location:
                  context.filename.split(/[\\/]/).slice(-2).join('/') + ':' + node.loc.start.line,
              },
            })
            return
          }
        }
        return {
          FunctionDeclaration: check,
          FunctionExpression: check,
          ArrowFunctionExpression: check,
        }
      },
    },
    // A view the page reads from a query parameter that no link sets. X1 P317 l2400 read its
    // profile tab with `searchParams.get('tab') === 'favorites'` while the tab link went to
    // `/profile/:username/favorites`: the click changed the path, the comparison stayed false,
    // and the Favorited tab kept showing the author's own articles (navigation.spec.ts:200).
    // Narrow on purpose: one file, a comparison of a `useSearchParams()` read with a string
    // literal, nothing in the file that writes that parameter, and a link in the same file whose
    // path ends in that same literal. A parameter another file sets, or a view no link names by
    // path, stays quiet.
    'links-reach-the-view-they-select': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Report a view read from a query parameter that nothing in the file sets, while a link in the file goes to a path of the same name.',
        },
        schema: [],
        messages: {
          unreachable:
            '{{location}}: this link’s selected state reads `{{read}}` from `?{{key}}=`, while its target on line {{linkLine}} is `{{target}}`. If the target should select this view, align the expression with its path or set `?{{key}}={{value}}` in the link.',
        },
      },
      create(context) {
        const source = context.sourceCode
        const binding = (id) => {
          if (id?.type !== 'Identifier') return null
          for (let scope = source.getScope(id); scope; scope = scope.upper) {
            const found = scope.set.get(id.name)
            if (found) return found
          }
          return null
        }
        const urlFactory = (callee) => {
          const def = binding(callee)?.defs[0]
          return (
            def?.type === 'ImportBinding' &&
            def.parent.importKind !== 'type' &&
            def.node.importKind !== 'type' &&
            ['react-router', 'react-router-dom', '@molecule/app-routing-react-router'].includes(
              def.parent.source.value,
            ) &&
            def.node.imported?.name === 'useSearchParams'
          )
        }

        const text = source.getText()
        const readers = new Set()
        const reads = []
        const links = []
        const literal = (node) =>
          node?.type === 'Literal' && typeof node.value === 'string'
            ? node.value
            : node?.type === 'TemplateLiteral' && node.expressions.length === 0
              ? node.quasis[0].value.cooked
              : null
        // The static tail of a link target: the whole literal, or a template's last piece.
        const targetTail = (node) => {
          if (node?.type === 'JSXExpressionContainer') return targetTail(node.expression)
          if (node?.type === 'Literal' && typeof node.value === 'string') return node.value
          if (node?.type === 'TemplateLiteral')
            return node.quasis[node.quasis.length - 1].value.cooked
          return null
        }
        return {
          VariableDeclarator(node) {
            if (
              node.id.type === 'ArrayPattern' &&
              node.id.elements[0]?.type === 'Identifier' &&
              node.init?.type === 'CallExpression' &&
              node.init.callee.type === 'Identifier' &&
              urlFactory(node.init.callee)
            )
              readers.add(binding(node.id.elements[0]))
          },
          BinaryExpression(node) {
            if (!['===', '==', '!==', '!='].includes(node.operator)) return
            for (const [call, other] of [
              [node.left, node.right],
              [node.right, node.left],
            ]) {
              const value = literal(other)
              if (
                value === null ||
                value === '' ||
                call.type !== 'CallExpression' ||
                call.callee.type !== 'MemberExpression' ||
                call.callee.object.type !== 'Identifier' ||
                call.callee.property.type !== 'Identifier' ||
                call.callee.property.name !== 'get'
              )
                continue
              const key = literal(call.arguments[0])
              if (key === null || !/^[A-Za-z_][\w-]*$/.test(key) || !/^[\w-]+$/.test(value))
                continue
              reads.push({ node, reader: binding(call.callee.object), key, value })
            }
          },
          JSXAttribute(node) {
            if (node.name.type !== 'JSXIdentifier' || !['to', 'href'].includes(node.name.name))
              return
            const tail = targetTail(node.value)
            if (typeof tail === 'string') links.push({ node, tail })
          },
          'Program:exit'() {
            for (const read of reads) {
              if (!readers.has(read.reader)) continue
              // Anything that could write the parameter: `?tab=`, `.set('tab'`, `{ tab: … }`.
              const key = read.key.replace(/[-]/g, '\\$&')
              if (
                new RegExp(
                  '[?&`\'"]' +
                    key +
                    '=|\\.set\\(\\s*[\'"`]' +
                    key +
                    '[\'"`]|[{,]\\s*[\'"]?' +
                    key +
                    '[\'"]?\\s*:',
                ).test(text)
              )
                continue
              const owner =
                read.node.parent?.type === 'VariableDeclarator'
                  ? binding(read.node.parent.id)
                  : null
              const selected = (candidate) => {
                for (const attribute of candidate.node.parent?.attributes ?? []) {
                  if (
                    attribute.type !== 'JSXAttribute' ||
                    !['className', 'aria-current', 'aria-selected'].includes(attribute.name.name)
                  )
                    continue
                  const expression = attribute.value?.expression
                  let found = false
                  const visit = (node) => {
                    if (!node) return
                    if (
                      node === read.node ||
                      (owner && node.type === 'Identifier' && binding(node) === owner)
                    ) {
                      found = true
                      return
                    }
                    for (const key of source.visitorKeys[node.type] ?? []) {
                      const child = node[key]
                      if (Array.isArray(child)) child.forEach(visit)
                      else visit(child)
                    }
                  }
                  visit(expression)
                  if (found) return true
                }
                return false
              }
              const link = links.find(
                (candidate) =>
                  new RegExp('/' + read.value + '/?$').test(candidate.tail.split(/[?#]/)[0]) &&
                  selected(candidate),
              )
              if (!link) continue
              context.report({
                node: read.node,
                messageId: 'unreachable',
                data: {
                  location:
                    context.filename.split(/[\\/]/).slice(-2).join('/') +
                    ':' +
                    read.node.loc.start.line,
                  read: source.getText(read.node),
                  key: read.key,
                  value: read.value,
                  linkLine: link.node.loc.start.line,
                  target: link.tail,
                },
              })
            }
          },
        }
      },
    },
    // A branch rendered while a loaded record is missing may not sit in the same parent
    // element as markup that shows a field of that record. Both anchors are local AST facts:
    // data the page waits for (a hook result or state set in an effect), and a displayed field.
    // Inspect chained ternaries together, including query.data and query.status tests. A
    // component or live-region placeholder has the same placement defect as host text.
    'placeholders-stay-out-of-record-fields': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Report a waiting or error message rendered in the same element as a field of the record it waits for.',
        },
        schema: [],
        messages: {
          sameElement:
            '{{location}}: while `{{record}}` is missing this branch renders inside the same parent element as `{{field}}` (line {{fieldLine}}), so a reader can get the placeholder as the field value. Render the waiting or error message outside the region that shows `{{record}}` (return it before this markup, or put it beside the whole region), and render nothing here until `{{record}}` exists.',
        },
      },
      create(context) {
        const tagOf = (node) =>
          node?.type === 'JSXElement' &&
          node.openingElement.name.type === 'JSXIdentifier' &&
          /^[a-z]/.test(node.openingElement.name.name)
            ? node.openingElement.name.name
            : null
        const unwrap = (node) =>
          ['ChainExpression', 'TSNonNullExpression', 'TSAsExpression'].includes(node?.type)
            ? unwrap(node.expression)
            : node
        const pathOf = (node) => {
          node = unwrap(node)
          if (node?.type === 'Identifier') return { identifier: node, path: [] }
          if (node?.type !== 'MemberExpression' || node.computed) return null
          const object = pathOf(node.object)
          return object ? { ...object, path: [...object.path, node.property.name] } : null
        }
        // A field's own truthiness is not record availability (`q.data.draft` stays quiet).
        const recordOf = (node) => {
          const record = pathOf(node)
          return record &&
            (record.path.length === 0 || (record.path.length === 1 && record.path[0] === 'data'))
            ? record
            : null
        }
        const presence = (test) => {
          test = unwrap(test)
          const record = recordOf(test)
          if (record) return { ...record, present: true, other: false }
          if (test.type === 'UnaryExpression' && test.operator === '!') {
            const inner = presence(test.argument)
            return inner ? { ...inner, present: inner.other, other: inner.present } : null
          }
          if (test.type === 'LogicalExpression' && test.operator === '&&')
            return presence(test.left) ?? presence(test.right)
          if (test.type === 'BinaryExpression' && /^[!=]==?$/.test(test.operator)) {
            const empty = (side) =>
              (side.type === 'Literal' && side.value === null) ||
              (side.type === 'Identifier' && side.name === 'undefined')
            const subject = empty(test.right) ? test.left : empty(test.left) ? test.right : null
            const compared = recordOf(subject)
            if (compared)
              return {
                ...compared,
                present: test.operator[0] === '!',
                other: test.operator[0] === '=',
              }
            const status = pathOf(test.left) ?? pathOf(test.right)
            const value = test.left.type === 'Literal' ? test.left.value : test.right.value
            if (
              status?.path.length === 1 &&
              status.path[0] === 'status' &&
              ['idle', 'pending', 'loading', 'error', 'success'].includes(value)
            )
              return {
                ...status,
                path: ['data'],
                // A non-error status can still be pending. Preserve an enclosing data test's
                // absence on that arm instead of treating "not error" as "record loaded".
                present:
                  test.operator[0] === '='
                    ? value === 'success'
                    : value === 'success'
                      ? false
                      : null,
                other:
                  test.operator[0] === '!'
                    ? value === 'success'
                    : value === 'success'
                      ? false
                      : null,
              }
          }
          return null
        }
        // Every reference to the record inside a node, as the AST has it: a word inside a string
        // ("This profile does not exist") is not a read.
        const sameRecord = (node, record) => {
          const candidate = pathOf(node)
          return (
            candidate &&
            variableOf(candidate.identifier) === record.variable &&
            candidate.path.join('.') === record.path.join('.')
          )
        }
        const references = (node, record, found = []) => {
          if (!node || typeof node.type !== 'string') return found
          if (sameRecord(node, record)) found.push(node)
          for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
            // `other.profile` names a property, not the record.
            if (key === 'property' && node.type === 'MemberExpression' && !node.computed) continue
            const child = node[key]
            if (Array.isArray(child)) for (const item of child) references(item, record, found)
            else references(child, record, found)
          }
          return found
        }
        const reads = (node, record) => references(node, record).length > 0
        const rendersMarkup = (node) => {
          if (!node || typeof node.type !== 'string') return false
          if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true
          return (context.sourceCode.visitorKeys[node.type] ?? []).some((key) => {
            const child = node[key]
            return Array.isArray(child) ? child.some(rendersMarkup) : rendersMarkup(child)
          })
        }
        // The member of the record a text element shows, e.g. `profile.bio`.
        const fieldShown = (element, record) => {
          for (const child of element.children) {
            // A collection mapped to JSX renders rows, not this record's text field.
            if (child.type !== 'JSXExpressionContainer' || rendersMarkup(child.expression)) continue
            for (const reference of references(child.expression, record)) {
              const member = reference.parent
              let control = false
              for (
                let current = reference;
                current !== child.expression;
                current = current.parent
              ) {
                if (
                  current.parent?.type === 'ConditionalExpression' &&
                  current.parent.test === current
                ) {
                  control = true
                  break
                }
              }
              if (
                !control &&
                member.type === 'MemberExpression' &&
                member.object === reference &&
                !member.computed &&
                !(member.parent.type === 'CallExpression' && member.parent.callee === member)
              )
                return `${record.name}.${member.property.name}`
            }
          }
          return null
        }
        const BUILT_IN = new Set([
          'useState',
          'useReducer',
          'useRef',
          'useMemo',
          'useCallback',
          'useId',
          'useTransition',
          'useDeferredValue',
          'useAuth',
        ])
        const variableOf = (identifier) => {
          for (let scope = context.sourceCode.getScope(identifier); scope; scope = scope.upper) {
            const variable = scope.set.get(identifier.name)
            if (variable) return variable
          }
          return null
        }
        const calls = (node, test) =>
          node?.type === 'CallExpression' &&
          node.callee.type === 'Identifier' &&
          test(node.callee.name)
        const hookCall = (node) =>
          calls(node, (name) => /^use[A-Z]/.test(name) && !BUILT_IN.has(name))
        const insideEffect = (node) => {
          for (let parent = node.parent; parent; parent = parent.parent)
            if (calls(parent, (name) => name === 'useEffect' || name === 'useLayoutEffect'))
              return true
          return false
        }
        // Whether the value comes from a hook's result, through member reads and fallbacks only.
        const fromHook = (node, depth = 0) => {
          if (!node || depth > 4) return false
          if (node.type === 'TSNonNullExpression' || node.type === 'TSAsExpression')
            return fromHook(node.expression, depth)
          if (node.type === 'ChainExpression') return fromHook(node.expression, depth)
          if (node.type === 'LogicalExpression') {
            // A complete empty object/list is a settled default, not a record to wait on.
            if (['ObjectExpression', 'ArrayExpression'].includes(unwrap(node.right)?.type))
              return false
            return fromHook(node.left, depth) || fromHook(node.right, depth)
          }
          if (node.type === 'ConditionalExpression')
            return fromHook(node.consequent, depth) || fromHook(node.alternate, depth)
          if (node.type === 'MemberExpression')
            return !node.computed && fromHook(node.object, depth)
          if (node.type === 'Identifier') {
            const variable = variableOf(node)
            return !!variable && awaited(variable, depth + 1)
          }
          return hookCall(node)
        }
        // Whether this component waits for the variable's value.
        const awaited = (variable, depth = 0) => {
          const definition = variable.defs[0]
          if (variable.defs.length !== 1 || definition?.type !== 'Variable') return false
          const declarator = definition.node
          if (declarator.id.type === 'ArrayPattern') {
            if (!calls(declarator.init, (name) => name === 'useState')) return false
            const setter = declarator.id.elements[1]
            if (declarator.id.elements[0] !== definition.name || setter?.type !== 'Identifier')
              return false
            const setterVariable = variableOf(setter)
            return !!setterVariable?.references.some(
              (reference) =>
                reference.identifier.parent.type === 'CallExpression' &&
                reference.identifier.parent.callee === reference.identifier &&
                insideEffect(reference.identifier),
            )
          }
          if (declarator.id.type === 'ObjectPattern') return hookCall(declarator.init)
          return (
            declarator.id.type === 'Identifier' &&
            (hookCall(declarator.init) || fromHook(declarator.init, depth))
          )
        }
        const placeholder = (node) => {
          if (node.type === 'Literal') return typeof node.value === 'string' && !!node.value.trim()
          if (node.type === 'JSXText') return !!node.value.trim()
          if (node.type === 'JSXExpressionContainer')
            return node.expression.type !== 'JSXEmptyExpression'
          if (node.type !== 'JSXElement' && node.type !== 'JSXFragment') return false
          if (
            node.type === 'JSXElement' &&
            (node.openingElement.name.type !== 'JSXIdentifier' ||
              /^[A-Z]/.test(node.openingElement.name.name))
          )
            return true
          return node.children.some(placeholder)
        }
        return {
          ConditionalExpression(node) {
            if (node.parent.type !== 'JSXExpressionContainer') return
            let container = node.parent.parent
            while (container?.type === 'JSXFragment') container = container.parent
            if (container?.type !== 'JSXElement') return
            const subjects = []
            const collect = (branch) => {
              if (branch.type !== 'ConditionalExpression') return
              const subject = presence(branch.test)
              const variable = subject && variableOf(subject.identifier)
              if (
                variable &&
                awaited(variable) &&
                !subjects.some(
                  (other) =>
                    other.variable === variable && other.path.join('.') === subject.path.join('.'),
                )
              )
                subjects.push({
                  ...subject,
                  variable,
                  name: [subject.identifier.name, ...subject.path].join('.'),
                })
              collect(branch.consequent)
              collect(branch.alternate)
            }
            collect(node)
            const reported = new Set()
            for (const record of subjects) {
              const loaded = [],
                waiting = []
              const branches = (branch, present = null) => {
                if (branch.type === 'ConditionalExpression') {
                  const subject = presence(branch.test)
                  const matches =
                    subject &&
                    sameRecord(subject.identifier, { ...record, path: [] }) &&
                    subject.path.join('.') === record.path.join('.')
                  branches(branch.consequent, matches ? (subject.present ?? present) : present)
                  branches(branch.alternate, matches ? (subject.other ?? present) : present)
                } else if (present === false) waiting.push(branch)
                else loaded.push(branch)
              }
              branches(node)
              let shown = null
              for (const branch of loaded) {
                const candidates = tagOf(branch)
                  ? [branch]
                  : branch.type === 'JSXFragment'
                    ? branch.children
                    : []
                for (const candidate of [...candidates].reverse()) {
                  if (!tagOf(candidate)) continue
                  const field = fieldShown(candidate, record)
                  if (field) {
                    shown = { field, fieldLine: String(candidate.loc.start.line) }
                    break
                  }
                }
                if (shown) break
              }
              if (!shown) continue
              for (const branch of waiting) {
                if (reported.has(branch) || !placeholder(branch) || reads(branch, record)) continue
                reported.add(branch)
                context.report({
                  node: branch,
                  messageId: 'sameElement',
                  data: {
                    location: `${context.filename}:${branch.loc.start.line}`,
                    record: record.name,
                    ...shown,
                  },
                })
              }
            }
          },
        }
      },
    },
    'require-catch-binding': {
      meta: {
        type: 'problem',
        fixable: 'code',
        docs: {
          description:
            'Require a binding in catch clauses so the error is never silently swallowed',
        },
        schema: [],
        messages: {
          missing:
            'Bind the caught error: `catch (error)` to log/re-throw it, or `catch (_error)` + a comment for an intentional noop.',
        },
      },
      create(context) {
        return {
          CatchClause(node) {
            if (node.param) return
            context.report({
              node,
              messageId: 'missing',
              fix(fixer) {
                const source = context.sourceCode
                const names = new Set(
                  source.scopeManager.scopes.flatMap((scope) => [
                    ...scope.variables.map((variable) => variable.name),
                    ...scope.references.map((reference) => reference.identifier.name),
                  ]),
                )
                // Scope names include escaped identifiers and references inside closures.
                // Direct eval can read unknown names, so leave it for manual handling.
                if (
                  source.scopeManager.scopes.some((scope) =>
                    scope.references.some(
                      ({ identifier }) =>
                        identifier.name === 'eval' &&
                        identifier.range[0] >= node.body.range[0] &&
                        identifier.range[1] <= node.body.range[1],
                    ),
                  )
                )
                  return null
                let name = '_error'
                for (let suffix = 1; names.has(name); suffix++) name = `_error${suffix}`
                return fixer.insertTextAfter(source.getFirstToken(node), ` (${name})`)
              },
            })
          },
        }
      },
    },
    'preserve-timestamp-precision': {
      meta: {
        type: 'problem',
        schema: [
          {
            type: 'object',
            properties: { fields: { type: 'array', items: { type: 'string' } } },
            required: ['fields'],
            additionalProperties: false,
          },
        ],
        messages: {
          truncated:
            'This toISOString() value is truncated in the configured precision-sensitive field {{field}}. Keep its full ISO value; use a separate formatted value for display.',
        },
      },
      create(context) {
        const fields = new Set(context.options[0]?.fields ?? [])
        return {
          CallExpression(node) {
            const member = node.callee
            if (
              member.type !== 'MemberExpression' ||
              !['slice', 'substring', 'substr'].includes(member.property.name) ||
              node.arguments[0]?.value !== 0 ||
              typeof node.arguments[1]?.value !== 'number' ||
              node.arguments[1].value < 19 ||
              node.arguments[1]?.value >= 24
            )
              return
            const call = member.object
            if (
              call.type !== 'CallExpression' ||
              call.callee.type !== 'MemberExpression' ||
              call.callee.property.name !== 'toISOString'
            )
              return
            for (let parent = node.parent; parent; parent = parent.parent) {
              if (parent.type === 'Property') {
                if (parent.computed && parent.key.type !== 'Literal') return
                const field = parent.computed
                  ? parent.key.value
                  : (parent.key.name ?? parent.key.value)
                if (fields.has(field))
                  context.report({ node, messageId: 'truncated', data: { field } })
                return
              }
              if (
                ['VariableDeclarator', 'ReturnStatement', 'ExpressionStatement'].includes(
                  parent.type,
                )
              )
                return
            }
          },
        }
      },
    },
  }
  // Reuse the existing flow analysis for a narrow correctness error. The broader
  // helper recommendation remains advisory: a custom implementation is valid.
  const toggles = rules['server-toggles-use-optimistic-value']
  rules['no-dropped-optimistic-intent'] = {
    ...toggles,
    meta: {
      ...toggles.meta,
      type: 'problem',
      docs: {
        description:
          'Reject an enabled control whose handler first returns because a value tested for absence in its component’s JSX is missing, unless disabled or mounted on that value; also reject discarded clicks while saving.',
      },
    },
    create(context) {
      return toggles.create(
        Object.create(context, {
          options: { value: [{ ...context.options[0], mode: 'dropped-intent' }] },
        }),
      )
    },
  }
  return rules
}
