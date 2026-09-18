---
name: charts-dashboard
intent: |
  - "Charts"
  - "Graphs"
  - "Analytics dashboard"
  - "Plot data over time"
  - "Bar / line / pie chart"
keywords:
  [
    chart,
    charts,
    graph,
    graphs,
    dashboard,
    analytics,
    plot,
    visualization,
    line,
    bar,
    pie,
    chartjs,
    chart.js,
    metrics,
    trend,
  ]
---

# Charts + dashboard (line / bar / pie from your data)

**When to copy this example:** the user wants to visualize data — a
metrics dashboard, a revenue/usage trend, a bar or pie breakdown.

**Works out of the box** once you bond the Chart.js provider — no API
keys, no external services. The chart renders client-side onto a canvas.

## What you'll install

```bash
cd /workspace
# The chart feature + its real Chart.js renderer + the ChartCard chrome.
# WITHOUT the -chartjs provider, @molecule/app-charts only draws a placeholder.
npm install @molecule/app-charts @molecule/app-charts-chartjs @molecule/app-chart-wrapper-react --workspace=app
```

## Files in this example

| Path                              | What it does                                                                                                                                                                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/ChartPanel.tsx`   | Reusable renderer: takes a `@molecule/app-charts` `ChartConfig`, draws it onto a `<canvas>` via `createChart()` in a ref + effect, wrapped in the shared `ChartCard` chrome. Destroys the chart on unmount / config change. Provider-agnostic — no `chart.js` import. |
| `app/components/RevenueChart.tsx` | Concrete usage: maps monthly `{ month, revenue }` data into a line `ChartConfig` and renders `<ChartPanel>`. Shows the `labels` + `Dataset` shape; swap `type` to change the visualization.                                                                           |

## Bond wiring (app entry, e.g. `app/src/main.tsx`, ONCE)

```typescript
import { setProvider } from '@molecule/app-charts'
import { provider } from '@molecule/app-charts-chartjs'

setProvider(provider) // now createChart() / createLineChart() render real charts
```

## Anti-patterns

- Do not skip bonding a real chart provider. `@molecule/app-charts` on
  its own renders a non-functional placeholder (it does not throw) — a
  chart that never draws usually means `setProvider(provider)` from
  `@molecule/app-charts-chartjs` was never called at startup.
- Do not import `chart.js` (or any chart library) directly in your
  components. Build a `ChartConfig` and render it through
  `@molecule/app-charts` — that keeps the renderer swappable and is the
  whole point of the feature package.
- Do not re-render onto a live canvas without `destroy()`-ing the
  previous chart. Chart.js throws "Canvas is already in use by another
  Chart instance". ChartPanel handles this in its effect cleanup — keep
  that pattern.
- Do not put a chart in a zero-height flex/grid cell. Responsive charts
  fill their container and collapse to nothing without a height — use
  `ChartCard` (its `minChartHeight` defaults to 240) or set an explicit
  height on the wrapper.
- Do not request unsupported chart types from the Chart.js provider.
  `heatmap` / `treemap` / `funnel` / `gauge` / `candlestick` throw an
  actionable error — use a supported type (line/bar/pie/doughnut/area/
  scatter/bubble/radar/polar) or bond a provider that renders them.
- Do not hardcode chart series text. Dataset `label`, title, and axis
  labels are user-facing — pass them through `t(...)` (RevenueChart
  does). Dataset colours are canvas draw values, not CSS, so a literal
  colour string is correct there.

## Verify

Pass `RevenueChart` an array of `{ month, revenue }` → a line chart
renders inside a titled card → changing the data prop re-renders the
chart (no "Canvas is already in use" error).
