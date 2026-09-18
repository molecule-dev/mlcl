---
name: testing
description: Testing patterns for molecule packages. Vitest setup, mock factories, bond mocking, fixture creation, handler testing, and common anti-patterns.
---

# Testing Patterns

## Test Framework

All molecule packages use **vitest** (version 4.0.18). The testing infrastructure package is `@molecule/api-testing`, which provides mock factories, pre-configured singletons, helpers, and fixtures.

---

## Test File Structure and Naming

- Test files live in `src/__tests__/` within each package.
- Files are named `*.test.ts`.
- Use `describe`/`it` blocks to organize tests.
- Each test file imports from the package's own source using relative imports.

```
packages/api/bonds/emails/sendgrid/
  src/
    __tests__/
      provider.test.ts
    provider.ts
    types.ts
    index.ts
```

---

## Vitest Configuration

Each package has its own `vitest.config.ts`:

```typescript
// vitest.config.ts (per-package)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
```

For the workspace root, use `defineProjects()` from `vitest/config` with an array of glob patterns pointing to each package's `vitest.config.ts`.

---

## Mock Infrastructure

### Singletons vs Factories

`@molecule/api-testing` provides two ways to get mocks:

| Approach                                                                                                                    | When to Use                                                                                |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Singletons** (`mockDatabase`, `mockCache`, `mockQueue`, `mockEmail`, `mockLogger`)                                        | Simple tests where one mock instance is sufficient.                                        |
| **Factories** (`createMockDatabase()`, `createMockCache()`, `createMockQueue()`, `createMockEmail()`, `createMockLogger()`) | Tests that need isolated instances, e.g., testing interactions between multiple databases. |

**Rule:** ALWAYS call `.reset()` in `beforeEach` or `afterEach` to prevent state leaking between tests.

---

## Bond Mocking Pattern

This is the critical pattern for testing anything that depends on a bonded provider. Bond in setup, unbond in teardown, reset the mock between tests.

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { bond, unbond } from '@molecule/api-bond'
import { createMockEmail } from '@molecule/api-testing'

const mockEmail = createMockEmail()

beforeEach(() => {
  bond('email', mockEmail)
})

afterEach(() => {
  unbond('email')
  mockEmail.reset()
})

describe('email notifications', () => {
  it('sends a welcome email', async () => {
    await sendWelcomeEmail('user@example.com')

    expect(mockEmail.sent).toHaveLength(1)
    expect(mockEmail.sent[0].to).toBe('user@example.com')
  })
})
```

**Why this matters:** If you forget `unbond('email')` in `afterEach`, the bonded mock leaks into subsequent test files, causing unpredictable failures. Always pair `bond` with `unbond`.

---

## Handler Testing Pattern

Handlers interact with the database through abstract DataStore methods. Mock the database, bond it, set expected query results, then assert against the recorded queries.

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createMockDatabase } from '@molecule/api-testing'
import { bond, unbond } from '@molecule/api-bond'

const db = createMockDatabase()

beforeEach(() => {
  bond('database', db)
  db.reset()
})

afterEach(() => {
  unbond('database')
})

describe('createUserHandler', () => {
  it('creates a user', async () => {
    db.setQueryResult({ rows: [{ id: '123', email: 'test@test.com' }], rowCount: 1 })

    const result = await createUserHandler(req, res)

    expect(db.queries).toHaveLength(1)
    expect(db.queries[0].text).toContain('INSERT')
  })
})
```

---

## Provider Testing Pattern (Dynamic Imports)

When testing provider packages (bond implementations), use dynamic imports with `vi.resetModules()` to ensure clean module state between tests:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() }

describe('Stripe Provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123')
    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('logger')
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('creates a checkout session', async () => {
    const { createCheckoutSession } = await import('../provider.js')
    const session = await createCheckoutSession({ priceId: 'price_123' })
    expect(session.id).toBeDefined()
  })
})
```

**When to use this pattern:** Provider packages that read env vars at module scope or establish connections on import. `vi.resetModules()` clears the module cache so each test gets a fresh module.

---

## Fixtures

Use fixtures to generate realistic test data. Override only the fields relevant to your test; let the fixture provide sensible defaults for everything else.

```typescript
import {
  createUserFixture,
  createDeviceFixture,
  createSessionFixture,
  createMany,
} from '@molecule/api-testing'

// Single fixture with overrides
const user = createUserFixture({ email: 'custom@test.com' })

// Multiple fixtures
const users = createMany((i) => createUserFixture({ name: `User ${i}` }), 10)

// Composed fixtures
const device = createDeviceFixture({ userId: user.id })
const session = createSessionFixture({ userId: user.id, deviceId: device.id })
```

---

## Async Testing Patterns

`@molecule/api-testing` provides helpers for common async scenarios. Never use raw `setTimeout` for timing in tests.

### wait

Pause execution for a fixed duration:

```typescript
import { wait } from '@molecule/api-testing'

await wait(100) // waits 100ms
```

### waitFor

Poll until a condition is true, with configurable timeout and interval:

```typescript
import { waitFor } from '@molecule/api-testing'

await waitFor(() => cache.has('key'), { timeout: 5000, interval: 100 })
```

### createDeferred

Create a promise you can resolve or reject externally:

```typescript
import { createDeferred } from '@molecule/api-testing'

const deferred = createDeferred<string>()
setTimeout(() => deferred.resolve('done'), 100)
const result = await deferred.promise
```

### expectThrows

Assert that an async function throws a specific error type:

```typescript
import { expectThrows } from '@molecule/api-testing'

await expectThrows(() => requireBondedProvider(), Error)
```

### createSpy

Create a spy function for tracking calls:

```typescript
import { createSpy } from '@molecule/api-testing'

const spy = createSpy()
emitter.on('event', spy)
emitter.emit('event', 'data')
expect(spy.calls).toHaveLength(1)
```

### Random Generators

Generate unique test values to avoid collisions:

```typescript
import { randomString, randomEmail, randomUUID } from '@molecule/api-testing'

const name = randomString() // e.g., 'xk9m2pq7'
const email = randomEmail() // e.g., 'test-xk9m2pq7@test.com'
const id = randomUUID() // e.g., '550e8400-e29b-41d4-a716-446655440000'
```

---

## Parallel Test Operations

When writing or fixing tests across multiple packages, use parallel subagents — one per package. Each package's test suite is independent and can be worked on simultaneously.

## Testing i18n-Dependent Components

When testing components or handlers that use `t()` for translations, either mock `t()` to return the key as-is, or register English translations from the locale bond:

```typescript
import { en } from '@molecule/app-locales-forms'
// Register English translations so t() returns real values
provider.addTranslations('en', en)
```

## Anti-Patterns

These are common mistakes. Never do any of the following:

| Anti-Pattern                           | Why It Fails                                                 | Do This Instead                                            |
| -------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| Testing with real database connections | Slow, flaky, requires infrastructure, leaks state            | Use `createMockDatabase()`                                 |
| Forgetting `unbond` after `bond`       | Mock leaks into other test files, causing cascading failures | Always `unbond` in `afterEach`                             |
| Forgetting `.reset()` on mocks         | State from previous test pollutes the next test              | Call `.reset()` in `beforeEach` or `afterEach`             |
| Hardcoding test data inline            | Brittle, verbose, hard to maintain                           | Use fixtures with overrides (`createUserFixture({ ... })`) |
| Using `setTimeout` for timing          | Unreliable, slow, race-prone                                 | Use `wait()` or `waitFor()` from `@molecule/api-testing`   |
| Importing from `node_modules` paths    | Breaks when dependencies change                              | Import from package names (`@molecule/api-testing`)        |
| Testing implementation details         | Breaks on refactor even when behavior is unchanged           | Test observable behavior (inputs/outputs, side effects)    |
