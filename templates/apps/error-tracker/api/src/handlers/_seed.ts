/**
 * Per-user demo seeding for error-tracker.
 *
 * On a freshly-signed-up account this writes:
 *   - 2 demo projects (web app + api)
 *   - 5 demo issues with realistic titles + culprits + frames + frequency
 *   - 4 error_events per issue (so IssueDetail has a real event list)
 *   - 4 releases (one tagged with a regression / health labels)
 *   - 3 alert rules (active, paused, slack-targeted)
 *   - 4 notifications (assignment, mention, regression, alert)
 *   - 4 team_members (so /team isn't empty)
 *   - 60 app_transactions (so /performance has p95 / throughput data)
 *
 * The seed is idempotent: it checks for existing rows before inserting
 * and is safe to call multiple times.
 *
 * @module
 */

import crypto from 'node:crypto'

import { count, create, findMany } from '@molecule/api-database'

interface IssueSeed {
  fingerprint: string
  title: string
  exception_type: string
  exception_value: string
  culprit: string
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal'
  status: 'unresolved' | 'resolved' | 'ignored'
  is_regression: boolean
  event_count: number
  user_count: number
  first_offset_minutes: number
  last_offset_minutes: number
  release_index: number
  environment: 'production' | 'staging'
  frames: Array<{
    kind: 'app' | 'vendor'
    filename: string
    function: string
    lineno: number
    context_pre?: string[]
    context_line?: string
    context_post?: string[]
  }>
}

const ISSUE_SEEDS: IssueSeed[] = [
  {
    fingerprint: 'a7f3d2c1e9b04a59',
    title: "TypeError: Cannot read properties of undefined (reading 'amount')",
    exception_type: 'TypeError',
    exception_value: "Cannot read properties of undefined (reading 'amount')",
    culprit: 'src/checkout/total.ts in computeTotal',
    level: 'fatal',
    status: 'unresolved',
    is_regression: true,
    event_count: 1247,
    user_count: 312,
    first_offset_minutes: 4 * 60,
    last_offset_minutes: 3,
    release_index: 0,
    environment: 'production',
    frames: [
      {
        kind: 'vendor',
        filename: 'node_modules/react-dom/cjs/react-dom.development.js',
        function: 'commitRoot',
        lineno: 22942,
      },
      {
        kind: 'vendor',
        filename: 'node_modules/react-dom/cjs/react-dom.development.js',
        function: 'workLoopSync',
        lineno: 22842,
      },
      { kind: 'app', filename: 'src/checkout/Cart.tsx', function: 'CheckoutSummary', lineno: 47 },
      {
        kind: 'app',
        filename: 'src/checkout/total.ts',
        function: 'computeTotal',
        lineno: 24,
        context_pre: [
          '  const subtotal = items.reduce((acc, item) => acc + item.price, 0)',
          '  const tax = subtotal * region.taxRate',
          '  const shipping = quote.shipping ?? 0',
        ],
        context_line: '  const discount = coupon.amount ?? 0  // ← coupon may be undefined',
        context_post: ['  return subtotal + tax + shipping - discount', '}', ''],
      },
      {
        kind: 'vendor',
        filename: 'node_modules/react-dom/cjs/react-dom.development.js',
        function: 'beginWork',
        lineno: 17654,
      },
    ],
  },
  {
    fingerprint: '8b2e6f4d913a2c01',
    title: 'NetworkError: Request timed out after 30000ms',
    exception_type: 'NetworkError',
    exception_value: 'Request timed out after 30000ms',
    culprit: 'src/lib/http.ts in fetchWithRetry',
    level: 'error',
    status: 'unresolved',
    is_regression: false,
    event_count: 482,
    user_count: 138,
    first_offset_minutes: 36 * 60,
    last_offset_minutes: 11,
    release_index: 0,
    environment: 'production',
    frames: [
      {
        kind: 'app',
        filename: 'src/lib/http.ts',
        function: 'fetchWithRetry',
        lineno: 84,
        context_pre: [
          '  const controller = new AbortController()',
          "  const timer = setTimeout(() => controller.abort('timeout'), opts.timeoutMs)",
          '  try {',
        ],
        context_line: '    return await fetch(url, { ...opts, signal: controller.signal })',
        context_post: ['  } finally {', '    clearTimeout(timer)', '  }'],
      },
      { kind: 'app', filename: 'src/api/client.ts', function: 'apiCall', lineno: 36 },
    ],
  },
  {
    fingerprint: 'd5301f87a0bc2ee9',
    title: 'ReferenceError: navigator is not defined',
    exception_type: 'ReferenceError',
    exception_value: 'navigator is not defined',
    culprit: 'src/ssr/render.ts in renderToString',
    level: 'warning',
    status: 'unresolved',
    is_regression: false,
    event_count: 218,
    user_count: 64,
    first_offset_minutes: 18 * 60,
    last_offset_minutes: 28,
    release_index: 0,
    environment: 'production',
    frames: [
      { kind: 'app', filename: 'src/ssr/render.ts', function: 'renderToString', lineno: 51 },
      {
        kind: 'vendor',
        filename: 'node_modules/react-dom/server.js',
        function: 'renderToPipeableStream',
        lineno: 401,
      },
    ],
  },
  {
    fingerprint: 'c14f9a3b2e80517f',
    title: 'NullPointerException: project.owner was null',
    exception_type: 'NullPointerException',
    exception_value: 'project.owner was null',
    culprit: 'api/handlers/projects.ts:241',
    level: 'warning',
    status: 'resolved',
    is_regression: false,
    event_count: 73,
    user_count: 19,
    first_offset_minutes: 5 * 24 * 60,
    last_offset_minutes: 4 * 60,
    release_index: 1,
    environment: 'staging',
    frames: [
      { kind: 'app', filename: 'api/handlers/projects.ts', function: 'updateProject', lineno: 241 },
    ],
  },
  {
    fingerprint: 'fe2a8d610f43b925',
    title: 'TimeoutError: Database query exceeded 5000ms',
    exception_type: 'TimeoutError',
    exception_value: 'Database query exceeded 5000ms',
    culprit: 'api/db/pool.ts in queryWithTimeout',
    level: 'error',
    status: 'unresolved',
    is_regression: false,
    event_count: 1029,
    user_count: 274,
    first_offset_minutes: 2 * 24 * 60,
    last_offset_minutes: 1,
    release_index: 0,
    environment: 'production',
    frames: [
      { kind: 'app', filename: 'api/db/pool.ts', function: 'queryWithTimeout', lineno: 87 },
      {
        kind: 'app',
        filename: 'api/handlers/orders.ts',
        function: 'listRecentOrders',
        lineno: 122,
      },
    ],
  },
]

const RELEASE_SEEDS = [
  {
    version: '4.2.1',
    environment: 'production',
    days_ago: 1,
    author: 'riley@faultline.dev',
    files: 14,
    health: 'attention',
    new_issues: 2,
    regression_count: 1,
    resolved_issues: 0,
    issue_count: 5,
    commits: [
      {
        sha: 'a7f3d2c',
        message: 'checkout: handle missing coupon edge case',
        author: 'riley@faultline.dev',
      },
      {
        sha: '8b2e6f4',
        message: 'http: timeout abort signal cleanup',
        author: 'sasha@faultline.dev',
      },
    ],
    adoption: [12, 28, 41, 56, 70, 80, 88, 92],
  },
  {
    version: '4.2.0',
    environment: 'production',
    days_ago: 8,
    author: 'morgan@faultline.dev',
    files: 22,
    health: 'healthy',
    new_issues: 1,
    regression_count: 0,
    resolved_issues: 4,
    issue_count: 5,
    commits: [
      {
        sha: 'c14f9a3',
        message: 'projects: null-check owner before update',
        author: 'morgan@faultline.dev',
      },
    ],
    adoption: [10, 28, 50, 72, 88, 96, 99, 100],
  },
  {
    version: '4.1.9',
    environment: 'production',
    days_ago: 18,
    author: 'jordan@faultline.dev',
    files: 9,
    health: 'healthy',
    new_issues: 0,
    regression_count: 0,
    resolved_issues: 1,
    issue_count: 1,
    commits: [
      {
        sha: '02938ae',
        message: 'realtime: ignore signal-aborted subscribes',
        author: 'jordan@faultline.dev',
      },
    ],
    adoption: [40, 78, 92, 96, 98, 100, 100, 100],
  },
  {
    version: '4.1.8',
    environment: 'staging',
    days_ago: 22,
    author: 'priya@faultline.dev',
    files: 4,
    health: 'healthy',
    new_issues: 0,
    regression_count: 0,
    resolved_issues: 0,
    issue_count: 0,
    commits: [],
    adoption: [100, 100, 100, 100, 100, 100, 100, 100],
  },
]

const NOTIFICATION_SEEDS: Array<{
  kind: 'assignment' | 'mention' | 'alert' | 'regression' | 'status' | 'system'
  severity: string
  title: string
  detail: string
  href: string | null
  read: boolean
  hours_ago: number
}> = [
  {
    kind: 'regression',
    severity: 'critical',
    title: 'Regression: TypeError in checkout/total.ts',
    detail: 'Reappeared in 4.2.1 production · 1.2K events in last 4h.',
    href: '/issues/{iss-1}',
    read: false,
    hours_ago: 0,
  },
  {
    kind: 'assignment',
    severity: 'info',
    title: 'Sasha assigned NetworkError to you',
    detail: 'src/lib/http.ts in fetchWithRetry · 482 events',
    href: '/issues/{iss-2}',
    read: false,
    hours_ago: 1,
  },
  {
    kind: 'alert',
    severity: 'warning',
    title: 'Threshold breached: TimeoutError',
    detail: 'Frequency exceeded 100 events / minute (rule: P0 budget).',
    href: '/alerts',
    read: false,
    hours_ago: 3,
  },
  {
    kind: 'mention',
    severity: 'info',
    title: 'Morgan mentioned you on iss-3',
    detail: '"any chance you can repro this in safari iOS?"',
    href: '/issues/{iss-3}',
    read: true,
    hours_ago: 18,
  },
]

const ALERT_SEEDS: Array<{
  name: string
  rule_type: string
  level: string | null
  threshold: number
  window_seconds: number
  scope: 'project' | 'release'
  environment: string | null
  status: 'active' | 'paused'
  channels: Array<Record<string, string>>
  notification_channel: string
  notification_target: string | null
  trigger_count_7d: number
}> = [
  {
    name: 'P0 budget — production',
    rule_type: 'issue-frequency',
    level: 'fatal',
    threshold: 100,
    window_seconds: 60,
    scope: 'project',
    environment: 'production',
    status: 'active',
    channels: [{ kind: 'email', target: 'oncall@faultline.dev' }],
    notification_channel: 'email',
    notification_target: 'oncall@faultline.dev',
    trigger_count_7d: 12,
  },
  {
    name: 'Slack #incidents — regressions',
    rule_type: 'regression',
    level: null,
    threshold: 1,
    window_seconds: 0,
    scope: 'project',
    environment: 'production',
    status: 'active',
    channels: [{ kind: 'slack', target: '#incidents' }],
    notification_channel: 'slack',
    notification_target: '#incidents',
    trigger_count_7d: 3,
  },
  {
    name: 'Staging warnings (paused)',
    rule_type: 'issue-frequency',
    level: 'warning',
    threshold: 50,
    window_seconds: 300,
    scope: 'project',
    environment: 'staging',
    status: 'paused',
    channels: [{ kind: 'email', target: 'staging@faultline.dev' }],
    notification_channel: 'email',
    notification_target: 'staging@faultline.dev',
    trigger_count_7d: 0,
  },
]

const TEAM_SEEDS: Array<{
  name: string
  email: string
  role: 'owner' | 'admin' | 'dev' | 'viewer'
  oncall: boolean
  member_status: 'active' | 'invited' | 'resolved'
  assigned_issues: number
  resolved_30d: number
  last_active: string
}> = [
  {
    name: 'Sasha Lin',
    email: 'sasha@faultline.dev',
    role: 'admin',
    oncall: false,
    member_status: 'active',
    assigned_issues: 1,
    resolved_30d: 14,
    last_active: '2m ago',
  },
  {
    name: 'Morgan Chen',
    email: 'morgan@faultline.dev',
    role: 'dev',
    oncall: true,
    member_status: 'active',
    assigned_issues: 3,
    resolved_30d: 22,
    last_active: 'just now',
  },
  {
    name: 'Jordan Park',
    email: 'jordan@faultline.dev',
    role: 'dev',
    oncall: false,
    member_status: 'active',
    assigned_issues: 0,
    resolved_30d: 9,
    last_active: '3h ago',
  },
  {
    name: 'Priya Patel',
    email: 'priya@faultline.dev',
    role: 'viewer',
    oncall: false,
    member_status: 'invited',
    assigned_issues: 0,
    resolved_30d: 0,
    last_active: 'pending',
  },
]

const seededUsers = new Set<string>()

const offsetDate = (offsetMinutes: number): Date => new Date(Date.now() - offsetMinutes * 60_000)

const offsetDateDays = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60_000)

const DEMO_USER_IDENTITIES = [
  {
    id: 'u-d1',
    email: 'leah@example.com',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel) Chrome/126',
  },
  { id: 'u-d2', email: 'priya@example.com', user_agent: 'Mozilla/5.0 (X11; Linux) Firefox/130' },
  { id: 'u-d3', email: 'morgan@example.com', user_agent: 'Mozilla/5.0 (iPhone; iOS 17) Safari' },
  { id: 'u-d4', email: 'sasha@example.com', user_agent: 'Node/20.5.1' },
]

interface ProjectRow {
  id: string
  name: string
  slug: string
}

const PROJECT_SEEDS = [
  { name: 'Faultline · Web App', slug: 'faultline-web', projectType: 'app' },
  { name: 'Faultline · API', slug: 'faultline-api', projectType: 'api' },
]

export const seedDemoForUser = async (userId: string): Promise<void> => {
  if (seededUsers.has(userId)) return
  try {
    const existing = await count('issues', [{ field: 'user_id', operator: '=', value: userId }])
    if (existing > 0) return

    // 1. Projects (the projects table uses camelCase userId column).
    const userProjects = await findMany<ProjectRow>('projects', {
      where: [{ field: 'userId', operator: '=', value: userId }],
      limit: 5,
    })
    let projects: ProjectRow[] = userProjects
    if (projects.length === 0) {
      const created: ProjectRow[] = []
      for (const seed of PROJECT_SEEDS) {
        const slugSuffix = userId.slice(0, 8)
        const result = await create<ProjectRow>('projects', {
          userId,
          name: seed.name,
          slug: `${seed.slug}-${slugSuffix}`,
          projectType: seed.projectType,
          framework: null,
          packages: JSON.stringify([]),
          envVars: JSON.stringify({}),
          settings: JSON.stringify({}),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        if (result.data) created.push(result.data)
      }
      projects = created
    }
    const primaryProject = projects[0]
    if (!primaryProject) return

    // 2. Releases (so issues can reference them).
    // jsonb columns (commits, adoption) MUST be JSON.stringify'd because the
    // pg driver auto-detects JS arrays as text[] not jsonb. Serializing
    // explicitly forces pg to send the value as a `jsonb` parameter.
    for (const r of RELEASE_SEEDS) {
      await create('releases', {
        user_id: userId,
        project_id: primaryProject.id,
        version: r.version,
        environment: r.environment,
        deployed_at: offsetDateDays(r.days_ago),
        author: r.author,
        commits: JSON.stringify(r.commits),
        commit_sha: r.commits[0]?.sha ?? null,
        deploy_url: null,
        issue_count: r.issue_count,
        new_issues: r.new_issues,
        regression_count: r.regression_count,
        resolved_issues: r.resolved_issues,
        files: r.files,
        health: r.health,
        adoption: JSON.stringify(r.adoption),
        created_at: offsetDateDays(r.days_ago),
      })
    }

    // 3. Issues + 4 events per issue.
    const issueIdByFingerprint: Record<string, string> = {}
    for (const seed of ISSUE_SEEDS) {
      const release = RELEASE_SEEDS[seed.release_index]?.version ?? null
      const created = await create<{ id: string }>('issues', {
        user_id: userId,
        project_id: primaryProject.id,
        fingerprint: seed.fingerprint,
        title: seed.title,
        exception_type: seed.exception_type,
        exception_value: seed.exception_value,
        culprit: seed.culprit,
        level: seed.level,
        status: seed.status,
        first_seen: offsetDate(seed.first_offset_minutes),
        last_seen: offsetDate(seed.last_offset_minutes),
        event_count: seed.event_count,
        user_count: seed.user_count,
        environment: seed.environment,
        release,
        is_regression: seed.is_regression,
        resolved_at: seed.status === 'resolved' ? offsetDate(seed.last_offset_minutes) : null,
        frames: JSON.stringify(seed.frames),
        created_at: offsetDate(seed.first_offset_minutes),
        updated_at: offsetDate(seed.last_offset_minutes),
      })
      const issueId = created.data?.id
      if (!issueId) continue
      issueIdByFingerprint[seed.fingerprint] = issueId

      // Events for this issue
      for (let i = 0; i < DEMO_USER_IDENTITIES.length; i++) {
        const identity = DEMO_USER_IDENTITIES[i]!
        const created_at = offsetDate(seed.last_offset_minutes + i * 27)
        await create('error_events', {
          user_id: userId,
          issue_id: issueId,
          project_id: primaryProject.id,
          message: seed.title,
          stack_trace: seed.frames
            .map((f) => `  at ${f.function} (${f.filename}:${f.lineno})`)
            .join('\n'),
          level: seed.level,
          environment: seed.environment,
          release,
          tags: JSON.stringify({ user_id: identity.id, user_email: identity.email }),
          extra: JSON.stringify({}),
          user_agent: identity.user_agent,
          ip_address: '127.0.0.1',
          created_at,
        })
      }
    }

    // 4. Notifications (replace iss-N hrefs with real ids).
    const idMap: Record<string, string> = {
      'iss-1': issueIdByFingerprint['a7f3d2c1e9b04a59'] ?? '',
      'iss-2': issueIdByFingerprint['8b2e6f4d913a2c01'] ?? '',
      'iss-3': issueIdByFingerprint['d5301f87a0bc2ee9'] ?? '',
    }
    for (const n of NOTIFICATION_SEEDS) {
      const href = n.href
        ? n.href.replace(/\{(iss-\d+)\}/, (_m, key) => idMap[key as keyof typeof idMap] ?? '')
        : null
      await create('notifications', {
        user_id: userId,
        kind: n.kind,
        severity: n.severity,
        title: n.title,
        detail: n.detail,
        href,
        read: n.read,
        created_at: offsetDate(n.hours_ago * 60),
      })
    }

    // 5. Alert rules.
    for (const a of ALERT_SEEDS) {
      await create('alert_rules', {
        user_id: userId,
        project_id: primaryProject.id,
        name: a.name,
        rule_type: a.rule_type,
        level: a.level,
        threshold: a.threshold,
        window_seconds: a.window_seconds,
        fingerprint_filter: null,
        scope: a.scope,
        environment: a.environment,
        channels: JSON.stringify(a.channels),
        owners: JSON.stringify([]),
        status: a.status,
        is_enabled: a.status === 'active',
        notification_channel: a.notification_channel,
        notification_target: a.notification_target,
        condition_type: null,
        condition_value: null,
        last_triggered_at: a.trigger_count_7d > 0 ? offsetDate(2 * 60) : null,
        trigger_count_7d: a.trigger_count_7d,
        created_at: offsetDateDays(7),
        updated_at: offsetDate(60),
      })
    }

    // 6. Team members. The team_members table requires member_id (uuid).
    // For a per-user demo we use synthetic uuids — the team page renders
    // the inline name/email/role columns directly so the FK-target doesn't
    // need to resolve to a real users row.
    for (const m of TEAM_SEEDS) {
      await create('team_members', {
        user_id: userId,
        member_id: crypto.randomUUID(),
        name: m.name,
        email: m.email,
        role: m.role,
        oncall: m.oncall,
        member_status: m.member_status,
        assigned_issues: m.assigned_issues,
        resolved_30d: m.resolved_30d,
        last_active: m.last_active,
        active: m.member_status === 'active',
        created_at: offsetDateDays(30),
      })
    }

    // 7. App transactions (for /performance page p95/throughput chart).
    const transactionNames = [
      'GET /api/issues',
      'POST /api/checkout',
      'GET /api/projects/:id',
      'POST /api/uploads',
      'GET /api/dashboard',
    ]
    const statuses: Array<'ok' | 'slow' | 'error'> = ['ok', 'ok', 'ok', 'ok', 'slow', 'error']
    for (let i = 0; i < 60; i++) {
      const tname = transactionNames[i % transactionNames.length]!
      const status = statuses[i % statuses.length]!
      const baseDuration =
        status === 'ok' ? 60 + (i % 13) * 11 : status === 'slow' ? 1100 + (i % 7) * 220 : 4500
      await create('app_transactions', {
        user_id: userId,
        project_id: primaryProject.id,
        transaction_name: tname,
        duration_ms: baseDuration,
        status,
        environment: i % 5 === 0 ? 'staging' : 'production',
        release: '4.2.1',
        created_at: offsetDate(i * 17),
      })
    }
    seededUsers.add(userId)
  } catch (err) {
    // Seed is best-effort but we surface failures so an agent can debug.

    console.error('[seed] seedDemoForUser failed:', err)
  }
}
