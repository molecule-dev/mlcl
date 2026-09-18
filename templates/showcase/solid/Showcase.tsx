import type { Component } from 'solid-js'
import { For, Show } from 'solid-js'

import { generateCombinations, showcaseComponents } from '@molecule/app-ui-showcase'
import * as UI from '@molecule/app-ui-solid'

const components = UI as Record<string, Component<Record<string, unknown>>>

export const Showcase: Component = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ 'font-size': '24px', 'margin-bottom': '24px' }}>Molecule UI Showcase — Solid</h1>
      <For each={showcaseComponents}>
        {(spec, specIndex) => {
          const Comp = components[spec.name]
          const combos = generateCombinations(spec.propMatrix)
          const hasDupes = showcaseComponents.filter((s) => s.name === spec.name).length > 1
          return (
            <Show when={Comp}>
              <section
                data-component={spec.name}
                data-spec-index={specIndex()}
                style={{ 'margin-bottom': '32px' }}
              >
                <h2
                  style={{
                    'font-size': '18px',
                    'margin-bottom': '12px',
                    'border-bottom': '1px solid #444',
                    'padding-bottom': '4px',
                  }}
                >
                  {spec.name}
                  {hasDupes ? ` (${specIndex()})` : ''}
                </h2>
                <div
                  style={{
                    display: 'flex',
                    'flex-wrap': 'wrap',
                    gap: '8px',
                    'align-items': 'flex-start',
                  }}
                >
                  <For each={combos}>
                    {(combo) => (
                      <Comp {...spec.defaultProps} {...combo}>
                        {spec.children !== false ? spec.children || undefined : undefined}
                      </Comp>
                    )}
                  </For>
                </div>
              </section>
            </Show>
          )
        }}
      </For>
    </div>
  )
}
