<script lang="ts">
  import type { Component } from 'svelte'

  import { generateCombinations, showcaseComponents } from '@molecule/app-ui-showcase'
  import {
    Accordion,
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    Checkbox,
    Input,
    Pagination,
    Progress,
    RadioGroup,
    Select,
    Separator,
    Skeleton,
    Spinner,
    Switch,
    Table,
    Tabs,
    Textarea,
    Toast,
  } from '@molecule/app-ui-svelte'

  /**
   * The kit's components, by the catalogue name that renders them, in the catalogue's order.
   * The catalogue supplies each component's own props at this dynamic boundary.
   */
  const components: Record<string, Component<any>> = {
    Button,
    Input,
    Textarea,
    Select,
    Checkbox,
    RadioGroup,
    Switch,
    Badge,
    Avatar,
    Table,
    Tabs,
    Accordion,
    Pagination,
    Alert,
    Spinner,
    Progress,
    Skeleton,
    Toast,
    Card,
    Separator,
  }

  const specs = showcaseComponents
</script>

<div style="padding: 24px">
  <h1 style="font-size: 24px; margin-bottom: 24px">Molecule UI Showcase</h1>
  {#each specs as spec, specIndex}
    {@const Component = components[spec.name]}
    {#if Component}
      {@const combos = generateCombinations(spec.propMatrix)}
      <section data-component={spec.name} data-spec-index={specIndex} style="margin-bottom: 32px">
        <h2
          style="font-size: 18px; margin-bottom: 12px; border-bottom: 1px solid #444; padding-bottom: 4px"
        >
          {spec.name}{specs.filter((s) => s.name === spec.name).length > 1 ? ` (${specIndex})` : ''}
        </h2>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start">
          {#each combos as combo}
            {#if spec.children}
              <Component {...spec.defaultProps} {...combo}>{spec.children}</Component>
            {:else}
              <Component {...spec.defaultProps} {...combo} />
            {/if}
          {/each}
        </div>
      </section>
    {/if}
  {/each}
</div>
