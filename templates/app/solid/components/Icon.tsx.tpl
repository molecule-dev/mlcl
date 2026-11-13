import type { JSX } from 'solid-js'
import { For, Show, splitProps } from 'solid-js'
import { getIcon, type IconData, type IconName } from '@molecule/app-icons'

/**
 * Props for {@link Icon}.
 *
 * Extends the SVG attributes so callers can pass any SVG / HTML attribute the
 * underlying `<svg>` accepts, including `data-mol-id`, `aria-*`, `role`, event
 * handlers, `style`, etc. — without the component needing to enumerate them.
 */
export type IconProps = Omit<
  JSX.SvgSVGAttributes<SVGSVGElement>,
  'width' | 'height' | 'viewBox' | 'fill'
> & {
  /**
   * Name of the glyph to look up in the bonded icon set. Typed as
   * {@link IconName} so a typo fails the type-check instead of throwing at
   * render time; sets with extra glyphs augment `CustomIconNames` in
   * `@molecule/app-icons` to widen it.
   */
  name: IconName
  /** Width and height of the rendered SVG in pixels. Defaults to 20. */
  size?: number
  /** Class name forwarded to the root `<svg>`. */
  className?: string
}

/**
 * Renders an SVG glyph looked up by `name` from the bonded
 * `@molecule/app-icons` set.
 *
 * Handles both icon-data shapes returned by the bond:
 *   1. Pre-rendered SVG markup (`icon.svg`) — injected via `innerHTML`. The
 *      bond is the trust boundary; only bond a set that controls its own SVG
 *      strings.
 *   2. Structured paths (`icon.paths`) — rendered as discrete `<path>`
 *      children, with optional stroke styling forwarded from the icon set.
 *
 * Any extra HTML/SVG attribute (e.g. `data-mol-id`, `aria-label`,
 * `role="img"`, `onClick`) is forwarded to the root `<svg>` via spread.
 *
 * Decorative by default: when the caller passes no `aria-label` /
 * `aria-labelledby` / `role`, the SVG is rendered `aria-hidden` +
 * `focusable="false"` so screen readers skip it (an unnamed inline SVG is
 * announced as a stray "image" by some combos). Passing any of those props
 * opts the icon into the accessibility tree.
 *
 * A glyph missing from the bonded set (icon-set version skew, a custom set
 * with a smaller catalog) must NOT crash the whole app — it warns and renders
 * a neutral placeholder circle instead.
 *
 * @param props - {@link IconProps}
 * @returns An `<svg>` element rendering the named glyph.
 */
export function Icon(props: IconProps) {
  const [local, rest] = splitProps(props, ['className', 'name', 'size'])
  const size = (): number => local.size ?? 20
  const hasAccessibleName = (): boolean =>
    rest['aria-label'] != null || rest['aria-labelledby'] != null || rest.role != null
  /**
   * React renders the decorative flags only when the caller passed no
   * accessible name; they are placed BEFORE the caller's own attributes so an
   * explicit aria-hidden/role wins.
   */
  const decorativeHidden = (): true | undefined => (hasAccessibleName() ? undefined : true)
  const decorativeFocusable = (): string | undefined => (hasAccessibleName() ? undefined : 'false')

  const loadIcon = (): IconData | null => {
    try {
      return getIcon(local.name)
    } catch (error) {
      console.warn(`Icon: no bonded glyph for "${local.name}" — rendering a placeholder.`, error)
      return null
    }
  }

  return (
    <Show
      when={loadIcon()}
      keyed
      fallback={
        <svg
          width={size()}
          height={size()}
          viewBox="0 0 20 20"
          fill="none"
          class={local.className}
          aria-hidden={true}
          attr:focusable="false"
          {...rest}
        >
          <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.15" />
        </svg>
      }
    >
      {(icon) => (
        <Show
          when={icon.svg}
          fallback={
            <svg
              width={size()}
              height={size()}
              viewBox={icon.viewBox || '0 0 20 20'}
              fill={icon.stroke ? 'none' : icon.fill || 'currentColor'}
              aria-hidden={decorativeHidden()}
              attr:focusable={decorativeFocusable()}
              {...(icon.stroke
                ? {
                    stroke: icon.stroke,
                    'stroke-width': icon.strokeWidth,
                    'stroke-linecap': icon.strokeLinecap,
                    'stroke-linejoin': icon.strokeLinejoin,
                  }
                : {})}
              class={local.className}
              {...rest}
            >
              <For each={icon.paths}>
                {(p) => (
                  <path
                    d={p.d}
                    fill={p.fill || undefined}
                    fill-rule={p.fillRule || undefined}
                    clip-rule={p.clipRule || undefined}
                    opacity={p.opacity !== undefined ? p.opacity : undefined}
                  />
                )}
              </For>
            </svg>
          }
        >
          <svg
            width={size()}
            height={size()}
            viewBox={icon.viewBox || '0 0 20 20'}
            fill={icon.fill || 'none'}
            class={local.className}
            innerHTML={icon.svg}
            aria-hidden={decorativeHidden()}
            attr:focusable={decorativeFocusable()}
            {...rest}
          />
        </Show>
      )}
    </Show>
  )
}
