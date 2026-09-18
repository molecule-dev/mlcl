/**
 * Demo seed for ai-data-analyst.
 *
 * On first request from a freshly signed-up user, seeds:
 *
 * - 4 datasets (CSV, JSON, Parquet, XLSX)
 * - 4-6 dataset_columns per dataset (with stats_json populated)
 * - 8 dataset_rows per dataset (sample for preview tab)
 * - 4 analyses per dataset
 * - 6 insights (mix of trend/anomaly/correlation/summary)
 * - 3 saved_reports with full hero/kpis/sub_charts/data_table layouts
 * - 5 notifications (mix of types, some unread)
 *
 * Idempotent on user_id — returns early if datasets already exist.
 *
 * @module
 */

import { count, create, findMany } from '@molecule/api-database'

interface SeededRow {
  id: string
  [key: string]: unknown
}

const unwrap = (result: unknown): SeededRow => {
  const r = result as { data?: SeededRow } | SeededRow
  return ('data' in r && r.data ? r.data : r) as SeededRow
}

const dim = (i: number): Date => new Date(Date.now() - i * 60 * 60 * 1000)
const day = (i: number): Date => new Date(Date.now() - i * 24 * 60 * 60 * 1000)

interface SeedDataset {
  name: string
  description: string
  format: 'csv' | 'json' | 'parquet' | 'jsonl'
  rows: number
  cols: number
  size_bytes: number
  hours_ago: number
  columns: Array<{
    name: string
    type: string
    nullable: boolean
    unique_count: number
    example: string
    stats: { min: string; max: string; mean?: string; null_pct: number }
  }>
  sample_rows: Array<Record<string, string | number | boolean>>
}

const DATASETS: SeedDataset[] = [
  {
    name: 'q4_revenue_by_segment',
    description:
      'Quarterly revenue rollup by customer segment, exported from the warehouse on Jan 3rd.',
    format: 'csv',
    rows: 14_502,
    cols: 6,
    size_bytes: 1_840_000,
    hours_ago: 4,
    columns: [
      {
        name: 'segment',
        type: 'string',
        nullable: false,
        unique_count: 8,
        example: 'enterprise',
        stats: { min: 'consumer', max: 'startup', null_pct: 0.0 },
      },
      {
        name: 'arr_cents',
        type: 'integer',
        nullable: false,
        unique_count: 8612,
        example: '4820000',
        stats: { min: '120000', max: '12400000', mean: '2840000', null_pct: 0.0 },
      },
      {
        name: 'mrr_cents',
        type: 'integer',
        nullable: false,
        unique_count: 8420,
        example: '418500',
        stats: { min: '10000', max: '1100000', mean: '236000', null_pct: 0.0 },
      },
      {
        name: 'churn_bps',
        type: 'integer',
        nullable: true,
        unique_count: 240,
        example: '180',
        stats: { min: '0', max: '2400', mean: '180', null_pct: 4.2 },
      },
      {
        name: 'closed_at',
        type: 'date',
        nullable: false,
        unique_count: 92,
        example: '2025-12-18',
        stats: { min: '2025-10-01', max: '2025-12-31', null_pct: 0.0 },
      },
      {
        name: 'rep_id',
        type: 'string',
        nullable: true,
        unique_count: 36,
        example: 'rep_021',
        stats: { min: 'rep_001', max: 'rep_036', null_pct: 12.4 },
      },
    ],
    sample_rows: [
      {
        segment: 'enterprise',
        arr_cents: 4820000,
        mrr_cents: 401666,
        churn_bps: 120,
        closed_at: '2025-12-18',
        rep_id: 'rep_021',
      },
      {
        segment: 'mid-market',
        arr_cents: 1240000,
        mrr_cents: 103333,
        churn_bps: 240,
        closed_at: '2025-12-15',
        rep_id: 'rep_009',
      },
      {
        segment: 'startup',
        arr_cents: 280000,
        mrr_cents: 23333,
        churn_bps: 480,
        closed_at: '2025-12-12',
        rep_id: 'rep_017',
      },
      {
        segment: 'enterprise',
        arr_cents: 6800000,
        mrr_cents: 566666,
        churn_bps: 60,
        closed_at: '2025-12-09',
        rep_id: 'rep_004',
      },
      {
        segment: 'consumer',
        arr_cents: 80000,
        mrr_cents: 6666,
        churn_bps: 1200,
        closed_at: '2025-12-08',
        rep_id: 'rep_032',
      },
      {
        segment: 'mid-market',
        arr_cents: 2100000,
        mrr_cents: 175000,
        churn_bps: 180,
        closed_at: '2025-12-04',
        rep_id: 'rep_011',
      },
      {
        segment: 'enterprise',
        arr_cents: 9200000,
        mrr_cents: 766666,
        churn_bps: 30,
        closed_at: '2025-11-28',
        rep_id: 'rep_001',
      },
      {
        segment: 'startup',
        arr_cents: 410000,
        mrr_cents: 34166,
        churn_bps: 360,
        closed_at: '2025-11-22',
        rep_id: 'rep_028',
      },
    ],
  },
  {
    name: 'web_signup_funnel',
    description: 'Daily signup funnel from /pricing through trial activation, mid-Oct → mid-Dec.',
    format: 'json',
    rows: 4_212,
    cols: 5,
    size_bytes: 612_000,
    hours_ago: 18,
    columns: [
      {
        name: 'day',
        type: 'date',
        nullable: false,
        unique_count: 62,
        example: '2025-12-15',
        stats: { min: '2025-10-15', max: '2025-12-15', null_pct: 0.0 },
      },
      {
        name: 'visitors',
        type: 'integer',
        nullable: false,
        unique_count: 1840,
        example: '6420',
        stats: { min: '1200', max: '12400', mean: '5200', null_pct: 0.0 },
      },
      {
        name: 'signups',
        type: 'integer',
        nullable: false,
        unique_count: 920,
        example: '212',
        stats: { min: '40', max: '480', mean: '180', null_pct: 0.0 },
      },
      {
        name: 'activated',
        type: 'integer',
        nullable: false,
        unique_count: 412,
        example: '94',
        stats: { min: '12', max: '220', mean: '82', null_pct: 0.0 },
      },
      {
        name: 'channel',
        type: 'string',
        nullable: false,
        unique_count: 4,
        example: 'organic',
        stats: { min: 'direct', max: 'social', null_pct: 0.0 },
      },
    ],
    sample_rows: [
      { day: '2025-12-15', visitors: 6420, signups: 212, activated: 94, channel: 'organic' },
      { day: '2025-12-14', visitors: 5810, signups: 184, activated: 78, channel: 'organic' },
      { day: '2025-12-13', visitors: 4920, signups: 142, activated: 62, channel: 'organic' },
      { day: '2025-12-12', visitors: 6100, signups: 198, activated: 88, channel: 'paid' },
      { day: '2025-12-11', visitors: 5440, signups: 178, activated: 82, channel: 'paid' },
      { day: '2025-12-10', visitors: 4900, signups: 138, activated: 64, channel: 'social' },
      { day: '2025-12-09', visitors: 6800, signups: 224, activated: 102, channel: 'organic' },
      { day: '2025-12-08', visitors: 7220, signups: 248, activated: 118, channel: 'organic' },
    ],
  },
  {
    name: 'product_event_stream',
    description:
      'Frontend product events ingested from the SDK, deduplicated and partitioned by event_name.',
    format: 'parquet',
    rows: 184_002,
    cols: 4,
    size_bytes: 8_400_000,
    hours_ago: 30,
    columns: [
      {
        name: 'occurred_at',
        type: 'timestamp',
        nullable: false,
        unique_count: 184002,
        example: '2025-12-15T14:22:08Z',
        stats: { min: '2025-10-01T00:00:00Z', max: '2025-12-15T23:59:50Z', null_pct: 0.0 },
      },
      {
        name: 'user_id',
        type: 'string',
        nullable: false,
        unique_count: 8412,
        example: 'usr_412',
        stats: { min: 'usr_001', max: 'usr_8412', null_pct: 0.0 },
      },
      {
        name: 'event_name',
        type: 'string',
        nullable: false,
        unique_count: 14,
        example: 'dashboard_loaded',
        stats: { min: 'app_opened', max: 'workspace_created', null_pct: 0.0 },
      },
      {
        name: 'duration_ms',
        type: 'integer',
        nullable: true,
        unique_count: 4218,
        example: '420',
        stats: { min: '0', max: '120000', mean: '840', null_pct: 6.8 },
      },
    ],
    sample_rows: [
      {
        occurred_at: '2025-12-15T14:22:08Z',
        user_id: 'usr_0412',
        event_name: 'dashboard_loaded',
        duration_ms: 420,
      },
      {
        occurred_at: '2025-12-15T14:21:54Z',
        user_id: 'usr_2810',
        event_name: 'query_run',
        duration_ms: 1240,
      },
      {
        occurred_at: '2025-12-15T14:21:39Z',
        user_id: 'usr_0078',
        event_name: 'dataset_uploaded',
        duration_ms: 8420,
      },
      {
        occurred_at: '2025-12-15T14:21:02Z',
        user_id: 'usr_4912',
        event_name: 'report_shared',
        duration_ms: 180,
      },
      {
        occurred_at: '2025-12-15T14:20:48Z',
        user_id: 'usr_1024',
        event_name: 'app_opened',
        duration_ms: 90,
      },
      {
        occurred_at: '2025-12-15T14:20:14Z',
        user_id: 'usr_3340',
        event_name: 'query_run',
        duration_ms: 2840,
      },
      {
        occurred_at: '2025-12-15T14:19:55Z',
        user_id: 'usr_0412',
        event_name: 'workspace_created',
        duration_ms: 640,
      },
      {
        occurred_at: '2025-12-15T14:19:31Z',
        user_id: 'usr_8120',
        event_name: 'dashboard_loaded',
        duration_ms: 380,
      },
    ],
  },
  {
    name: 'support_ticket_export',
    description: 'Closed support tickets from the past 90 days, with CSAT scores and tags.',
    format: 'jsonl',
    rows: 2_840,
    cols: 6,
    size_bytes: 480_000,
    hours_ago: 72,
    columns: [
      {
        name: 'ticket_id',
        type: 'string',
        nullable: false,
        unique_count: 2840,
        example: 'tkt_004812',
        stats: { min: 'tkt_002001', max: 'tkt_004840', null_pct: 0.0 },
      },
      {
        name: 'closed_at',
        type: 'date',
        nullable: false,
        unique_count: 90,
        example: '2025-12-12',
        stats: { min: '2025-09-15', max: '2025-12-15', null_pct: 0.0 },
      },
      {
        name: 'csat',
        type: 'integer',
        nullable: true,
        unique_count: 5,
        example: '5',
        stats: { min: '1', max: '5', mean: '4', null_pct: 18.4 },
      },
      {
        name: 'first_resp_min',
        type: 'integer',
        nullable: true,
        unique_count: 412,
        example: '14',
        stats: { min: '1', max: '720', mean: '46', null_pct: 2.1 },
      },
      {
        name: 'tags',
        type: 'string',
        nullable: true,
        unique_count: 24,
        example: 'billing,refund',
        stats: { min: 'access', max: 'webhooks', null_pct: 8.4 },
      },
      {
        name: 'agent_id',
        type: 'string',
        nullable: false,
        unique_count: 18,
        example: 'agt_009',
        stats: { min: 'agt_001', max: 'agt_018', null_pct: 0.0 },
      },
    ],
    sample_rows: [
      {
        ticket_id: 'tkt_004812',
        closed_at: '2025-12-12',
        csat: 5,
        first_resp_min: 14,
        tags: 'billing,refund',
        agent_id: 'agt_009',
      },
      {
        ticket_id: 'tkt_004811',
        closed_at: '2025-12-12',
        csat: 4,
        first_resp_min: 22,
        tags: 'webhooks',
        agent_id: 'agt_004',
      },
      {
        ticket_id: 'tkt_004810',
        closed_at: '2025-12-11',
        csat: 5,
        first_resp_min: 8,
        tags: 'access',
        agent_id: 'agt_001',
      },
      {
        ticket_id: 'tkt_004809',
        closed_at: '2025-12-11',
        csat: 2,
        first_resp_min: 188,
        tags: 'billing',
        agent_id: 'agt_009',
      },
      {
        ticket_id: 'tkt_004808',
        closed_at: '2025-12-10',
        csat: 4,
        first_resp_min: 46,
        tags: 'sso,access',
        agent_id: 'agt_011',
      },
      {
        ticket_id: 'tkt_004807',
        closed_at: '2025-12-10',
        csat: 5,
        first_resp_min: 12,
        tags: 'reports',
        agent_id: 'agt_018',
      },
      {
        ticket_id: 'tkt_004806',
        closed_at: '2025-12-09',
        csat: 3,
        first_resp_min: 82,
        tags: 'webhooks,timeout',
        agent_id: 'agt_004',
      },
      {
        ticket_id: 'tkt_004805',
        closed_at: '2025-12-09',
        csat: 5,
        first_resp_min: 6,
        tags: 'access',
        agent_id: 'agt_001',
      },
    ],
  },
]

interface SeedAnalysis {
  prompt: string
  generated_sql: string
  narrative_md: string
  hours_ago: number
}

const ANALYSES_PER_DATASET: SeedAnalysis[] = [
  {
    prompt: 'Top segments by ARR, last 90 days',
    generated_sql: `SELECT segment, SUM(arr_cents) AS arr\nFROM events\nWHERE occurred_at >= NOW() - INTERVAL '90 days'\nGROUP BY 1\nORDER BY arr DESC\nLIMIT 10;`,
    narrative_md:
      'Enterprise segment leads at $4.8M ARR (62% of total). Mid-market is the fastest growing at +18% MoM.',
    hours_ago: 4,
  },
  {
    prompt: 'Daily signups vs activated users',
    generated_sql: `SELECT day, SUM(signups) AS signups, SUM(activated) AS activated\nFROM events\nWHERE day >= NOW() - INTERVAL '60 days'\nGROUP BY 1\nORDER BY 1;`,
    narrative_md:
      'Activation rate is steady at ~44%. Organic channel converts at 48%, paid at 41%.',
    hours_ago: 12,
  },
  {
    prompt: 'Average response time by agent',
    generated_sql: `SELECT agent_id, AVG(first_resp_min) AS avg_min, COUNT(*) AS tickets\nFROM events\nGROUP BY 1\nORDER BY avg_min ASC;`,
    narrative_md:
      'agt_001 leads with 8 min avg response. agt_009 has the highest volume but slowest response (180 min).',
    hours_ago: 30,
  },
  {
    prompt: 'Event-name distribution last week',
    generated_sql: `SELECT event_name, COUNT(*) AS events\nFROM events\nWHERE occurred_at >= NOW() - INTERVAL '7 days'\nGROUP BY 1\nORDER BY events DESC;`,
    narrative_md:
      '`query_run` accounts for 38% of all events; `dashboard_loaded` second at 24%. `workspace_created` is rare (3%).',
    hours_ago: 56,
  },
]

interface SeedInsight {
  kind: 'trend' | 'anomaly' | 'correlation' | 'outlier'
  headline: string
  body_md: string
  confidence: number
  detected_hours_ago: number
}

const INSIGHTS_PER_DATASET: SeedInsight[][] = [
  [
    {
      kind: 'trend',
      headline: 'Enterprise ARR trending up +18% QoQ',
      body_md:
        'Top three reps closed 64% of new enterprise revenue this quarter. Pace exceeds last quarter by 18%.',
      confidence: 0.92,
      detected_hours_ago: 3,
    },
    {
      kind: 'anomaly',
      headline: 'Churn spike in consumer segment',
      body_md:
        'Consumer churn jumped from 4% to 12% in the last 14 days. 4 of 8 consumer accounts cancelled.',
      confidence: 0.86,
      detected_hours_ago: 9,
    },
  ],
  [
    {
      kind: 'correlation',
      headline: 'Organic signups 8% higher activation than paid',
      body_md:
        'Activation rate for organic = 48%; paid = 41%. Difference is consistent across the 60-day window.',
      confidence: 0.81,
      detected_hours_ago: 14,
    },
    {
      kind: 'trend',
      headline: 'Tuesday signups consistently outperform',
      body_md:
        'Average Tuesday signups = 244 vs Wednesday avg 192. Worth A/B testing Tue-only launches.',
      confidence: 0.74,
      detected_hours_ago: 22,
    },
  ],
  [
    {
      kind: 'outlier',
      headline: '`query_run` p99 latency at 8.4s',
      body_md: 'Top 1% of `query_run` events take >8s. All originate from datasets >1M rows.',
      confidence: 0.95,
      detected_hours_ago: 28,
    },
    {
      kind: 'trend',
      headline: 'Workspace creation up 32% MoM',
      body_md:
        'Workspaces created in November (1,420) vs October (1,070) = +32%. Driven by team-tier signups.',
      confidence: 0.88,
      detected_hours_ago: 42,
    },
  ],
]

interface SeedReport {
  title: string
  description: string
  hero: { type: 'bar' | 'line'; series: { label: string; value: number }[] }
  kpis: { label: string; value: string; delta_pct?: number }[]
  sub_charts: { title: string; series: { label: string; value: number }[]; color: string }[]
  ai_summary: string
  data_table: { col: string; values: (string | number)[] }[]
  schedule: 'daily' | 'weekly' | 'monthly' | null
  shared_with: string[]
  thumbnail_series: number[]
  chart_type: 'bar' | 'line' | 'scatter' | 'heatmap' | 'pie' | 'table'
  hours_ago: number
}

const REPORTS: SeedReport[] = [
  {
    title: 'Q4 Revenue by Segment',
    description: 'How quarterly ARR breaks down across segments, with MoM deltas and rep mix.',
    hero: {
      type: 'bar',
      series: [
        { label: 'Enterprise', value: 9_200_000 },
        { label: 'Mid-market', value: 4_820_000 },
        { label: 'Startup', value: 2_100_000 },
        { label: 'Consumer', value: 480_000 },
      ],
    },
    kpis: [
      { label: 'Total ARR', value: '$16.6M', delta_pct: 18.2 },
      { label: 'Net new', value: '$3.4M', delta_pct: 24.8 },
      { label: 'Churn', value: '$0.42M', delta_pct: -8.4 },
    ],
    sub_charts: [
      {
        title: 'MoM ARR by segment',
        series: [
          { label: 'Oct', value: 14_100_000 },
          { label: 'Nov', value: 15_200_000 },
          { label: 'Dec', value: 16_600_000 },
        ],
        color: '#4f46e5',
      },
      {
        title: 'Reps by ARR',
        series: [
          { label: 'rep_001', value: 6_800_000 },
          { label: 'rep_021', value: 4_820_000 },
          { label: 'rep_004', value: 2_100_000 },
          { label: 'rep_009', value: 1_240_000 },
        ],
        color: '#0891b2',
      },
    ],
    ai_summary:
      'Enterprise drives 55% of total ARR. rep_001 leads at $6.8M closed. Consumer segment churn is concentrated in 4 accounts representing 80% of lost ARR.\n\nRecommend a retention campaign focused on consumer accounts and a deeper rep-coaching program for mid-tier reps to close the gap with rep_001.',
    data_table: [
      { col: 'segment', values: ['enterprise', 'mid-market', 'startup', 'consumer'] },
      { col: 'arr_cents', values: [9_200_000, 4_820_000, 2_100_000, 480_000] },
      { col: 'churn_bps', values: [60, 180, 360, 1200] },
      { col: 'rep_count', values: [12, 14, 8, 4] },
    ],
    schedule: 'weekly',
    shared_with: ['ana@clarion.demo', 'jordan@clarion.demo'],
    thumbnail_series: [12, 14, 18, 22, 28, 24, 32, 36],
    chart_type: 'bar',
    hours_ago: 4,
  },
  {
    title: 'Signup → Activation Funnel',
    description: 'Daily visitors → signups → activated, broken out by acquisition channel.',
    hero: {
      type: 'line',
      series: [
        { label: 'Oct 15', value: 4220 },
        { label: 'Oct 22', value: 4810 },
        { label: 'Oct 29', value: 5240 },
        { label: 'Nov 5', value: 5680 },
        { label: 'Nov 12', value: 6020 },
        { label: 'Nov 19', value: 5840 },
        { label: 'Nov 26', value: 6420 },
        { label: 'Dec 3', value: 6810 },
        { label: 'Dec 10', value: 7240 },
      ],
    },
    kpis: [
      { label: 'Visitors', value: '184K', delta_pct: 12.4 },
      { label: 'Signups', value: '5,840', delta_pct: 8.2 },
      { label: 'Activated', value: '2,572', delta_pct: 11.6 },
    ],
    sub_charts: [
      {
        title: 'Channel mix',
        series: [
          { label: 'organic', value: 62 },
          { label: 'paid', value: 24 },
          { label: 'social', value: 10 },
          { label: 'direct', value: 4 },
        ],
        color: '#16a34a',
      },
      {
        title: 'Activation %',
        series: [
          { label: 'organic', value: 48 },
          { label: 'paid', value: 41 },
          { label: 'social', value: 38 },
          { label: 'direct', value: 52 },
        ],
        color: '#ea580c',
      },
    ],
    ai_summary:
      "Organic accounts for 62% of signups but converts 8 percentage points higher than paid. Direct traffic — though small — has the highest activation rate (52%).\n\nConsider scaling content investments to drive more organic signups, and audit the paid landing flow for friction that organic doesn't hit.",
    data_table: [
      { col: 'channel', values: ['organic', 'paid', 'social', 'direct'] },
      { col: 'visitors', values: [114_080, 44_160, 18_400, 7_360] },
      { col: 'signups', values: [3_620, 1_402, 584, 234] },
      { col: 'activated', values: [1_738, 575, 222, 122] },
      { col: 'activation_pct', values: [48, 41, 38, 52] },
    ],
    schedule: 'daily',
    shared_with: ['marcus@clarion.demo'],
    thumbnail_series: [4, 6, 9, 14, 18, 22, 28, 32],
    chart_type: 'line',
    hours_ago: 18,
  },
  {
    title: 'Event Latency Outliers',
    description: 'p50 / p95 / p99 latency for the top 6 SDK event names, last 7 days.',
    hero: {
      type: 'bar',
      series: [
        { label: 'query_run', value: 8400 },
        { label: 'dataset_uploaded', value: 4200 },
        { label: 'workspace_created', value: 1800 },
        { label: 'dashboard_loaded', value: 640 },
        { label: 'app_opened', value: 120 },
        { label: 'report_shared', value: 180 },
      ],
    },
    kpis: [
      { label: 'Total events', value: '184K', delta_pct: 4.2 },
      { label: 'p99 latency', value: '8.4s', delta_pct: 22.0 },
      { label: 'Slow rate', value: '0.92%', delta_pct: 4.8 },
    ],
    sub_charts: [
      {
        title: 'p99 by hour',
        series: [
          { label: '00', value: 1240 },
          { label: '04', value: 980 },
          { label: '08', value: 1820 },
          { label: '12', value: 4200 },
          { label: '16', value: 5840 },
          { label: '20', value: 3120 },
        ],
        color: '#a855f7',
      },
      {
        title: 'Slow events / k events',
        series: [
          { label: 'query_run', value: 18 },
          { label: 'dataset_uploaded', value: 12 },
          { label: 'workspace_created', value: 4 },
          { label: 'dashboard_loaded', value: 1 },
        ],
        color: '#dc2626',
      },
    ],
    ai_summary:
      '`query_run` is the dominant tail-latency contributor — 18 slow events per 1,000. All p99 outliers originate from datasets >1M rows.\n\nProposed action: investigate query plan caching for the largest 5% of datasets; consider materialized views for the top 3 most-queried dashboards.',
    data_table: [
      {
        col: 'event_name',
        values: [
          'query_run',
          'dataset_uploaded',
          'workspace_created',
          'dashboard_loaded',
          'app_opened',
          'report_shared',
        ],
      },
      { col: 'p50_ms', values: [840, 1200, 320, 90, 60, 120] },
      { col: 'p95_ms', values: [4200, 2800, 980, 280, 110, 360] },
      { col: 'p99_ms', values: [8400, 4200, 1800, 640, 120, 180] },
      { col: 'count', values: [69_920, 22_080, 5_520, 44_160, 36_800, 5_520] },
    ],
    schedule: 'monthly',
    shared_with: [],
    thumbnail_series: [22, 28, 18, 14, 24, 32, 28, 22],
    chart_type: 'bar',
    hours_ago: 30,
  },
]

interface SeedNotification {
  kind: string
  title: string
  body: string
  link: string | null
  read_hours_ago: number | null
  created_hours_ago: number
}

const NOTIFICATIONS: SeedNotification[] = [
  {
    kind: 'insight_detected',
    title: 'New insight on q4_revenue_by_segment',
    body: 'Enterprise ARR trending up +18% QoQ. 92% confidence.',
    link: '/datasets/__SEEDED_DATASET_0__',
    read_hours_ago: null,
    created_hours_ago: 1,
  },
  {
    kind: 'insight_detected',
    title: 'Churn anomaly detected',
    body: 'Consumer churn jumped to 12% in the last 14 days.',
    link: '/datasets/__SEEDED_DATASET_0__',
    read_hours_ago: null,
    created_hours_ago: 3,
  },
  {
    kind: 'report_ready',
    title: 'Q4 Revenue by Segment is ready',
    body: 'Your weekly Q4 Revenue report has refreshed.',
    link: '/reports/__SEEDED_REPORT_0__',
    read_hours_ago: null,
    created_hours_ago: 6,
  },
  {
    kind: 'dataset_processed',
    title: 'product_event_stream finished processing',
    body: '184,002 rows ingested. 4 columns inferred. Stats computed.',
    link: '/datasets/__SEEDED_DATASET_2__',
    read_hours_ago: 8,
    created_hours_ago: 12,
  },
  {
    kind: 'system_message',
    title: 'Welcome to Clarion',
    body: 'Your account is set up. Ask questions in the Query Editor or upload a CSV to start.',
    link: '/upload',
    read_hours_ago: 24,
    created_hours_ago: 26,
  },
]

/**
 * Per-user in-flight seed promise so concurrent first-load requests
 * (Dashboard fans out to /reports/dashboard_stats + /insights in
 * parallel) deduplicate to a single seed pass.
 */
const seedInFlight = new Map<string, Promise<SeedResult>>()

interface SeedResult {
  datasetsCreated: number
  analysesCreated: number
  insightsCreated: number
  reportsCreated: number
  notificationsCreated: number
}

const ZERO: SeedResult = {
  datasetsCreated: 0,
  analysesCreated: 0,
  insightsCreated: 0,
  reportsCreated: 0,
  notificationsCreated: 0,
}

/**
 * Seed a freshly signed-up user with realistic demo content.
 *
 * Idempotent: returns early if the user already has any datasets.
 * Race-safe: concurrent calls share a single in-flight promise.
 */
export async function seedDemoForUser(userId: string): Promise<SeedResult> {
  if (!userId) return ZERO
  const existing = seedInFlight.get(userId)
  if (existing) return existing
  const p = doSeed(userId).finally(() => {
    seedInFlight.delete(userId)
  })
  seedInFlight.set(userId, p)
  return p
}

async function doSeed(userId: string): Promise<SeedResult> {
  const existing = await count('datasets', [{ field: 'user_id', operator: '=', value: userId }])
  if (existing > 0) return ZERO

  const datasetIds: string[] = []

  for (let i = 0; i < DATASETS.length; i++) {
    const ds = DATASETS[i]
    const dsRow = unwrap(
      await create('datasets', {
        user_id: userId,
        name: ds.name,
        description: ds.description,
        format: ds.format,
        source_url: null,
        row_count: ds.rows,
        col_count: ds.cols,
        size_bytes: ds.size_bytes,
        last_analyzed_at: dim(ds.hours_ago),
        status: 'ready',
        metadata_json: JSON.stringify({}),
        created_at: dim(ds.hours_ago + 2),
        updated_at: dim(ds.hours_ago),
      }),
    )
    datasetIds.push(dsRow.id)

    for (let pos = 0; pos < ds.columns.length; pos++) {
      const col = ds.columns[pos]
      await create('dataset_columns', {
        dataset_id: dsRow.id,
        name: col.name,
        type: col.type,
        nullable: col.nullable,
        unique_count: col.unique_count,
        example: col.example,
        position: pos,
        stats_json: JSON.stringify(col.stats),
        created_at: dim(ds.hours_ago + 2),
      })
    }

    for (let r = 0; r < ds.sample_rows.length; r++) {
      await create('dataset_rows', {
        dataset_id: dsRow.id,
        row_index: r,
        values_json: JSON.stringify(ds.sample_rows[r]),
        created_at: dim(ds.hours_ago + 1),
      })
    }
  }

  let analysesCreated = 0
  for (let dsi = 0; dsi < datasetIds.length; dsi++) {
    for (const a of ANALYSES_PER_DATASET) {
      await create('analyses', {
        user_id: userId,
        dataset_id: datasetIds[dsi],
        prompt_text: a.prompt,
        generated_sql: a.generated_sql,
        result_rows_json: JSON.stringify([]),
        charts_json: JSON.stringify([]),
        narrative_md: a.narrative_md,
        model: 'demo:offline',
        tokens_used: 0,
        created_at: dim(a.hours_ago + dsi),
      })
      analysesCreated++
    }
  }

  let insightsCreated = 0
  for (let dsi = 0; dsi < datasetIds.length && dsi < INSIGHTS_PER_DATASET.length; dsi++) {
    for (const ix of INSIGHTS_PER_DATASET[dsi]) {
      await create('insights', {
        user_id: userId,
        dataset_id: datasetIds[dsi],
        kind: ix.kind,
        headline: ix.headline,
        body_md: ix.body_md,
        confidence: ix.confidence,
        detected_at: dim(ix.detected_hours_ago),
        created_at: dim(ix.detected_hours_ago),
      })
      insightsCreated++
    }
  }

  const reportIds: string[] = []
  for (let i = 0; i < REPORTS.length; i++) {
    const r = REPORTS[i]
    const ds = datasetIds[i % datasetIds.length] ?? null
    const reportRow = unwrap(
      await create('saved_reports', {
        user_id: userId,
        title: r.title,
        description: r.description,
        dataset_id: ds,
        layout_json: JSON.stringify({
          schedule: r.schedule,
          shared_with: r.shared_with,
          thumbnail_series: r.thumbnail_series,
          chart_type: r.chart_type,
        }),
        metadata_json: JSON.stringify({
          hero: r.hero,
          kpis: r.kpis,
          sub_charts: r.sub_charts,
          ai_summary: r.ai_summary,
          data_table: r.data_table,
        }),
        last_run_at: dim(r.hours_ago),
        created_at: day(7 + i),
        updated_at: dim(r.hours_ago),
      }),
    )
    reportIds.push(reportRow.id)
  }

  let notificationsCreated = 0
  for (const n of NOTIFICATIONS) {
    let link = n.link
    if (link) {
      link = link
        .replace(
          /__SEEDED_DATASET_(\d+)__/g,
          (_m, idx) => datasetIds[Number(idx)] ?? datasetIds[0] ?? '',
        )
        .replace(
          /__SEEDED_REPORT_(\d+)__/g,
          (_m, idx) => reportIds[Number(idx)] ?? reportIds[0] ?? '',
        )
    }
    await create('notifications', {
      user_id: userId,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: link,
      entity_id: null,
      read_at: n.read_hours_ago != null ? dim(n.read_hours_ago) : null,
      created_at: dim(n.created_hours_ago),
    })
    notificationsCreated++
  }

  return {
    datasetsCreated: DATASETS.length,
    analysesCreated,
    insightsCreated,
    reportsCreated: REPORTS.length,
    notificationsCreated,
  }
}

/**
 * Convenience export to satisfy "ensureSeed" naming convention used by other
 * apps. Returns true if anything was created.
 */
export async function ensureSeedForUser(userId: string): Promise<boolean> {
  const r = await seedDemoForUser(userId)
  return r.datasetsCreated > 0
}

void findMany
