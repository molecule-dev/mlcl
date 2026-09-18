import React from 'react'

import * as UI from '@molecule/app-ui-react'
import { generateCombinations, showcaseComponents } from '@molecule/app-ui-showcase'

const components = UI as Record<string, React.ComponentType<Record<string, unknown>>>

export function Showcase(): React.ReactNode {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Molecule UI Showcase — React</h1>
      {showcaseComponents.map((spec, specIndex) => {
        const Component = components[spec.name]
        if (!Component) return null
        const combos = generateCombinations(spec.propMatrix)
        return (
          <section
            key={`${spec.name}-${specIndex}`}
            data-component={spec.name}
            data-spec-index={specIndex}
            style={{ marginBottom: 32 }}
          >
            <h2
              style={{
                fontSize: 18,
                marginBottom: 12,
                borderBottom: '1px solid #444',
                paddingBottom: 4,
              }}
            >
              {spec.name}
              {showcaseComponents.filter((s) => s.name === spec.name).length > 1
                ? ` (${specIndex})`
                : ''}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
              {combos.map((combo, i) => (
                <Component key={i} {...spec.defaultProps} {...combo}>
                  {spec.children !== false ? spec.children || undefined : undefined}
                </Component>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
