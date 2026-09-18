<script lang="ts">
  import { showcaseComponents, generateCombinations } from '@molecule/app-ui-showcase'
  import { getClassMap } from '@molecule/app-ui'
  import {
    getButtonClasses,
    getBadgeClasses,
    getCardClasses,
    getSpinnerClasses,
    getSeparatorClasses,
    getTextareaClasses,
    getSelectClasses,
    getAvatarClasses,
    getAvatarFallbackClass,
    getAvatarInitialsClass,
    getInitials,
    getProgressClasses,
    getProgressIndicatorClasses,
    getProgressPercentage,
    getProgressWrapperClass,
    getInputClasses,
    getInputWrapperClass,
    getInputInnerClass,
    getInputLabelClasses,
    getInputErrorClass,
    getCheckboxClasses,
    getCheckboxLabelWrapperClass,
    getCheckboxLabelTextClass,
    getRadioClasses,
    getRadioGroupClasses,
    getRadioOptionLabelClass,
    getRadioOptionTextClass,
    getSwitchClasses,
    getSwitchThumbClasses,
    getSwitchWrapperClasses,
    getSwitchLabelTextClass,
    getTableClasses,
    getTableWrapperClass,
    getTableHeaderClass,
    getTableBodyClass,
    getTableRowClasses,
    getTableHeadClasses,
    getTableCellClasses,
    getTabsListClasses,
    getTabsTriggerClasses,
    getTabsContentClass,
    getAccordionClasses,
    getAccordionItemClass,
    getAccordionTriggerClasses,
    getAccordionContentClass,
    getAccordionContentInnerClass,
    getAccordionChevronClass,
    getAccordionChevronIconData,
    getPaginationClasses,
    getPaginationContentClass,
    getPaginationItemClasses,
    getPaginationEllipsisClass,
    getPaginationIconData,
    generatePaginationRange,
    getAlertClasses,
    getAlertTitleClass,
    getAlertDescriptionClass,
    getAlertIconWrapperClass,
    getAlertContentClass,
    getAlertIconData,
    getSkeletonClasses,
    getSkeletonStyle,
    getToastClasses,
    getToastTitleClass,
    getToastDescriptionClass,
    getToastIconWrapperClass,
    getToastContentWrapperClass,
    getToastIconData,
  } from '@molecule/app-ui-svelte'

  /** Render icon data as an inline SVG HTML string for {@html} usage. */
  function renderIconSvg(iconData: any, className?: string): string {
    if (!iconData) return ''
    const vb = iconData.viewBox || '0 0 20 20'
    const fill = iconData.fill || 'currentColor'
    const a: string[] = [`xmlns="http://www.w3.org/2000/svg"`, `viewBox="${vb}"`]
    if (className) a.push(`class="${className}"`)
    if (iconData.stroke || fill === 'none') {
      a.push('fill="none"', 'stroke="currentColor"')
      if (iconData.strokeWidth) a.push(`stroke-width="${iconData.strokeWidth}"`)
      if (iconData.strokeLinecap) a.push(`stroke-linecap="${iconData.strokeLinecap}"`)
      if (iconData.strokeLinejoin) a.push(`stroke-linejoin="${iconData.strokeLinejoin}"`)
    } else {
      a.push(`fill="${fill}"`)
    }
    const inner = iconData.svg || (iconData.paths || []).map((p: any) => {
      const pa: string[] = [`d="${p.d}"`]
      if (p.fill) pa.push(`fill="${p.fill}"`)
      if (p.fillRule) pa.push(`fill-rule="${p.fillRule}"`)
      if (p.clipRule) pa.push(`clip-rule="${p.clipRule}"`)
      if (p.opacity !== undefined) pa.push(`opacity="${p.opacity}"`)
      return `<path ${pa.join(' ')} />`
    }).join('')
    return `<svg ${a.join(' ')}>${inner}</svg>`
  }

  const cm = getClassMap()
  const specs = showcaseComponents
</script>

<div style="padding: 24px">
  <h1 style="font-size: 24px; margin-bottom: 24px">Molecule UI Showcase — Svelte</h1>
  {#each specs as spec, specIndex}
    {@const combos = generateCombinations(spec.propMatrix)}
    <section
      data-component={spec.name}
      data-spec-index={specIndex}
      style="margin-bottom: 32px"
    >
      <h2 style="font-size: 18px; margin-bottom: 12px; border-bottom: 1px solid #444; padding-bottom: 4px">
        {spec.name}{specs.filter(s => s.name === spec.name).length > 1 ? ` (${specIndex})` : ''}
      </h2>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start">
        {#each combos as combo}
          {@const props = { ...(spec.defaultProps || {}), ...combo }}

          {#if spec.name === 'Button'}
            <button class={getButtonClasses(props)}>{spec.children}</button>

          {:else if spec.name === 'Badge'}
            <span class={getBadgeClasses(props)}>{spec.children}</span>

          {:else if spec.name === 'Card'}
            <div class={getCardClasses(props)}>{spec.children}</div>

          {:else if spec.name === 'Spinner'}
            <div class={getSpinnerClasses(props)}></div>

          {:else if spec.name === 'Separator'}
            <div class={getSeparatorClasses(props)}></div>

          {:else if spec.name === 'Textarea'}
            <textarea
              class={getTextareaClasses(props)}
              placeholder={String(props.placeholder || '')}
              rows={Number(props.rows) || 3}
            ></textarea>

          {:else if spec.name === 'Select'}
            <select class={getSelectClasses(props)}>
              {#if props.placeholder}
                <option value="" disabled selected>{props.placeholder}</option>
              {/if}
              {#if Array.isArray(props.options)}
                {#each props.options as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              {/if}
            </select>

          {:else if spec.name === 'Avatar'}
            <span class={getAvatarClasses(props)}>
              <span class={getAvatarFallbackClass()}>
                <span class={getAvatarInitialsClass()}>
                  {getInitials(String(props.name || ''))}
                </span>
              </span>
            </span>

          {:else if spec.name === 'Progress'}
            {@const pct = getProgressPercentage(Number(props.value), Number(props.max || 100))}
            <div class={getProgressWrapperClass()}>
              <div class={getProgressClasses({ size: props.size })} role="progressbar" aria-valuenow={Number(props.value)} aria-valuemin={0} aria-valuemax={Number(props.max || 100)}>
                <div
                  class={getProgressIndicatorClasses({ color: props.color })}
                  style="transform: translateX(-{100 - pct}%)"
                ></div>
              </div>
            </div>

          {:else if spec.name === 'Input'}
            <div class={getInputWrapperClass()}>
              {#if props.label}
                <label class={getInputLabelClasses({ required: !!props.required })}>
                  {props.label}
                </label>
              {/if}
              <div class={getInputInnerClass()}>
                <input
                  class={getInputClasses({ size: props.size, error: props.error })}
                  placeholder={String(props.placeholder || '')}
                />
              </div>
              {#if props.error}
                <p class={getInputErrorClass()}>{props.error}</p>
              {/if}
            </div>

          {:else if spec.name === 'Checkbox'}
            <label class={getCheckboxLabelWrapperClass()}>
              <input
                type="checkbox"
                checked={!!props.checked}
                class={getCheckboxClasses({ error: props.error })}
                data-state={props.checked ? 'checked' : 'unchecked'}
              />
              {#if props.label}
                <span class={getCheckboxLabelTextClass(!!props.disabled)}>
                  {props.label}
                </span>
              {/if}
            </label>

          {:else if spec.name === 'RadioGroup'}
            <div role="radiogroup">
              <div class={getRadioGroupClasses(String(props.direction || 'vertical'))}>
                {#if Array.isArray(props.options)}
                  {#each props.options as opt}
                    <label class={getRadioOptionLabelClass(!!props.disabled)}>
                      <input
                        type="radio"
                        value={opt.value}
                        checked={props.value === opt.value}
                        class={getRadioClasses({ error: props.error })}
                        data-state={props.value === opt.value ? 'checked' : 'unchecked'}
                      />
                      <span class={getRadioOptionTextClass()}>
                        {opt.label}
                      </span>
                    </label>
                  {/each}
                {/if}
              </div>
            </div>

          {:else if spec.name === 'Switch'}
            <label class={getSwitchWrapperClasses({ disabled: !!props.disabled })}>
              <button
                type="button"
                role="switch"
                aria-checked={!!props.checked}
                data-state={props.checked ? 'checked' : 'unchecked'}
                class={getSwitchClasses({ size: props.size })}
              >
                <span
                  data-state={props.checked ? 'checked' : 'unchecked'}
                  class={getSwitchThumbClasses({ size: props.size })}
                ></span>
              </button>
              {#if props.label}
                <span class={getSwitchLabelTextClass()}>
                  {props.label}
                </span>
              {/if}
            </label>

          {:else if spec.name === 'Table'}
            {@const columns = Array.isArray(props.columns) ? props.columns : []}
            {@const data = Array.isArray(props.data) ? props.data : []}
            <div class={getTableWrapperClass()}>
              <table class={getTableClasses({ bordered: !!props.bordered })}>
                <thead class={getTableHeaderClass()}>
                  <tr class={getTableRowClasses()}>
                    {#each columns as col}
                      <th class={getTableHeadClasses({ align: col.align })}>{col.header}</th>
                    {/each}
                  </tr>
                </thead>
                <tbody class={getTableBodyClass()}>
                  {#each data as row, i}
                    <tr class={getTableRowClasses({ striped: !!props.striped, hoverable: !!props.hoverable, index: i })}>
                      {#each columns as col}
                        <td class={getTableCellClasses({ align: col.align })}>{row[col.key]}</td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>

          {:else if spec.name === 'Tabs'}
            {@const items = Array.isArray(props.items) ? props.items : []}
            {@const activeValue = props.defaultValue || (items[0]?.value ?? '')}
            {@const activeItem = items.find((i: any) => i.value === activeValue)}
            <div>
              <div role="tablist" class={getTabsListClasses({ fitted: !!props.fitted })}>
                {#each items as item}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={item.value === activeValue}
                    data-state={item.value === activeValue ? 'active' : 'inactive'}
                    disabled={!!item.disabled}
                    class={getTabsTriggerClasses({ fitted: !!props.fitted })}
                  >
                    {item.label}
                  </button>
                {/each}
              </div>
              {#if activeItem?.content}
                <div role="tabpanel" class={getTabsContentClass()}>
                  {activeItem.content}
                </div>
              {/if}
            </div>

          {:else if spec.name === 'Accordion'}
            {@const items = Array.isArray(props.items) ? props.items : []}
            {@const expandedItems = props.defaultValue ? [props.defaultValue] : []}
            <div class={getAccordionClasses()}>
              {#each items as item}
                {@const isExpanded = expandedItems.includes(item.value)}
                <div class={getAccordionItemClass()} data-state={isExpanded ? 'open' : 'closed'}>
                  <button
                    class={getAccordionTriggerClasses()}
                    aria-expanded={isExpanded}
                    data-state={isExpanded ? 'open' : 'closed'}
                  >
                    {item.header}
                    {@html renderIconSvg(getAccordionChevronIconData(), getAccordionChevronClass())}
                  </button>
                  <div
                    class={getAccordionContentClass()}
                    data-state={isExpanded ? 'open' : 'closed'}
                    style="display: {isExpanded ? 'block' : 'none'}"
                  >
                    <div class={getAccordionContentInnerClass()}>
                      {item.content}
                    </div>
                  </div>
                </div>
              {/each}
            </div>

          {:else if spec.name === 'Pagination'}
            {@const page = Number(props.page) || 1}
            {@const totalPages = Number(props.totalPages) || 1}
            {@const size = String(props.size || 'md')}
            {@const range = generatePaginationRange(page, totalPages, 1, 1)}
            <nav role="navigation" class={getPaginationClasses()}>
              <ul class={getPaginationContentClass()}>
                {#if props.showFirstLast}
                  <li>
                    <button type="button" class={getPaginationItemClasses({ active: false, size })} disabled={page === 1}>
                      {@html renderIconSvg(getPaginationIconData('first'), cm.iconSm)}
                    </button>
                  </li>
                {/if}
                {#if props.showPrevNext}
                  <li>
                    <button type="button" class={getPaginationItemClasses({ active: false, size })} disabled={page === 1}>
                      {@html renderIconSvg(getPaginationIconData('prev'), cm.iconSm)}
                    </button>
                  </li>
                {/if}
                {#each range as item}
                  {#if item === 'ellipsis'}
                    <li>
                      <span class={getPaginationEllipsisClass()} aria-hidden="true">
                        {@html renderIconSvg(getPaginationIconData('ellipsis'), cm.iconSm)}
                      </span>
                    </li>
                  {:else}
                    <li>
                      <button
                        type="button"
                        class={getPaginationItemClasses({ active: item === page, size })}
                        aria-current={item === page ? 'page' : undefined}
                      >
                        {item}
                      </button>
                    </li>
                  {/if}
                {/each}
                {#if props.showPrevNext}
                  <li>
                    <button type="button" class={getPaginationItemClasses({ active: false, size })} disabled={page === totalPages}>
                      {@html renderIconSvg(getPaginationIconData('next'), cm.iconSm)}
                    </button>
                  </li>
                {/if}
                {#if props.showFirstLast}
                  <li>
                    <button type="button" class={getPaginationItemClasses({ active: false, size })} disabled={page === totalPages}>
                      {@html renderIconSvg(getPaginationIconData('last'), cm.iconSm)}
                    </button>
                  </li>
                {/if}
              </ul>
            </nav>

          {:else if spec.name === 'Alert'}
            {@const iconData = getAlertIconData(String(props.status))}
            <div role="alert" class={getAlertClasses({ status: props.status })}>
              {#if iconData}
                <span class={getAlertIconWrapperClass()}>
                  {@html renderIconSvg(iconData, cm.iconMd)}
                </span>
              {/if}
              <div class={getAlertContentClass()}>
                {#if props.title}
                  <h5 class={getAlertTitleClass()}>{props.title}</h5>
                {/if}
                <div class={getAlertDescriptionClass()}>
                  {spec.children || ''}
                </div>
              </div>
            </div>

          {:else if spec.name === 'Skeleton'}
            <div
              class={getSkeletonClasses({ animation: props.animation })}
              style={getSkeletonStyle({ width: props.width, height: props.height })}
            ></div>

          {:else if spec.name === 'Toast'}
            {@const iconData = getToastIconData(String(props.status))}
            <div role="alert" data-state="open" class={getToastClasses({ status: props.status })}>
              {#if iconData}
                <span class={getToastIconWrapperClass()}>
                  {@html renderIconSvg(iconData, cm.iconMd)}
                </span>
              {/if}
              <div class={getToastContentWrapperClass()}>
                {#if props.title}
                  <div class={getToastTitleClass()}>{props.title}</div>
                {/if}
                {#if props.description}
                  <div class={getToastDescriptionClass()}>{props.description}</div>
                {/if}
              </div>
            </div>

          {/if}
        {/each}
      </div>
    </section>
  {/each}
</div>
