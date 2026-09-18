import { defineComponent, h } from 'vue'

import { generateCombinations, showcaseComponents } from '@molecule/app-ui-showcase'
import * as UI from '@molecule/app-ui-vue'

const components = UI as Record<string, ReturnType<typeof defineComponent>>

export default defineComponent({
  name: 'Showcase',
  setup() {
    return () =>
      h('div', { style: 'padding: 24px' }, [
        h('h1', { style: 'font-size: 24px; margin-bottom: 24px' }, 'Molecule UI Showcase — Vue'),
        ...showcaseComponents.map((spec, specIndex) => {
          const Component = components[spec.name]
          if (!Component) return null
          const combos = generateCombinations(spec.propMatrix)
          const label =
            showcaseComponents.filter((s) => s.name === spec.name).length > 1
              ? `${spec.name} (${specIndex})`
              : spec.name
          return h(
            'section',
            {
              key: `${spec.name}-${specIndex}`,
              'data-component': spec.name,
              'data-spec-index': specIndex,
              style: 'margin-bottom: 32px',
            },
            [
              h(
                'h2',
                {
                  style:
                    'font-size: 18px; margin-bottom: 12px; border-bottom: 1px solid #444; padding-bottom: 4px',
                },
                label,
              ),
              h(
                'div',
                {
                  style: 'display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start',
                },
                combos.map((combo, i) =>
                  h(
                    Component,
                    { key: i, ...spec.defaultProps, ...combo },
                    spec.children !== false && spec.children ? () => spec.children : undefined,
                  ),
                ),
              ),
            ],
          )
        }),
      ])
  },
})
