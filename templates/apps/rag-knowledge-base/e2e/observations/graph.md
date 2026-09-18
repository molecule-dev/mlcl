# Page observations: /graph (KnowledgeGraph)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                           | role       | expected behavior on interaction              | success signal             | failure signal           |
| -------------------------------------------------------------------- | ---------- | --------------------------------------------- | -------------------------- | ------------------------ |
| `getByRole('heading', { level: 1 })`                                 | heading    | renders "Knowledge graph" h1                  | h1 visible                 | h1 missing               |
| `[data-testid="graph-svg-wrapper"]` or `[data-testid="graph-empty"]` | image/text | renders the SVG OR an empty state             | one of the two is visible  | neither visible          |
| `[data-testid="graph-cluster-all"]`                                  | button     | resets cluster filter to "all"                | cluster-all becomes active | cluster filter unchanged |
| `[data-testid^="graph-node-"]` (any)                                 | image      | renders one node per document once docs exist | nodes count > 0 with data  | nodes missing            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path             | what request body or query is expected |
| ------- | ------ | ---------------- | -------------------------------------- |
| mount   | GET    | /api/graph/nodes | scoped to current user                 |
| mount   | GET    | /api/graph/edges | scoped to current user                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/graph.spec.ts`
