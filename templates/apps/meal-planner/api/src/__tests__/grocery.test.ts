import { describe, expect, it } from 'vitest'

import {
  aggregateGroceryItems,
  categorizeItem,
  GROCERY_CATEGORIES,
  normalizeItemName,
} from '../lib/grocery.js'

// The grocery list is the product's signature feature; its aggregation and
// aisle classification are pure functions, so their contracts are pinned
// here (scaling, same-name+unit merging, aisle order, pantry name matching).

describe('normalizeItemName', () => {
  it('lowercases, collapses whitespace and drops trailing punctuation', () => {
    expect(normalizeItemName('  Olive   Oil. ')).toBe('olive oil')
  })
})

describe('categorizeItem', () => {
  it('classifies by longest keyword so multi-word items win', () => {
    expect(categorizeItem('tomato paste')).toBe('pantry')
    expect(categorizeItem('crushed tomatoes')).toBe('pantry')
    expect(categorizeItem('cherry tomato')).toBe('produce')
  })

  it('covers the common aisles', () => {
    expect(categorizeItem('chicken thighs')).toBe('meat')
    expect(categorizeItem('salmon fillets')).toBe('seafood')
    expect(categorizeItem('greek yogurt')).toBe('dairy')
    expect(categorizeItem('baguette')).toBe('bakery')
    expect(categorizeItem('spaghetti')).toBe('pantry')
    expect(categorizeItem('cumin')).toBe('spices')
  })

  it('falls back to other', () => {
    expect(categorizeItem('unobtanium')).toBe('other')
  })

  it('every category it returns is in the ordered category list', () => {
    for (const item of ['apple', 'beef', 'butter', 'bread', 'pasta', 'salt', 'coffee']) {
      expect(GROCERY_CATEGORIES).toContain(categorizeItem(item))
    }
  })
})

describe('aggregateGroceryItems', () => {
  const line = (over: Partial<Parameters<typeof aggregateGroceryItems>[0][number]>) => ({
    item_name: 'olive oil',
    quantity: 2,
    unit: 'tbsp',
    servings: 2,
    recipeServings: 4,
    ...over,
  })

  it('scales quantities by planned servings / recipe servings', () => {
    const [item] = aggregateGroceryItems([line({ quantity: 4, servings: 6, recipeServings: 2 })])
    expect(item?.quantity).toBe(12)
  })

  it('sums same name+unit across recipes and keeps the longest spelling', () => {
    const items = aggregateGroceryItems([
      line({ item_name: 'olive oil', quantity: 2, unit: 'tbsp', servings: 4 }),
      line({ item_name: 'Olive  Oil', quantity: 3, unit: 'tbsp', servings: 4 }),
      line({ item_name: 'olive oil', quantity: 1, unit: 'ml', servings: 4 }),
    ])
    expect(items).toHaveLength(2)
    const tbsp = items.find((i) => i.unit === 'tbsp')
    expect(tbsp?.quantity).toBe(5)
    expect(tbsp?.name).toBe('Olive  Oil')
  })

  it('treats different units as separate lines', () => {
    const items = aggregateGroceryItems([
      line({ unit: 'g', quantity: 100 }),
      line({ unit: 'ml', quantity: 200 }),
    ])
    expect(items).toHaveLength(2)
  })

  it('coerces string quantities (numeric columns arrive as strings)', () => {
    const [item] = aggregateGroceryItems([
      line({ quantity: '2.5' as unknown as number, servings: '4' as unknown as number }),
    ])
    expect(item?.quantity).toBe(2.5)
  })

  it('sorts by aisle order then name', () => {
    const items = aggregateGroceryItems([
      line({ item_name: 'pasta', unit: 'g' }),
      line({ item_name: 'apple', unit: '' }),
      line({ item_name: 'anchovy', unit: '' }),
    ])
    expect(items.map((i) => i.name)).toEqual(['apple', 'anchovy', 'pasta'])
  })

  it('defaults a zero recipe-servings to 1 instead of dividing by zero', () => {
    const [item] = aggregateGroceryItems([line({ recipeServings: 0 })])
    expect(item?.quantity).toBe(4)
  })
})
