/**
 * Demo seed for api-documentation.
 *
 * Seeding runs in two layers:
 *
 * 1. **Globals** (`seedGlobalsIfEmpty`) — error reference, SDKs, services
 *    (status-page entries), and a small public changelog. Idempotent on
 *    each table independently. Called once at server boot.
 *
 * 2. **Per-user** (`seedDemoForUser`) — one demo OpenAPI spec, ~14
 *    representative endpoints associated with that spec, and a few
 *    welcome notifications so a freshly-signed-up developer lands on
 *    /docs and immediately sees a populated API surface to explore.
 *    Idempotent on user_id (returns early if any api_specs row already
 *    exists for the user).
 *
 * @module
 */

import { count, create, findMany } from '@molecule/api-database'

const API_ERRORS = [
  {
    status: 400,
    code: 'bad_request',
    description: 'The request was malformed — check required fields and types.',
    troubleshooting:
      'Inspect the response body for a `details` array listing each invalid field. Re-check your JSON against the schema.',
    example_response: {
      error: 'bad_request',
      details: [{ field: 'amount_cents', message: 'must be a positive integer' }],
    },
  },
  {
    status: 401,
    code: 'unauthenticated',
    description: 'Missing or invalid bearer token. Sign requests with a live key.',
    troubleshooting:
      'Ensure the `Authorization: Bearer <key>` header is present. Verify the key is not revoked and matches the environment (test vs. live).',
    example_response: { error: 'unauthenticated', message: 'Bearer token missing.' },
  },
  {
    status: 403,
    code: 'forbidden',
    description: 'The bearer is valid but lacks scope for this resource.',
    troubleshooting:
      'Check the key’s scopes. Generate a new key with the required scope (e.g. `transactions.write`) from the dashboard.',
    example_response: { error: 'forbidden', message: 'Token lacks scope `transactions.write`.' },
  },
  {
    status: 404,
    code: 'not_found',
    description: 'The requested resource does not exist or is not visible to this account.',
    troubleshooting:
      'Confirm the id is correct AND that it belongs to your workspace. Cross-account ids return 404 by design.',
    example_response: { error: 'not_found', message: 'Account `acc_8w2j` not found.' },
  },
  {
    status: 409,
    code: 'conflict',
    description: 'A conflicting record already exists (e.g. duplicate idempotency key).',
    troubleshooting:
      'Use the existing resource id from the response, or generate a new idempotency key.',
    example_response: {
      error: 'conflict',
      message: 'A transaction with idempotency_key `req_123` already exists.',
      existing_id: 'txn_abc',
    },
  },
  {
    status: 422,
    code: 'unprocessable_entity',
    description: 'The request was valid JSON but failed business validation.',
    troubleshooting:
      'The `details` array indicates the failing rule. Examples: insufficient balance, invalid currency, or webhook URL not HTTPS.',
    example_response: {
      error: 'unprocessable_entity',
      details: [
        {
          rule: 'insufficient_balance',
          message: 'Account has 1000 cents, transfer requires 5000.',
        },
      ],
    },
  },
  {
    status: 429,
    code: 'rate_limited',
    description: 'You have exceeded the request budget for this key.',
    troubleshooting:
      'Inspect `Retry-After` header for the recommended sleep. Implement exponential backoff. Contact support to raise limits.',
    example_response: {
      error: 'rate_limited',
      message: 'Rate limit of 100 req/s exceeded.',
      retry_after_seconds: 4,
    },
  },
  {
    status: 500,
    code: 'internal_server_error',
    description: 'Something went wrong on our side. The request was not processed.',
    troubleshooting:
      'These should be rare. Capture the `request_id` in your logs. Retry with the same idempotency key. If persistent, contact support.',
    example_response: { error: 'internal_server_error', request_id: 'req_8f3xz9' },
  },
  {
    status: 502,
    code: 'upstream_failure',
    description: 'A downstream provider (bank rail, payment processor, etc.) returned an error.',
    troubleshooting:
      'Treat as retryable. The `provider_error` field contains the original error code from the upstream system.',
    example_response: {
      error: 'upstream_failure',
      provider: 'ach',
      provider_error: 'TIMEOUT',
      request_id: 'req_xq22',
    },
  },
  {
    status: 503,
    code: 'service_unavailable',
    description: 'The API is temporarily refusing requests (planned maintenance or rate gate).',
    troubleshooting:
      'Check status.prism.dev for incidents. Implement backoff with `Retry-After`. Most 503s clear within 60s.',
    example_response: {
      error: 'service_unavailable',
      message: 'Scheduled maintenance until 2026-05-12T03:30Z.',
      retry_after_seconds: 30,
    },
  },
] as const

const SDKS = [
  {
    language: 'JavaScript / TypeScript',
    package_name: '@prism/sdk',
    version: '4.2.1',
    install_command: 'npm install @prism/sdk',
    github_url: 'https://github.com/prism/prism-node',
    example:
      "import Prism from '@prism/sdk'\nconst prism = new Prism({ apiKey: process.env.PRISM_KEY })\nconst accounts = await prism.accounts.list({ limit: 25 })",
  },
  {
    language: 'Python',
    package_name: 'prism-sdk',
    version: '4.2.0',
    install_command: 'pip install prism-sdk',
    github_url: 'https://github.com/prism/prism-python',
    example:
      "import prism\nclient = prism.Client(api_key=os.environ['PRISM_KEY'])\naccounts = client.accounts.list(limit=25)",
  },
  {
    language: 'Go',
    package_name: 'github.com/prism/prism-go',
    version: '4.1.5',
    install_command: 'go get github.com/prism/prism-go',
    github_url: 'https://github.com/prism/prism-go',
    example:
      'client := prism.New(os.Getenv("PRISM_KEY"))\naccounts, err := client.Accounts.List(ctx, &prism.AccountListParams{Limit: prism.Int(25)})',
  },
  {
    language: 'Ruby',
    package_name: 'prism-sdk',
    version: '4.0.7',
    install_command: 'gem install prism-sdk',
    github_url: 'https://github.com/prism/prism-ruby',
    example: "Prism.api_key = ENV['PRISM_KEY']\naccounts = Prism::Account.list(limit: 25)",
  },
  {
    language: 'PHP',
    package_name: 'prism/prism-php',
    version: '3.9.4',
    install_command: 'composer require prism/prism-php',
    github_url: 'https://github.com/prism/prism-php',
    example:
      "$prism = new \\Prism\\Client($_ENV['PRISM_KEY']);\n$accounts = $prism->accounts->list(['limit' => 25]);",
  },
  {
    language: 'Java',
    package_name: 'dev.prism:prism-java',
    version: '3.7.2',
    install_command: 'implementation "dev.prism:prism-java:3.7.2"',
    github_url: 'https://github.com/prism/prism-java',
    example:
      'Prism prism = Prism.builder().apiKey(System.getenv("PRISM_KEY")).build();\nAccountList accounts = prism.accounts().list(AccountListParams.builder().limit(25L).build());',
  },
] as const

const SERVICES = [
  {
    name: 'REST API',
    status: 'operational',
    description: 'Core REST endpoints (/v3/*)',
    url: 'https://api.prism.dev',
  },
  {
    name: 'Webhooks',
    status: 'operational',
    description: 'Outbound event delivery',
    url: 'https://api.prism.dev/webhooks',
  },
  {
    name: 'Dashboard',
    status: 'operational',
    description: 'app.prism.dev developer console',
    url: 'https://app.prism.dev',
  },
  {
    name: 'OAuth & Auth',
    status: 'operational',
    description: 'Token issuance, key rotation, OAuth 2.0',
    url: 'https://auth.prism.dev',
  },
  {
    name: 'Search & Indexing',
    status: 'operational',
    description: 'Endpoint and changelog search',
    url: 'https://api.prism.dev/search',
  },
  {
    name: 'Real-time SSE',
    status: 'operational',
    description: '/v3/events live stream (beta)',
    url: 'https://api.prism.dev/v3/events',
  },
] as const

const CHANGELOG = [
  {
    version: '3.2.0',
    released_at: new Date(Date.now() - 3 * 86_400_000),
    entries: [
      {
        kind: 'added',
        text: 'New `POST /v3/transactions/bulk` endpoint accepting up to 1,000 transactions per call.',
      },
      { kind: 'added', text: 'Cursor-based pagination on `/v3/webhooks` (was offset-based).' },
      {
        kind: 'changed',
        text: '`/v3/accounts` response now includes `available_balance_cents` separately from `balance_cents`.',
      },
      {
        kind: 'fixed',
        text: 'Idempotency keys older than 24h were occasionally re-played; now strictly one-shot for the full TTL.',
      },
    ],
  },
  {
    version: '3.1.4',
    released_at: new Date(Date.now() - 18 * 86_400_000),
    entries: [
      {
        kind: 'fixed',
        text: 'Webhook signature verification rejected payloads ending in newline; now whitespace-tolerant.',
      },
      {
        kind: 'changed',
        text: 'Rate limit headers (`X-RateLimit-Remaining`) are now present on all 4xx responses, not only 429.',
      },
    ],
  },
  {
    version: '3.1.0',
    released_at: new Date(Date.now() - 45 * 86_400_000),
    entries: [
      { kind: 'added', text: 'Real-time `/v3/events` SSE stream (invite-only beta).' },
      { kind: 'added', text: 'Optional `metadata` object on every write endpoint (16 KB max).' },
      {
        kind: 'deprecated',
        text: '`legacy_id` field on `/v3/accounts` — switch to `id`. Removal scheduled for 4.0.0.',
      },
    ],
  },
  {
    version: '3.0.0',
    released_at: new Date(Date.now() - 90 * 86_400_000),
    entries: [
      { kind: 'added', text: 'OAuth 2.0 with PKCE for public clients.' },
      {
        kind: 'changed',
        text: 'All amounts are now `_cents` integers — `_dollars` floats are removed in this major.',
      },
      { kind: 'removed', text: 'XML response format. JSON only going forward.' },
    ],
  },
] as const

const DEMO_ENDPOINTS = [
  {
    method: 'GET',
    path: '/v3/accounts',
    tag: 'Accounts',
    resource: 'accounts',
    summary: 'List accounts',
    description:
      'Return all accounts visible to the bearer, ordered by `created_at` descending. Cursor-paginated.',
  },
  {
    method: 'GET',
    path: '/v3/accounts/{id}',
    tag: 'Accounts',
    resource: 'accounts',
    summary: 'Retrieve an account',
    description:
      'Fetch a single account by id. Returns 404 if the account is not visible to the bearer.',
  },
  {
    method: 'POST',
    path: '/v3/accounts',
    tag: 'Accounts',
    resource: 'accounts',
    summary: 'Create an account',
    description: 'Open a new account in the specified currency. Requires `accounts.write` scope.',
  },
  {
    method: 'PATCH',
    path: '/v3/accounts/{id}',
    tag: 'Accounts',
    resource: 'accounts',
    summary: 'Update an account',
    description:
      'Partially update an account. Only `name`, `metadata`, and `status` may be patched.',
  },
  {
    method: 'DELETE',
    path: '/v3/accounts/{id}',
    tag: 'Accounts',
    resource: 'accounts',
    summary: 'Close an account',
    description: 'Close an account. Cannot be reopened. Requires zero balance.',
  },
  {
    method: 'GET',
    path: '/v3/transactions',
    tag: 'Transactions',
    resource: 'transactions',
    summary: 'List transactions',
    description:
      'Return transactions across all accounts, filterable by `account_id`, date range, and status.',
  },
  {
    method: 'POST',
    path: '/v3/transactions',
    tag: 'Transactions',
    resource: 'transactions',
    summary: 'Create a transaction',
    description: 'Move funds between accounts. Pass an `idempotency_key` header to safely retry.',
  },
  {
    method: 'GET',
    path: '/v3/transactions/{id}',
    tag: 'Transactions',
    resource: 'transactions',
    summary: 'Retrieve a transaction',
    description: 'Fetch a single transaction including its `state_history`.',
  },
  {
    method: 'POST',
    path: '/v3/transactions/{id}/cancel',
    tag: 'Transactions',
    resource: 'transactions',
    summary: 'Cancel a pending transaction',
    description: 'Cancel a transaction that has not yet settled. Returns 409 if already settled.',
  },
  {
    method: 'GET',
    path: '/v3/webhooks',
    tag: 'Webhooks',
    resource: 'webhooks',
    summary: 'List webhook endpoints',
    description: 'Return all webhook endpoints registered for this workspace.',
  },
  {
    method: 'POST',
    path: '/v3/webhooks',
    tag: 'Webhooks',
    resource: 'webhooks',
    summary: 'Register a webhook endpoint',
    description:
      'Register a new HTTPS endpoint to receive events. Returns the signing secret exactly once.',
  },
  {
    method: 'PUT',
    path: '/v3/webhooks/{id}',
    tag: 'Webhooks',
    resource: 'webhooks',
    summary: 'Update a webhook endpoint',
    description: 'Update the URL or subscribed event types of an existing webhook.',
  },
  {
    method: 'DELETE',
    path: '/v3/webhooks/{id}',
    tag: 'Webhooks',
    resource: 'webhooks',
    summary: 'Remove a webhook endpoint',
    description: 'Permanently delete a webhook endpoint. Stops further event delivery.',
  },
  {
    method: 'GET',
    path: '/v3/events',
    tag: 'Events',
    resource: 'events',
    summary: 'Stream events (SSE)',
    description: 'Server-sent events stream. Resume from `Last-Event-Id` after reconnect.',
    deprecated: false,
  },
] as const

/**
 * Seed reference content (api_errors, sdks, services, public changelog)
 * if any of those tables are empty. Each table is independently
 * idempotent: re-running with one populated table will skip that one
 * but still seed the others.
 */
export async function seedGlobalsIfEmpty(): Promise<{
  errorsCreated: number
  sdksCreated: number
  servicesCreated: number
  changelogCreated: number
}> {
  let errorsCreated = 0
  if ((await count('api_errors', [])) === 0) {
    for (const e of API_ERRORS) {
      await create('api_errors', {
        code: e.code,
        status: e.status,
        description: e.description,
        troubleshooting: e.troubleshooting,
        example_response: JSON.stringify(e.example_response),
        created_at: new Date(),
      })
      errorsCreated++
    }
  }

  let sdksCreated = 0
  if ((await count('sdks', [])) === 0) {
    for (const s of SDKS) {
      await create('sdks', {
        language: s.language,
        package_name: s.package_name,
        version: s.version,
        install_command: s.install_command,
        github_url: s.github_url,
        example: s.example,
        created_at: new Date(),
      })
      sdksCreated++
    }
  }

  let servicesCreated = 0
  if ((await count('services', [])) === 0) {
    for (const s of SERVICES) {
      await create('services', {
        name: s.name,
        status: s.status,
        description: s.description,
        url: s.url,
        created_at: new Date(),
        updated_at: new Date(),
      })
      servicesCreated++
    }
  }

  let changelogCreated = 0
  if ((await count('changelog', [])) === 0) {
    for (const c of CHANGELOG) {
      await create('changelog', {
        user_id: null,
        spec_id: null,
        version: c.version,
        released_at: c.released_at,
        entries: JSON.stringify(c.entries),
        is_public: true,
        created_at: new Date(),
      })
      changelogCreated++
    }
  }

  return { errorsCreated, sdksCreated, servicesCreated, changelogCreated }
}

/**
 * Seed a freshly signed-up developer with a demo OpenAPI spec, a
 * representative set of endpoints under that spec, and welcome
 * notifications. Idempotent on user_id: returns early if the user
 * already has any api_specs row.
 */
export async function seedDemoForUser(userId: string): Promise<{
  specsCreated: number
  endpointsCreated: number
  notificationsCreated: number
}> {
  if (!userId) return { specsCreated: 0, endpointsCreated: 0, notificationsCreated: 0 }
  const existing = await findMany('api_specs', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  if (existing.length > 0) {
    return { specsCreated: 0, endpointsCreated: 0, notificationsCreated: 0 }
  }

  const specRow = await create<Record<string, unknown>>('api_specs', {
    user_id: userId,
    project_id: null,
    title: 'Prism Banking API',
    name: 'banking-api',
    version: '3.2.0',
    description:
      'Demo OpenAPI spec describing accounts, transactions, and webhooks. This is sample content scaffolded into your workspace — replace with your own spec.',
    spec_content: null,
    openapi_json: null,
    base_url: 'https://api.prism.dev',
    is_public: false,
    is_published: true,
    created_at: new Date(),
    updated_at: new Date(),
  })
  const spec = (specRow.data ?? specRow) as Record<string, unknown>
  const specId = String(spec.id)

  let endpointsCreated = 0
  for (const e of DEMO_ENDPOINTS) {
    const url = `https://api.prism.dev${e.path.replace('{id}', 'acc_8w2j')}`
    const isWrite = e.method === 'POST' || e.method === 'PUT' || e.method === 'PATCH'
    const lowerMethod = e.method.toLowerCase()
    const sdkSection = e.path.includes('accounts')
      ? 'accounts'
      : e.path.includes('transactions')
        ? 'transactions'
        : e.path.includes('webhooks')
          ? 'webhooks'
          : 'events'
    const sdkCallVerb =
      e.method === 'GET'
        ? e.path.includes('{id}')
          ? 'retrieve'
          : 'list'
        : e.method === 'DELETE'
          ? 'delete'
          : lowerMethod
    const idArg = e.path.includes('{id}') ? "'acc_8w2j'" : ''

    const parameters = e.path.includes('{id}')
      ? [
          {
            name: 'id',
            location: 'path',
            type: 'string',
            required: true,
            description: 'Resource identifier (e.g. acc_8w2j).',
          },
        ]
      : e.method === 'GET' && e.path === '/v3/accounts'
        ? [
            {
              name: 'limit',
              location: 'query',
              type: 'integer',
              required: false,
              description: 'Maximum rows to return (1–100, default 25).',
            },
            {
              name: 'cursor',
              location: 'query',
              type: 'string',
              required: false,
              description: 'Opaque cursor returned in the previous response.',
            },
          ]
        : []
    const successBody =
      e.method === 'DELETE'
        ? ''
        : JSON.stringify(
            { data: { id: 'acc_8w2j', currency: 'USD', balance_cents: 142090, status: 'active' } },
            null,
            2,
          )
    const responses = [
      {
        status: e.method === 'POST' ? 201 : e.method === 'DELETE' ? 204 : 200,
        description: 'Successful response',
        body: successBody,
      },
      {
        status: 401,
        description: 'Missing or invalid bearer token',
        body: JSON.stringify({ error: 'unauthenticated' }, null, 2),
      },
      {
        status: 404,
        description: 'Resource not found or not visible to caller',
        body: JSON.stringify({ error: 'not_found' }, null, 2),
      },
    ]
    const samples = [
      {
        language: 'curl',
        code: `curl${isWrite ? ' -X ' + e.method : ''} -H "Authorization: Bearer prsm_***"${isWrite ? ' -H "Content-Type: application/json" -d \'{"name":"My account","currency":"USD"}\'' : ''} ${url}`,
      },
      {
        language: 'node',
        code: `import Prism from '@prism/sdk'\nconst prism = new Prism({ apiKey: process.env.PRISM_KEY })\nconst result = await prism.${sdkSection}.${sdkCallVerb}(${idArg})\nconsole.log(result)`,
      },
      {
        language: 'python',
        code: `import prism\nclient = prism.Client(api_key=os.environ['PRISM_KEY'])\nresult = client.${sdkSection}.${sdkCallVerb}(${idArg})\nprint(result)`,
      },
      {
        language: 'go',
        code: `client := prism.New(os.Getenv("PRISM_KEY"))\nresult, err := client.${sdkSection.charAt(0).toUpperCase() + sdkSection.slice(1)}.${sdkCallVerb.charAt(0).toUpperCase() + sdkCallVerb.slice(1)}(ctx${idArg ? ', "acc_8w2j"' : ''})`,
      },
      {
        language: 'ruby',
        code: `Prism.api_key = ENV['PRISM_KEY']\nresult = Prism::${sdkSection.charAt(0).toUpperCase() + sdkSection.slice(1, -1)}.${sdkCallVerb}(${idArg})`,
      },
      {
        language: 'php',
        code: `$prism = new \\Prism\\Client($_ENV['PRISM_KEY']);\n$result = $prism->${sdkSection}->${sdkCallVerb}(${idArg});`,
      },
    ]
    await create('api_endpoints', {
      spec_id: specId,
      user_id: userId,
      method: e.method,
      path: e.path,
      tag: e.tag,
      summary: e.summary,
      description: e.description,
      parameters: JSON.stringify(parameters),
      responses: JSON.stringify(responses),
      samples: JSON.stringify(samples),
      deprecated: false,
      resource: e.resource,
      created_at: new Date(),
      updated_at: new Date(),
    })
    endpointsCreated++
  }

  const notifications = [
    {
      type: 'welcome',
      title: 'Welcome to Prism',
      body: 'Your developer workspace is ready. Browse the demo endpoints, try the playground, and create your first key from Settings.',
      href: '/settings/api-keys',
      created_at: new Date(),
    },
    {
      type: 'release',
      title: 'API v3.2.0 released',
      body: 'New bulk-transaction endpoint plus available_balance_cents on accounts. See the changelog.',
      href: '/docs/changelog',
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    {
      type: 'tip',
      title: 'Tip: try the playground',
      body: 'Hit any endpoint with your bearer token from the in-browser console — no SDK install required.',
      href: '/playground',
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
  ]

  let notificationsCreated = 0
  for (const n of notifications) {
    await create('notifications', {
      user_id: userId,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      unread: true,
      created_at: n.created_at,
    })
    notificationsCreated++
  }

  return { specsCreated: 1, endpointsCreated, notificationsCreated }
}
