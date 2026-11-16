/**
 * A render value must not silently discard an enabled control's first action.
 * Check the handler's effect-free prefix, including local tail-call wrappers.
 * preventDefault/stopPropagation are bookkeeping, not an answer to the action.
 *
 * Single-file JSX activation controls: clicks, submits and keyboard actions.
 * Gesture/lifecycle callbacks (move, hover, media events) are not activations.
 * Other custom callback props require a disabled prop on that same JSX control.
 * Opaque callbacks passed to another file are outside this rule. No imported files,
 * query provenance, persistence methods, routes or display text are inspected.
 * Boolean implication checks the same condition at the handler and control.
 */
const ACTIVATION =
  /^(?:onClick|onDoubleClick|onSubmit|onKeyDown|onKeyUp|onPointerDown|onPointerUp|onMouseDown|onMouseUp)$/
const isFunction = (n) =>
  /^(?:FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(n?.type)
const contains = (a, b) => a && b && a.range[0] <= b.range[0] && a.range[1] >= b.range[1]
const unwrap = (n) => {
  while (
    /^(?:TSAsExpression|TSSatisfiesExpression|TSTypeAssertion|TSNonNullExpression|ChainExpression|ParenthesizedExpression)$/.test(
      n?.type,
    )
  )
    n = n.expression
  return n
}
const not = (a) => (typeof a === 'boolean' ? !a : a?.[0] === '!' ? a[1] : ['!', a])
const join = (op, a, b) =>
  a === b
    ? a
    : typeof a === 'boolean'
      ? op === '&&'
        ? a
          ? b
          : false
        : a
          ? true
          : b
      : typeof b === 'boolean'
        ? join(op, b, a)
        : [op, a, b]
const and = (a, b) => join('&&', a, b)
const or = (a, b) => join('||', a, b)
// A propositional contradiction proves that no enabled, mounted action can drop.
function possible(f, values = new Map()) {
  const evaluate = (v) => {
    if (typeof v === 'boolean') return v
    if (typeof v === 'string') return values.get(v) ?? v
    const a = evaluate(v[1])
    return v[0] === '!' ? not(a) : join(v[0], a, evaluate(v[2]))
  }
  f = evaluate(f)
  if (typeof f === 'boolean') return f
  let atom = f
  while (Array.isArray(atom)) atom = atom[1]
  return (
    possible(f, new Map(values).set(atom, false)) || possible(f, new Map(values).set(atom, true))
  )
}
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require disabled or unmounted controls when render state can silently discard their action.',
    },
    schema: [],
    messages: {
      droppedAction:
        '{{fix}} The handler can return without answering the action while {{condition}}.',
    },
  },
  create(context) {
    const source = context.sourceCode,
      controls = [],
      ids = new Map(),
      argumentsFor = new Map()
    let bindings
    const variable = (n) => {
      if (!bindings) {
        bindings = new WeakMap()
        for (const scope of source.scopeManager.scopes)
          for (const value of scope.variables) {
            for (const id of value.identifiers) bindings.set(id, value)
            for (const ref of value.references)
              if (runtimeReference(ref)) bindings.set(ref.identifier, value)
          }
      }
      return (n && bindings.get(n)) || null
    }
    const init = (n) => {
      const v = variable(n),
        d = v?.defs[0]
      return d?.type === 'Variable' &&
        d.parent.kind === 'const' &&
        d.node.id.type === 'Identifier' &&
        !v.references.some((r) => r.isWrite() && !r.init)
        ? unwrap(d.node.init)
        : null
    }
    const key = (n) => {
      n = unwrap(n)
      if (n?.type === 'CallExpression' && !pure(n)) return 'call@' + n.range[0]
      if (n?.type === 'Literal') return 'literal:' + typeof n.value + ':' + String(n.value)
      if (n?.type === 'Identifier') {
        const v = variable(n) ?? n.name
        if (!ids.has(v)) ids.set(v, String(ids.size))
        return 'v' + ids.get(v)
      }
      return n
        ? n.type +
            '(' +
            Object.entries(n)
              .filter(
                ([k]) => !['parent', 'loc', 'range', 'start', 'end', 'optional', 'raw'].includes(k),
              )
              .map(
                ([k, v]) =>
                  k +
                  ':' +
                  (Array.isArray(v)
                    ? v.map((p) => (p?.type ? key(p) : JSON.stringify(p))).join(',')
                    : v?.type
                      ? key(v)
                      : JSON.stringify(v)),
              )
              .join(',') +
            ')'
        : 'unknown'
    }
    const reactHook = (n, name) => {
      const member = n?.type === 'MemberExpression',
        d = variable(member ? n.object : n)?.defs[0]
      return (
        d?.type === 'ImportBinding' &&
        d.parent.source.value === 'react' &&
        (member
          ? !n.computed &&
            n.property.name === name &&
            ['ImportNamespaceSpecifier', 'ImportDefaultSpecifier'].includes(d.node.type)
          : d.node.imported?.name === name)
      )
    }
    const fnFor = (n, seen = new Set()) => {
      n = unwrap(n)
      if (!n || seen.has(n)) return null
      seen.add(n)
      if (isFunction(n)) return n
      const d = variable(n)?.defs[0]
      if (d?.type === 'FunctionName') return isFunction(d.node) && d.node.body ? d.node : null
      if (n.type === 'CallExpression' && reactHook(n.callee, 'useCallback'))
        return fnFor(n.arguments[0], seen)
      return fnFor(init(n), seen)
    }
    const walk = (n, visit) => {
      if (!n?.type) return
      visit(n)
      if (isFunction(n)) return
      for (const k of source.visitorKeys[n.type] ?? [])
        for (const p of [].concat(n[k] ?? [])) walk(p, visit)
    }
    const owner = (n) => {
      for (let p = n?.parent; p; p = p.parent) if (isFunction(p)) return p
      return null
    }
    const renderValue = (n, fn) => {
      let found = false,
        local = false
      walk(n, (p) => {
        if (
          p.type === 'MemberExpression' &&
          !p.computed &&
          p.property.name === 'current' &&
          reactHook(init(p.object)?.callee, 'useRef')
        )
          local = true
        if (p.type !== 'Identifier') return
        const v = variable(p),
          scope = v?.scope.variableScope.block
        if (scope === fn) local = true
        else if (isFunction(scope) && contains(scope, fn)) found = true
      })
      return found && !local
    }
    const pure = (n) => {
      let result = true
      walk(n, (p) => {
        if (
          [
            'AssignmentExpression',
            'UpdateExpression',
            'AwaitExpression',
            'NewExpression',
            'YieldExpression',
          ].includes(p.type)
        )
          result = false
        if (
          p.type === 'CallExpression' &&
          !(
            p.callee.type === 'Identifier' &&
            p.callee.name === 'Boolean' &&
            !variable(p.callee)?.defs.length
          ) &&
          !(
            p.callee.type === 'MemberExpression' &&
            !p.callee.computed &&
            p.callee.property.name === 'trim' &&
            p.arguments.length === 0
          )
        )
          result = false
      })
      return result
    }
    const optionalBase = (n) => {
      if (n?.type !== 'MemberExpression' && n?.type !== 'CallExpression') return null
      if (n.optional) return n.type === 'MemberExpression' ? n.object : n.callee
      return optionalBase(n.type === 'MemberExpression' ? n.object : n.callee)
    }
    const primitiveType = (n, seen = new Set()) => {
      n = unwrap(n)
      if (!n || seen.has(n)) return null
      const next = new Set(seen).add(n)
      if (n.type === 'Literal') return n.value === null ? 'null' : typeof n.value
      if (
        (n.type === 'UnaryExpression' && n.operator === '!') ||
        (n.type === 'BinaryExpression' &&
          ['===', '==', '!==', '!=', '<', '<=', '>', '>=', 'in', 'instanceof'].includes(n.operator))
      )
        return 'boolean'
      if (
        n.type === 'CallExpression' &&
        n.callee.type === 'MemberExpression' &&
        n.callee.property.name === 'trim'
      )
        return 'string'
      if (n.type === 'MemberExpression' && n.property.name === 'length') return 'number'
      const value = init(n)
      if (value) return primitiveType(value, next)
      const d = variable(n)?.defs[0]
      return d?.node.id?.type === 'ArrayPattern' && reactHook(d.node.init?.callee, 'useState')
        ? primitiveType(d.node.init.arguments[0], next)
        : null
    }
    const formula = (n, seen = new Set()) => {
      n = unwrap(n)
      if (!n || seen.has(n)) return key(n)
      const next = new Set(seen).add(n),
        f = (p) => formula(p, next)
      if (n.type === 'Literal') return Boolean(n.value)
      if (n.type === 'Identifier') {
        if (n.name === 'undefined' && !variable(n)?.defs.length) return false
        if (argumentsFor.has(variable(n))) return f(argumentsFor.get(variable(n)))
        const value = init(n)
        if (
          value &&
          (pure(value) ||
            [
              'LogicalExpression',
              'ConditionalExpression',
              'BinaryExpression',
              'UnaryExpression',
              'MemberExpression',
            ].includes(value.type) ||
            (value.type === 'CallExpression' && reactHook(value.callee, 'useMemo')))
        )
          return f(value)
      }
      if (n.type === 'UnaryExpression' && n.operator === '!') return not(f(n.argument))
      if (n.type === 'LogicalExpression' && n.operator !== '??')
        return join(n.operator, f(n.left), f(n.right))
      if (n.type === 'LogicalExpression' && n.operator === '??' && f(n.right) === false)
        return f(n.left)
      if (n.type === 'MemberExpression' && n.property.name === 'length') {
        const object = init(n.object) ?? unwrap(n.object)
        if (
          object?.type === 'LogicalExpression' &&
          object.operator === '??' &&
          object.right.type === 'ArrayExpression' &&
          object.right.elements.length === 0
        )
          return and(f(object.left), key({ ...n, object: object.left }))
      }
      if (
        n.type === 'BinaryExpression' &&
        ['>', '>='].includes(n.operator) &&
        n.right.value === 0 &&
        n.operator === '>'
      )
        return and(f(n.left), key(n))
      if (n.type === 'ConditionalExpression')
        return or(and(f(n.test), f(n.consequent)), and(not(f(n.test)), f(n.alternate)))
      if (
        n.type === 'CallExpression' &&
        n.callee.name === 'Boolean' &&
        !variable(n.callee)?.defs.length
      )
        return f(n.arguments[0])
      if (n.type === 'CallExpression' && reactHook(n.callee, 'useMemo')) {
        const fn = fnFor(n.arguments[0])
        if (fn?.expression) return f(fn.body)
      }
      if (n.type === 'BinaryExpression' && ['===', '==', '!==', '!='].includes(n.operator)) {
        const literal = (p) =>
          p.type === 'Literal' ||
          (p.type === 'Identifier' && p.name === 'undefined' && !variable(p)?.defs.length)
        let a = n.left,
          b = n.right
        if (literal(a) && !literal(b)) [a, b] = [b, a]
        if (literal(b)) {
          if (literal(a)) {
            const av = a.value,
              bv = b.value
            return n.operator === '==='
              ? av === bv
              : n.operator === '!=='
                ? av !== bv
                : n.operator === '=='
                  ? av == bv
                  : av != bv
          }
          const kind = primitiveType(a)
          if (b.value == null && kind && kind !== 'null') return n.operator.includes('!')
          if (
            typeof b.value === 'boolean' &&
            kind &&
            kind !== 'boolean' &&
            ['===', '!=='].includes(n.operator)
          )
            return n.operator.includes('!')
          const value = b.value,
            empty = value == null || value === '' || value === 0
          if (empty || typeof value === 'boolean') {
            // Constant/predicate values cannot equal null. Do not turn such a
            // comparison into a presence gate for an unrelated data value.
            const av = init(a),
              booleanValue =
                (av?.type === 'UnaryExpression' && av.operator === '!') ||
                (a.type === 'UnaryExpression' && a.operator === '!') ||
                a.type === 'BinaryExpression' ||
                (a.type === 'CallExpression' &&
                  a.callee.name === 'Boolean' &&
                  !variable(a.callee)?.defs.length) ||
                (av?.type === 'Literal' && typeof av.value === 'boolean')
            if (value == null && (booleanValue || av?.type === 'Literal'))
              return n.operator.includes('!')
            const base = optionalBase(unwrap(a))
            if (value === false && base) {
              const eq = and(f(base), key({ ...n, operator: '===' }))
              return n.operator.includes('!') ? not(eq) : eq
            }
            const test = f(a),
              negative = (empty || value === false) !== n.operator.includes('!')
            return negative ? not(test) : test
          }
        }
        const normalized = {
          ...n,
          operator: n.operator.includes('!') ? '===' : n.operator === '==' ? '===' : n.operator,
        }
        let test = key(normalized)
        const base = optionalBase(unwrap(n.left))
        if (base) test = and(f(base), test)
        return n.operator.includes('!') ? not(test) : test
      }
      // Continuous optional access is falsy when its base is absent.
      if (n.type === 'MemberExpression' && optionalBase(n)) return and(f(optionalBase(n)), key(n))
      if (n.type === 'CallExpression' && n.optional) return and(f(n.callee), key(n))
      return key(n)
    }
    const housekeeping = (n) =>
      n?.type === 'CallExpression' &&
      n.callee.type === 'MemberExpression' &&
      !n.callee.computed &&
      ['preventDefault', 'stopPropagation'].includes(n.callee.property.name) &&
      variable(n.callee.object)?.defs[0]?.type === 'Parameter'
    // Split short-circuit paths so an event/local-only return never becomes a
    // render-state defect merely because another operand reads component state.
    const branches = (n, expected, fn) => {
      n = unwrap(n)
      if (n.type === 'UnaryExpression' && n.operator === '!')
        return branches(n.argument, !expected, fn)
      if (n.type === 'LogicalExpression' && ['&&', '||'].includes(n.operator)) {
        const both = (n.operator === '&&') === expected,
          left = branches(n.left, expected, fn),
          right = branches(n.right, expected, fn)
        if (both)
          return left.flatMap((a) =>
            right.map((b) => ({
              condition: and(a.condition, b.condition),
              guarded: a.guarded || b.guarded,
              label: b.guarded ? b.label : a.label,
            })),
          )
        return [
          ...left,
          ...branches(n.left, !expected, fn).flatMap((a) =>
            right.map((b) => ({
              condition: and(a.condition, b.condition),
              guarded: b.guarded,
              label: b.label,
            })),
          ),
        ]
      }
      return [
        {
          condition: expected ? formula(n) : not(formula(n)),
          guarded: renderValue(n, fn),
          label: expected
            ? primitiveType(n) === 'boolean'
              ? source.getText(n)
              : `!!(${source.getText(n)})`
            : n.type === 'Identifier'
              ? '!' + source.getText(n)
              : '!(' + source.getText(n) + ')',
        },
      ]
    }
    const guardPaths = (fn, seen = new Set()) => {
      if (!fn || seen.has(fn)) return []
      const next = new Set(seen).add(fn),
        paths = []
      const run = (
        statements,
        condition = true,
        guarded = false,
        label = '',
        prevented = false,
        follow = true,
      ) => {
        if (!statements.length) {
          if (guarded) paths.push({ condition, label, prevented })
          return
        }
        const [s, ...rest] = statements
        if (s.type === 'BlockStatement')
          return run([...s.body, ...rest], condition, guarded, label, prevented, follow)
        if (s.type === 'IfStatement' && pure(s.test)) {
          for (const expected of [true, false])
            for (const path of branches(s.test, expected, fn)) {
              const body = expected ? s.consequent : s.alternate
              run(
                [...(body ? [body] : []), ...rest],
                and(condition, path.condition),
                guarded || (path.guarded && renderValue(s.test, fn)),
                path.guarded && renderValue(s.test, fn) ? path.label : label,
                prevented,
                follow && renderValue(s.test, fn),
              )
            }
          return
        }
        if (
          s.type === 'EmptyStatement' ||
          s.type === 'FunctionDeclaration' ||
          s.type.startsWith('TS') ||
          (s.type === 'VariableDeclaration' && s.declarations.every((d) => pure(d.init)))
        )
          return run(rest, condition, guarded, label, prevented, follow)
        if (s.type === 'ReturnStatement' && !s.argument) {
          if (guarded) paths.push({ condition, label, prevented })
          return
        }
        let e = unwrap(
          s.type === 'ReturnStatement'
            ? s.argument
            : s.type === 'ExpressionStatement'
              ? s.expression
              : s,
        )
        if (housekeeping(e))
          return run(
            rest,
            condition,
            guarded,
            label,
            prevented || e.callee.property.name === 'preventDefault',
            follow,
          )
        if (e?.type === 'UnaryExpression' && e.operator === 'void') e = unwrap(e.argument)
        if (e?.type === 'AwaitExpression') e = unwrap(e.argument)
        if (follow && !rest.length && e?.type === 'CallExpression')
          for (const p of guardPaths(fnFor(e.callee), next))
            paths.push({
              condition: and(condition, p.condition),
              label: p.label,
              prevented: prevented || p.prevented,
            })
        if (
          !rest.length &&
          e?.type === 'LogicalExpression' &&
          ['&&', '||'].includes(e.operator) &&
          pure(e.left) &&
          renderValue(e.left, fn)
        ) {
          const active = e.operator === '&&' ? formula(e.left) : not(formula(e.left))
          paths.push({
            condition: and(condition, not(active)),
            label:
              e.operator === '&&'
                ? '!(' + source.getText(e.left) + ')'
                : `!!(${source.getText(e.left)})`,
            prevented,
          })
        }
        // Calls, writes, navigation, feedback and returned values answer the action.
      }
      run(
        fn.expression
          ? [{ type: 'ExpressionStatement', expression: fn.body }]
          : (fn.body.body ?? []),
      )
      return paths
    }
    const selection = (n, condition = true, seen = new Set()) => {
      n = unwrap(n)
      if (!n || seen.has(n)) return []
      const next = new Set(seen).add(n)
      if (n.type === 'ConditionalExpression')
        return [
          ...selection(n.consequent, and(condition, formula(n.test)), next),
          ...selection(n.alternate, and(condition, not(formula(n.test))), next),
        ]
      if (n.type === 'LogicalExpression' && ['&&', '||'].includes(n.operator))
        return [
          ...(n.operator === '||' ? selection(n.left, condition, next) : []),
          ...selection(
            n.right,
            and(condition, n.operator === '&&' ? formula(n.left) : not(formula(n.left))),
            next,
          ),
        ]
      const fn = fnFor(n)
      return fn ? [{ fn, condition }] : selection(init(n), condition, next)
    }
    const terminates = (n) =>
      n?.type === 'ReturnStatement' ||
      n?.type === 'ThrowStatement' ||
      (n?.type === 'BlockStatement' && n.body.some(terminates))
    const runtimeReference = (r) => {
      for (let p = r.identifier.parent; p && !isFunction(p); p = p.parent)
        if (p.type === 'TSTypeQuery' || p.type === 'TSTypeReference') return false
      return !r.isTypeReference || r.isValueReference
    }
    const mounted = (n, seen = new Set()) => {
      if (seen.has(n)) return true
      const next = new Set(seen).add(n)
      let condition = true
      for (let p = n.parent, child = n; p; child = p, p = p.parent) {
        if (p.type === 'ConditionalExpression' && child !== p.test)
          condition = and(
            condition,
            child === p.consequent ? formula(p.test) : not(formula(p.test)),
          )
        if (p.type === 'LogicalExpression' && child === p.right && p.operator !== '??')
          condition = and(condition, p.operator === '&&' ? formula(p.left) : not(formula(p.left)))
        if (p.type === 'IfStatement' && child !== p.test)
          condition = and(
            condition,
            child === p.consequent ? formula(p.test) : not(formula(p.test)),
          )
        if (p.type === 'BlockStatement')
          for (const before of p.body) {
            if (before === child) break
            if (
              before.type === 'IfStatement' &&
              terminates(before.consequent) &&
              !terminates(before.alternate)
            )
              condition = and(condition, not(formula(before.test)))
          }
        if (
          isFunction(p) &&
          !(p.parent?.type === 'CallExpression' && p.parent.arguments.includes(p))
        ) {
          const binding = variable(
            p.type === 'FunctionDeclaration'
              ? p.id
              : p.parent?.type === 'VariableDeclarator'
                ? p.parent.id
                : null,
          )
          const refs =
            binding?.references.filter(
              (r) => r.identifier !== binding.defs[0]?.name && runtimeReference(r),
            ) ?? []
          if (
            owner(p) &&
            refs.length &&
            refs.every(
              (r) =>
                r.identifier.parent.type === 'CallExpression' &&
                r.identifier.parent.callee === r.identifier,
            )
          )
            condition = and(
              condition,
              refs.map((r) => mounted(r.identifier.parent, next)).reduce(or, false),
            )
          break
        }
      }
      return condition
    }
    const attribute = (n, name) => {
      for (const a of n.attributes.toReversed()) {
        if (a.type === 'JSXSpreadAttribute') return null
        if (a.name?.name === name)
          return a.value?.type === 'JSXExpressionContainer'
            ? a.value.expression
            : (a.value ?? { type: 'Literal', value: true })
      }
      return null
    }
    const takesDisabled = (n) =>
      n.name.type !== 'JSXIdentifier' ||
      /^[A-Z]/.test(n.name.name) ||
      ['button', 'input', 'select', 'textarea', 'fieldset', 'option', 'optgroup'].includes(
        n.name.name,
      )
    const ariaDisabled = (n) => {
      if (takesDisabled(n)) return false
      const role =
        attribute(n, 'role')?.value ??
        (n.name.name === 'a' && attribute(n, 'href') ? 'link' : n.name.name === 'tr' ? 'row' : null)
      if (
        ![
          'button',
          'checkbox',
          'combobox',
          'grid',
          'gridcell',
          'group',
          'link',
          'listbox',
          'menuitem',
          'option',
          'radio',
          'row',
          'slider',
          'spinbutton',
          'switch',
          'tab',
          'textbox',
          'treeitem',
          'application',
        ].includes(role)
      )
        return false
      const aria = (value, seen = new Set()) => {
        if (!value || seen.has(value)) return false
        const next = new Set(seen).add(value)
        if (value.type === 'Literal') return value.value === true || value.value === 'true'
        if (value.type === 'ConditionalExpression')
          return or(
            and(formula(value.test), aria(value.consequent, next)),
            and(not(formula(value.test)), aria(value.alternate, next)),
          )
        const alias = init(value)
        return alias ? aria(alias, next) : formula(value)
      }
      return aria(attribute(n, 'aria-disabled'))
    }
    const enabled = (n) => {
      let result = not(ariaDisabled(n))
      for (let p = n; p; p = p.parent) {
        if (p.type !== 'JSXOpeningElement') continue
        if (p !== n && p.name.name !== 'fieldset') continue
        if (takesDisabled(p))
          result = and(
            result,
            not(formula(attribute(p, 'disabled') ?? { type: 'Literal', value: false })),
          )
      }
      for (let p = n.parent?.parent; p; p = p.parent)
        if (p.type === 'JSXElement' && p.openingElement.name.name === 'fieldset') {
          const legend = p.children.find(
            (c) => c.type === 'JSXElement' && c.openingElement.name.name === 'legend',
          )
          if (!contains(legend, n))
            result = and(
              result,
              not(
                formula(
                  attribute(p.openingElement, 'disabled') ?? { type: 'Literal', value: false },
                ),
              ),
            )
        }
      return result
    }
    const submitters = (opening) => {
      const found = []
      const id = attribute(opening, 'id')?.value
      for (const root of [
        opening.parent,
        ...controls.filter((c) => id && attribute(c, 'form')?.value === id),
      ])
        walk(root, (n) => {
          if (
            n.type !== 'JSXOpeningElement' ||
            (!['button', 'input'].includes(n.name.name) &&
              !(attribute(n, 'disabled') && attribute(n, 'type')?.value === 'submit'))
          )
            return
          let form = n.parent.parent
          while (form && !(form.type === 'JSXElement' && form.openingElement.name.name === 'form'))
            form = form.parent
          const target = attribute(n, 'form')
          if (target ? !(id && target.value === id) : form !== opening.parent) return
          const type = attribute(n, 'type'),
            name = n.name.name
          const canSubmit = (t) =>
            init(t)
              ? canSubmit(init(t))
              : !t
                ? name === 'button'
                : t.type === 'Literal'
                  ? name === 'input'
                    ? ['submit', 'image'].includes(t.value)
                    : !['button', 'reset'].includes(t.value)
                  : t.type === 'ConditionalExpression'
                    ? canSubmit(t.consequent) || canSubmit(t.alternate)
                    : true
          if (canSubmit(type)) found.push(n)
        })
      return found
    }
    return {
      JSXOpeningElement(n) {
        controls.push(n)
      },
      'Program:exit'() {
        if (!controls.length) return
        for (const scope of source.scopeManager.scopes)
          for (const binding of scope.variables) {
            const fn = fnFor(binding.identifiers[0])
            if (!fn || !owner(fn)) continue
            const refs = binding.references.filter((r) => !r.init && runtimeReference(r))
            if (
              !refs.length ||
              refs.some(
                (r) =>
                  r.identifier.parent.type !== 'CallExpression' ||
                  r.identifier.parent.callee !== r.identifier,
              )
            )
              continue
            for (const [i, param] of fn.params.entries())
              if (param.type === 'Identifier') {
                const args = refs.map((r) => r.identifier.parent.arguments[i])
                if (args.every((a) => a && key(a) === key(args[0])))
                  argumentsFor.set(variable(param), args[0])
              }
          }
        for (const control of controls)
          for (const attr of control.attributes) {
            const native = control.name.type === 'JSXIdentifier' && /^[a-z]/.test(control.name.name)
            if (!native && !attribute(control, 'disabled')) continue
            if (
              attr.type !== 'JSXAttribute' ||
              !/^on[A-Z]/.test(attr.name.name) ||
              (!ACTIVATION.test(attr.name.name) && !attribute(control, 'disabled')) ||
              attribute(control, attr.name.name) !== attr.value?.expression
            )
              continue
            const mount = mounted(control),
              form = attr.name.name === 'onSubmit' && control.name.name === 'form'
            let availability = and(mount, enabled(control))
            if (/^onKey/.test(attr.name.name) && attribute(control, 'role'))
              availability = and(availability, formula(attribute(control, 'role')))
            if (form) {
              const buttons = submitters(control)
              if (buttons.length)
                availability = and(
                  mount,
                  or(
                    buttons.map((b) => and(mounted(b), enabled(b))).reduce(or, false),
                    and(
                      not(buttons.map((b) => mounted(b)).reduce(or, false)),
                      controls
                        .filter(
                          (n) =>
                            n.name.name === 'input' &&
                            contains(control.parent, n) &&
                            ![
                              'button',
                              'submit',
                              'reset',
                              'image',
                              'hidden',
                              'checkbox',
                              'radio',
                              'file',
                              'color',
                              'range',
                            ].includes(attribute(n, 'type')?.value),
                        )
                        .map((n) => and(mounted(n), enabled(n)))
                        .reduce(or, false),
                    ),
                  ),
                )
            }
            if (form) {
              const children = control.parent.children.filter(
                (c) => c.type !== 'JSXText' || c.value.trim(),
              )
              const group =
                children.length === 1 &&
                children[0].type === 'JSXElement' &&
                children[0].openingElement.name.name === 'fieldset'
                  ? children[0]
                  : null
              if (
                group &&
                !group.children.some(
                  (c) => c.type === 'JSXElement' && c.openingElement.name.name === 'legend',
                )
              )
                availability = and(
                  availability,
                  not(
                    formula(
                      attribute(group.openingElement, 'disabled') ?? {
                        type: 'Literal',
                        value: false,
                      },
                    ),
                  ),
                )
            }
            let reported = false
            handlers: for (const { fn, condition } of selection(attr.value.expression))
              for (const path of guardPaths(fn)) {
                if (control.name.name === 'a' && attribute(control, 'href') && !path.prevented)
                  continue
                if (!possible(and(availability, and(condition, path.condition)))) continue
                const conditionText = path.label
                const fix =
                  takesDisabled(control) || form
                    ? `Add disabled={${conditionText}} to ${form ? 'each submit button' : 'this control'}, or unmount it on that condition.`
                    : `Unmount this control while ${conditionText}.`
                context.report({
                  node: control,
                  messageId: 'droppedAction',
                  data: { fix, condition: conditionText },
                })
                reported = true
                break handlers
              }
            if (reported) break
          }
      },
    }
  },
}
