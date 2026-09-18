import { getIcon } from '@molecule/app-icons'
import { For, Show } from 'solid-js'

interface IconProps {
  name: string
  size?: number
  class?: string
}

export function Icon(props: IconProps) {
  const icon = () => getIcon(props.name)
  const size = () => props.size ?? 20
  const viewBox = () => icon().viewBox || '0 0 20 20'
  const isStroked = () => !!icon().stroke

  return (
    <Show
      when={!icon().svg}
      fallback={
        <svg
          width={size()}
          height={size()}
          viewBox={viewBox()}
          fill={icon().fill || 'none'}
          class={props.class}
          innerHTML={icon().svg}
        />
      }
    >
      <svg
        width={size()}
        height={size()}
        viewBox={viewBox()}
        fill={isStroked() ? 'none' : (icon().fill || 'currentColor')}
        stroke={isStroked() ? icon().stroke : undefined}
        stroke-width={isStroked() ? icon().strokeWidth : undefined}
        stroke-linecap={isStroked() ? icon().strokeLinecap : undefined}
        stroke-linejoin={isStroked() ? icon().strokeLinejoin : undefined}
        class={props.class}
      >
        <For each={icon().paths}>
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
    </Show>
  )
}
