/**
 * Client-side map export — Markdown outline, standalone SVG, PNG raster.
 *
 * Tier-gated upstream: the editor enables these only when
 * `GET /billing/status` reports `limits.canExport` (free=false, pro/team=true,
 * api/src/tiers.ts). Everything here is pure client work — no server round-trip
 * beyond the data the editor already holds.
 *
 * @module
 */

export interface ExportNode {
  id: string
  parent_id: string | null
  text: string
  x: number
  y: number
}

export type ExportFormat = 'markdown' | 'svg' | 'png'

/** Indented outline from the node forest (roots first, then children in order). */
export function buildMarkdown(title: string, nodes: ExportNode[]): string {
  const childrenOf = new Map<string, ExportNode[]>()
  const roots: ExportNode[] = []
  for (const n of nodes) {
    if (n.parent_id) {
      const list = childrenOf.get(n.parent_id) ?? []
      list.push(n)
      childrenOf.set(n.parent_id, list)
    } else {
      roots.push(n)
    }
  }
  const lines: string[] = [`# ${title || 'Untitled mind map'}`, '']
  const walk = (list: ExportNode[], depth: number): void => {
    for (const n of list) {
      lines.push(`${'  '.repeat(depth)}- ${n.text || 'Untitled'}`)
      walk(childrenOf.get(n.id) ?? [], depth + 1)
    }
  }
  walk(roots, 0)
  // Orphans (parent missing — mid-delete race) still export, at top level.
  const seen = new Set<string>()
  const collect = (list: ExportNode[]): void => {
    for (const n of list) {
      seen.add(n.id)
      collect(childrenOf.get(n.id) ?? [])
    }
  }
  collect(roots)
  const orphans = nodes.filter((n) => !seen.has(n.id) && n.parent_id)
  if (orphans.length) {
    lines.push('')
    walk(orphans, 0)
  }
  lines.push('')
  return lines.join('\n')
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Serialize the live canvas <svg> into a standalone SVG string with an opaque
 * background (the app draws on translucent theme surfaces that would render
 * black in standalone viewers otherwise). Theme `var(--…)` references are
 * baked to their computed values — a standalone file has no app CSS to
 * resolve them against.
 */
export function serializeSvg(svg: SVGSVGElement, background = '#ffffff'): string | null {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', SVG_NS)
  const viewBox = (clone.getAttribute('viewBox') ?? '0 0 720 480').split(/[\s,]+/).map(Number)
  const w = Number.isFinite(viewBox[2]) ? viewBox[2] : 720
  const h = Number.isFinite(viewBox[3]) ? viewBox[3] : 480
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  const bg = document.createElementNS(SVG_NS, 'rect')
  bg.setAttribute('x', '0')
  bg.setAttribute('y', '0')
  bg.setAttribute('width', '100%')
  bg.setAttribute('height', '100%')
  bg.setAttribute('fill', background)
  clone.insertBefore(bg, clone.firstChild)
  let out = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`
  const rootStyle = getComputedStyle(document.documentElement)
  out = out.replace(/var\((--[a-zA-Z0-9-]+)[^)]*\)/g, (_m, name: string) => {
    const value = rootStyle.getPropertyValue(name).trim()
    return value || 'transparent'
  })
  return out
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function slugifyFilename(title: string): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'mind-map'
  return slug
}

/** Rasterize an SVG string to a PNG blob at `scale`x. Rejects on any failure. */
export function svgToPngBlob(
  svgString: string,
  width: number,
  height: number,
  scale = 2,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = width * scale
        canvas.height = height * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('canvas 2d context unavailable'))
          return
        }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('canvas.toBlob returned null'))
        }, 'image/png')
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    }
    img.onerror = () => reject(new Error('could not rasterize the SVG'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
  })
}
