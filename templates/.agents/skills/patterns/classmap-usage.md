---
id: classmap-usage
intent: styling
title: ClassMap styling pattern (molecule-correct)
hooks: [getClassMap]
---

# ClassMap — molecule's swappable styling layer

**Why:** molecule packages MUST NOT contain raw Tailwind class strings outside the `@molecule/app-ui-tailwind` bond. Every flagship app consumes `getClassMap()` and the ClassMap bond provides the concrete class strings.

```tsx
import { getClassMap } from '@molecule/app-ui'

export function PostCard({ post }: { post: Post }) {
  const cm = getClassMap()
  return (
    <article data-mol-id="post-card" className={cm.card({ variant: 'elevated' })}>
      <h3 className={cm.textSize('lg')}>{post.title}</h3>
      <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>{post.excerpt}</p>
    </article>
  )
}
```

**Typical methods you'll reach for:**

- `cm.button({ variant, color, size })`, `cm.input({ error })`, `cm.card({ variant })`
- `cm.flex({ direction, align, justify, gap })`, `cm.grid({ cols, gap })`
- `cm.sp('p', 4)` — spacing, `cm.stack(4)` — vertical space between children
- `cm.textSize('base' | 'lg' | 'xl')`, `cm.fontWeight('semibold')`
- `cm.textMuted`, `cm.textPrimary`, `cm.roundedFull`, `cm.borderB`

**Migration from raw Tailwind:**

- `className="flex items-center p-4"` → `className={cm.flex({ align: 'center' })} ...` plus `cm.sp('p', 4)`
- `className="text-lg font-bold"` → `className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}`
- For cases ClassMap can't express (specific hex border, complex gradients), inline `style={{ ... }}` is OK.

**Anti-patterns:**

- Don't write raw `"flex p-4 text-sm"` — that's Tailwind coupling.
- Don't call `getClassMap()` at module scope — always inside the component body.
