import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR, SURFACE_PANEL } from '../branding.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { type PylonStatus, StatusPill } from '../components/StatusPill.js'
import { fmtRelative } from '../lib/format.js'

const PANEL_BORDER = 'var(--color-border)'

interface TestRow {
  id: string
  name?: string
  request_id?: string | null
  assertions?: string | unknown[]
  last_run_at?: string | null
  last_status?: string | null
  last_results?: string | RunResult[] | null
  updated_at?: string
}

interface AssertionDef {
  field: string
  operator: string
  expected?: unknown
}

interface RunResult {
  field: string
  operator: string
  expected?: unknown
  passed: boolean
}

function parseAssertions(assertions: unknown): AssertionDef[] {
  if (Array.isArray(assertions)) return assertions as AssertionDef[]
  if (typeof assertions === 'string') {
    try {
      return JSON.parse(assertions || '[]') as AssertionDef[]
    } catch (_error) {
      // malformed JSON stored in assertions column — fall back to empty list
      return []
    }
  }
  return []
}

function parseResults(value: unknown): RunResult[] {
  if (Array.isArray(value)) return value as RunResult[]
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as RunResult[]) : []
    } catch (_error) {
      // malformed JSON stored in last_results column — fall back to empty list
      return []
    }
  }
  return []
}

function statusToPill(status: string | null | undefined): PylonStatus {
  if (status === 'passed') return 'passed'
  if (status === 'failed') return 'failed'
  return 'skipped'
}

export function TestRunner() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tests, setTests] = useState<TestRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [runResults, setRunResults] = useState<Record<string, RunResult[]>>({})
  const [busy, setBusy] = useState<'all' | string | null>(null)

  const load = async () => {
    try {
      const res = await http.get<TestRow[]>('/api/tests')
      const rows = Array.isArray(res.data) ? res.data : []
      setTests(rows)
      if (rows[0]) setActiveId((prev) => prev ?? rows[0].id)
      // Seed runResults from each test's persisted last_results so the
      // assertion check marks survive a page reload — without this, every
      // assertion snaps back to "SKIPPED" the moment the user refreshes,
      // even though the test demonstrably passed seconds ago.
      const seeded: Record<string, RunResult[]> = {}
      for (const row of rows) {
        const parsed = parseResults(row.last_results)
        if (parsed.length > 0) seeded[row.id] = parsed
      }
      if (Object.keys(seeded).length > 0) {
        setRunResults((prev) => ({ ...seeded, ...prev }))
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('testRunner.fetchError', {}, { defaultValue: 'Could not load tests.' }),
      )
      setTests([])
    }
  }

  useEffect(() => {
    let cancelled = false
    load().then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runOne = async (id: string): Promise<{ status: string; results: RunResult[] } | null> => {
    try {
      const res = await http.post<{ status: string; results: RunResult[] }>(
        `/api/tests/${id}/run`,
        {},
      )
      const results = Array.isArray(res.data?.results) ? res.data.results : []
      setRunResults((prev) => ({ ...prev, [id]: results }))
      void track({
        name: 'test.executed',
        properties: { test_id: id, status: res.data?.status ?? 'failed' },
      })
      return { status: res.data?.status ?? 'failed', results }
    } catch (_error) {
      // runOne returns null on failure; handleRunAll skips failed runs gracefully
      return null
    }
  }

  const handleRunAll = async () => {
    if (busy || !tests || tests.length === 0) return
    setBusy('all')
    try {
      for (const test of tests) {
        await runOne(test.id)
      }
      await load()
    } finally {
      setBusy(null)
    }
  }

  const handleNewTest = async () => {
    if (busy) return
    setBusy('new')
    try {
      const defaultName = t(
        'testRunner.defaultName',
        { n: (tests?.length ?? 0) + 1 },
        { defaultValue: 'Untitled test {{n}}' },
      )
      const created = await http.post<{ id?: string }>('/api/tests', {
        name: defaultName,
        assertions: [{ field: 'status', operator: 'equals', expected: 200 }],
      })
      void track({ name: 'test.created', properties: { test_id: created.data?.id } })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('testRunner.createError', {}, { defaultValue: 'Could not create test.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  const allTests = tests ?? []
  const totalAssertions = allTests.reduce((acc, t) => acc + parseAssertions(t.assertions).length, 0)
  const passedTests = allTests.filter((t) => t.last_status === 'passed').length
  const failedTests = allTests.filter((t) => t.last_status === 'failed').length
  const idleTests = allTests.length - passedTests - failedTests

  const active = allTests.find((t) => t.id === activeId) ?? allTests[0] ?? null

  const activeAssertions: AssertionDef[] = active ? parseAssertions(active.assertions) : []
  const activeResults: RunResult[] = active ? (runResults[active.id] ?? []) : []

  const decoratedAssertions = activeAssertions.map((a, i) => ({
    ...a,
    passed: activeResults[i]?.passed,
  }))

  return (
    <div className={cm.cn('p-6')}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-6')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('testRunner.eyebrow', {}, { defaultValue: '$ pylon test --watch' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('testRunner.heading', {}, { defaultValue: 'Test runner' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'testRunner.subheading',
              {},
              { defaultValue: 'Suite results, assertion diffs, and the last 50 runs.' },
            )}
          </p>
        </div>
        <div className={cm.cn('flex items-center gap-2')}>
          <button
            type="button"
            onClick={handleNewTest}
            disabled={busy !== null}
            className={cm.cn(
              'px-3 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border transition-colors hover:opacity-80 disabled:opacity-50',
            )}
            style={{
              borderColor: 'color-mix(in srgb, var(--color-text) 18%, transparent)',
              color: 'var(--color-text-primary)',
              backgroundColor: 'color-mix(in srgb, var(--color-surface-elevated) 60%, transparent)',
            }}
            data-mol-id="testrunner-new"
          >
            {t('testRunner.newTest', {}, { defaultValue: 'New test' })}
          </button>
          <button
            type="button"
            onClick={handleRunAll}
            disabled={busy !== null || allTests.length === 0}
            className={cm.cn(
              'px-4 py-2 rounded-md font-mono text-xs font-extrabold uppercase tracking-widest transition-all hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-60',
            )}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
              boxShadow:
                '0 8px 22px -10px color-mix(in srgb, var(--color-primary) 60%, transparent)',
            }}
            data-mol-id="testrunner-run-all"
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              play_arrow
            </span>
            {busy === 'all'
              ? t('testRunner.running', {}, { defaultValue: 'Running…' })
              : t('testRunner.runAll', {}, { defaultValue: 'Run all' })}
          </button>
        </div>
      </header>

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-6')}>
        <MetricStatCard
          eyebrow={t('testRunner.metric.passed', {}, { defaultValue: 'Passed' })}
          value={String(passedTests)}
          unit={`/ ${allTests.length}`}
          icon="check_circle"
          tone="success"
        />
        <MetricStatCard
          eyebrow={t('status.failed', {}, { defaultValue: 'Failed' })}
          value={String(failedTests)}
          icon="cancel"
          tone={failedTests > 0 ? 'error' : 'neutral'}
        />
        <MetricStatCard
          eyebrow={t('testRunner.metric.idle', {}, { defaultValue: 'Not run' })}
          value={String(idleTests)}
          icon="more_horiz"
          tone="neutral"
        />
        <MetricStatCard
          eyebrow={t('testRunner.metric.assertions', {}, { defaultValue: 'Assertions' })}
          value={String(totalAssertions)}
          icon="bug_report"
          tone="info"
        />
      </section>

      {tests === null ? (
        <p
          className={cm.cn('text-sm py-8 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('testRunner.loading', {}, { defaultValue: 'Loading tests…' })}
        </p>
      ) : error ? (
        <p className={cm.cn('text-sm py-8 text-center')} style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      ) : allTests.length === 0 ? (
        <div
          className={cm.cn('py-16 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl opacity-40 mb-3 inline-block')}
            aria-hidden="true"
          >
            playlist_add_check
          </span>
          <p className={cm.cn('text-sm')}>
            {t(
              'testRunner.empty',
              {},
              {
                defaultValue:
                  'No tests yet — click “New test” to scaffold your first assertion suite.',
              },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('grid gap-6 grid-cols-1 lg:grid-cols-3')}>
          {/* Suite list */}
          <aside
            className={cm.cn('rounded-2xl overflow-hidden')}
            style={{ backgroundColor: SURFACE_PANEL, border: `1px solid ${PANEL_BORDER}` }}
          >
            <header
              className={cm.cn(
                'px-5 py-4 border-b font-mono text-[10px] font-black uppercase tracking-widest',
              )}
              style={{ borderColor: PANEL_BORDER, color: 'var(--color-text-secondary)' }}
            >
              {t('testRunner.suites', {}, { defaultValue: 'Suites' })}
            </header>
            <ul>
              {allTests.map((s) => {
                const sActive = s.id === active?.id
                const totalA = parseAssertions(s.assertions).length
                const passingA = (runResults[s.id] ?? []).filter((r) => r.passed).length
                const status = s.last_status as 'passed' | 'failed' | null
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(s.id)}
                      className={cm.cn(
                        'w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.03]',
                      )}
                      style={{
                        borderLeft: sActive ? `3px solid ${BRAND_COLOR}` : '3px solid transparent',
                        backgroundColor: sActive
                          ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
                          : 'transparent',
                      }}
                      data-mol-id={`testrunner-suite-${s.id}`}
                    >
                      <span
                        className={cm.cn(
                          'font-mono text-[11px] font-extrabold uppercase tracking-widest min-w-[2.5rem] text-center px-2 py-0.5 rounded',
                        )}
                        style={{
                          color:
                            status === 'failed' ? 'var(--color-error)' : 'var(--color-success)',
                          backgroundColor:
                            status === 'failed'
                              ? 'color-mix(in srgb, var(--color-error) 15%, transparent)'
                              : 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                        }}
                      >
                        {`${passingA}/${totalA}`}
                      </span>
                      <div className={cm.cn('flex-1 min-w-0')}>
                        <p
                          className={cm.cn('font-mono text-sm font-semibold truncate')}
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {s.name ?? ''}
                        </p>
                        <p
                          className={cm.cn('font-mono text-[11px] mt-0.5')}
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {s.last_run_at
                            ? fmtRelative(s.last_run_at)
                            : t('testRunner.never', {}, { defaultValue: 'Never run' })}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          {/* Active suite assertions */}
          {active ? (
            <section
              className={cm.cn('lg:col-span-2 rounded-2xl overflow-hidden')}
              style={{ backgroundColor: SURFACE_PANEL, border: `1px solid ${PANEL_BORDER}` }}
            >
              <header
                className={cm.cn('px-5 py-4 border-b flex items-center justify-between')}
                style={{ borderColor: PANEL_BORDER }}
              >
                <h2
                  className={cm.cn('text-lg font-extrabold tracking-tight')}
                  style={{ color: 'var(--color-text)' }}
                >
                  {active.name ?? ''}
                </h2>
                <div className={cm.cn('flex items-center gap-3')}>
                  <span
                    className={cm.cn('font-mono text-xs')}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {decoratedAssertions.filter((a) => a.passed).length}/
                    {decoratedAssertions.length}{' '}
                    {t('testRunner.passed', {}, { defaultValue: 'passing' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => runOne(active.id)}
                    disabled={busy !== null}
                    className={cm.cn(
                      'px-3 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest border transition-colors hover:opacity-80 disabled:opacity-50',
                    )}
                    style={{
                      borderColor: 'color-mix(in srgb, var(--color-text) 18%, transparent)',
                      color: 'var(--color-text-primary)',
                      backgroundColor:
                        'color-mix(in srgb, var(--color-surface-elevated) 60%, transparent)',
                    }}
                    data-mol-id={`testrunner-run-${active.id}`}
                  >
                    {t('testRunner.runOne', {}, { defaultValue: 'Run' })}
                  </button>
                </div>
              </header>
              <ul className={cm.cn('divide-y')} style={{ borderColor: PANEL_BORDER }}>
                {decoratedAssertions.length === 0 ? (
                  <li
                    className={cm.cn('px-5 py-6 font-mono text-sm text-center')}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {t(
                      'testRunner.noAssertions',
                      {},
                      { defaultValue: 'No assertions on this test yet.' },
                    )}
                  </li>
                ) : (
                  decoratedAssertions.map((a, i) => {
                    const status: 'passed' | 'failed' | 'skipped' =
                      a.passed === undefined ? 'skipped' : a.passed ? 'passed' : 'failed'
                    return (
                      <li
                        key={i}
                        className={cm.cn('px-5 py-3')}
                        style={{ borderBottom: `1px solid ${PANEL_BORDER}` }}
                      >
                        <div className={cm.cn('flex items-center gap-3')}>
                          <StatusPill status={statusToPill(status)} label={status.toUpperCase()} />
                          <span
                            className={cm.cn('flex-1 font-mono text-[13px]')}
                            style={{
                              color:
                                status === 'failed'
                                  ? 'var(--color-error)'
                                  : 'var(--color-text-primary)',
                            }}
                          >
                            {a.field} {a.operator} {String(a.expected ?? '')}
                          </span>
                        </div>
                      </li>
                    )
                  })
                )}
              </ul>
              <footer className={cm.cn('px-5 py-3 border-t')} style={{ borderColor: PANEL_BORDER }}>
                <p
                  className={cm.cn('font-mono text-[11px]')}
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {t(
                    'testRunner.cron',
                    {},
                    {
                      defaultValue:
                        'Assertions are evaluated against the most recent run of this test’s linked request.',
                    },
                  )}
                </p>
              </footer>
            </section>
          ) : null}
        </div>
      )}

      {/* Recent runs (per-test) */}
      {allTests.length > 0 ? (
        <section
          className={cm.cn('mt-6 rounded-2xl overflow-hidden')}
          style={{ backgroundColor: SURFACE_PANEL, border: `1px solid ${PANEL_BORDER}` }}
        >
          <header
            className={cm.cn(
              'px-5 py-4 border-b font-mono text-[10px] font-black uppercase tracking-widest',
            )}
            style={{ borderColor: PANEL_BORDER, color: 'var(--color-text-secondary)' }}
          >
            {t('testRunner.recentRuns', {}, { defaultValue: 'Recent runs' })}
          </header>
          <ul>
            {allTests
              .filter((t) => t.last_run_at)
              .slice(0, 8)
              .map((run) => {
                const totalA = parseAssertions(run.assertions).length
                return (
                  <li
                    key={run.id}
                    className={cm.cn(
                      'px-5 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center font-mono text-sm border-b last:border-b-0',
                    )}
                    style={{ borderColor: PANEL_BORDER, color: 'var(--color-text-primary)' }}
                  >
                    <span style={{ color: 'var(--color-text-secondary)' }}>{run.name ?? ''}</span>
                    <span
                      style={{
                        color:
                          run.last_status === 'failed'
                            ? 'var(--color-error)'
                            : 'var(--color-success)',
                      }}
                    >
                      {t(
                        `status.${run.last_status ?? 'idle'}`,
                        {},
                        { defaultValue: run.last_status ?? 'idle' },
                      )}
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {t(
                        'testRunner.assertionsCount',
                        { count: totalA },
                        { defaultValue: '{{count}} assertions' },
                      )}
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {run.last_run_at ? fmtRelative(run.last_run_at) : '—'}
                    </span>
                  </li>
                )
              })}
            {allTests.every((t) => !t.last_run_at) ? (
              <li
                className={cm.cn('px-5 py-3 font-mono text-sm text-center')}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t(
                  'testRunner.noRunsYet',
                  {},
                  { defaultValue: 'No runs recorded yet — hit “Run all” to populate history.' },
                )}
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
