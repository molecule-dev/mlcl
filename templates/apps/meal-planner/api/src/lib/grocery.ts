/**
 * Pure grocery-list helpers shared by the grocery-list handler and the
 * demo seed: name normalization, aisle categorization and quantity
 * aggregation across a week's planned recipes.
 *
 * Deliberately free of any I/O so it can be unit-tested directly.
 *
 * @module
 */

export const GROCERY_CATEGORIES = [
  'produce',
  'meat',
  'seafood',
  'dairy',
  'bakery',
  'frozen',
  'pantry',
  'spices',
  'drinks',
  'other',
] as const

export type GroceryCategory = (typeof GROCERY_CATEGORIES)[number]

/**
 * Keyword → aisle classifier. Longest keyword wins so "tomato paste" lands
 * in pantry (canned) rather than produce. Everything unmatched is "other".
 */
const CATEGORY_KEYWORDS: ReadonlyArray<readonly [GroceryCategory, readonly string[]]> = [
  [
    'produce',
    [
      'apple',
      'arugula',
      'asparagus',
      'avocado',
      'banana',
      'basil',
      'beet',
      'bell pepper',
      'berry',
      'broccoli',
      'cabbage',
      'carrot',
      'cauliflower',
      'celery',
      'cilantro',
      'cucumber',
      'eggplant',
      'garlic',
      'ginger',
      'grape',
      'green bean',
      'kale',
      'leek',
      'lemon',
      'lettuce',
      'lime',
      'mango',
      'mushroom',
      'onion',
      'parsley',
      'peach',
      'pear',
      'pepper',
      'potato',
      'radish',
      'raspberry',
      'scallion',
      'spinach',
      'squash',
      'sweet potato',
      'thyme',
      'tomato',
      'zucchini',
    ],
  ],
  [
    'meat',
    [
      'bacon',
      'beef',
      'chicken',
      'chorizo',
      'ground turkey',
      'ham',
      'lamb',
      'pork',
      'sausage',
      'steak',
      'turkey',
      'veal',
    ],
  ],
  ['seafood', ['anchovy', 'cod', 'crab', 'fish', 'halibut', 'salmon', 'sardine', 'shrimp', 'tuna']],
  [
    'dairy',
    [
      'butter',
      'buttermilk',
      'cheddar',
      'cheese',
      'cream',
      'crème fraîche',
      'egg',
      'feta',
      'goat cheese',
      'greek yogurt',
      'half-and-half',
      'milk',
      'mozzarella',
      'parmesan',
      'ricotta',
      'sour cream',
      'yogurt',
    ],
  ],
  ['bakery', ['baguette', 'bread', 'bun', 'ciabatta', 'tortilla', 'pita', 'roll']],
  ['frozen', ['edamame', 'frozen', 'ice cream', 'peas (frozen)', 'puff pastry']],
  [
    'pantry',
    [
      'almond butter',
      'beans',
      'broth',
      'brown rice',
      'cashew',
      'chickpea',
      'chipotle',
      'coconut milk',
      'corn',
      'cornstarch',
      'crushed tomatoes',
      'flour',
      'honey',
      'lentils',
      'maple syrup',
      'noodle',
      'oat',
      'oil',
      'olive',
      'pasta',
      'peanut butter',
      'polenta',
      'quinoa',
      'rice',
      'spaghetti',
      'linguine',
      'penne',
      'sugar',
      'sun-dried tomato',
      'tahini',
      'tomato paste',
      'tomato sauce',
      'vinegar',
      'walnut',
      'white wine',
      'red wine',
    ],
  ],
  [
    'spices',
    [
      'allspice',
      'bay leaf',
      'cayenne',
      'chili flakes',
      'chili powder',
      'cinnamon',
      'cumin',
      'curry powder',
      'oregano',
      'paprika',
      'red pepper flakes',
      'salt',
      'sesame oil',
      'soy sauce',
      'chili sauce',
      'hot sauce',
      'vanilla',
      'peppercorn',
    ],
  ],
  ['drinks', ['coffee', 'juice', 'sparkling water', 'tea', 'wine (drinking)']],
]

/**
 * Canonicalize an ingredient name for matching: lowercase, collapse
 * internal whitespace, drop a leading count word ("2 lemons" is split by
 * the caller — here we only tidy the text).
 */
export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;]+$/, '')
    .trim()
}

/** Classify a normalized ingredient name into a grocery aisle. */
export function categorizeItem(name: string): GroceryCategory {
  const n = normalizeItemName(name)
  let best: { category: GroceryCategory; len: number } | null = null
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      const matches = n === keyword || n.includes(`${keyword} `) || n.endsWith(` ${keyword}`)
      if (matches && (!best || keyword.length > best.len)) {
        best = { category, len: keyword.length }
      }
    }
  }
  return best ? best.category : 'other'
}

/** A scaled ingredient line pulled off one planned recipe. */
export interface IngredientLine {
  item_name: string
  quantity: number | string
  unit: string
  /** Servings planned for this recipe (from the plan entry). */
  servings: number | string
  /** Servings the recipe's ingredient list is written for. */
  recipeServings: number | string
}

/** One aggregated grocery line: same name + unit summed across recipes. */
export interface AggregatedItem {
  name: string
  quantity: number
  unit: string
  category: GroceryCategory
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v ?? 0)
  return Number.isFinite(n) ? Number(n) : 0
}

/**
 * Aggregate scaled ingredient lines into one grocery list. Quantities are
 * scaled by planned-servings / recipe-servings, rounded to 2 decimals, and
 * summed per (normalized name, unit). Output keeps the longest original
 * spelling of each name and is sorted by aisle order then name.
 */
export function aggregateGroceryItems(lines: readonly IngredientLine[]): AggregatedItem[] {
  const buckets = new Map<string, AggregatedItem & { display: string }>()
  for (const line of lines) {
    const key = `${normalizeItemName(line.item_name)}|${line.unit.trim().toLowerCase()}`
    const recipeServings = num(line.recipeServings) || 1
    const servings = num(line.servings) || 1
    const scaled = (num(line.quantity) * servings) / recipeServings
    const existing = buckets.get(key)
    if (existing) {
      existing.quantity += scaled
      if (line.item_name.length > existing.display.length) existing.display = line.item_name
    } else {
      buckets.set(key, {
        name: normalizeItemName(line.item_name),
        display: line.item_name.trim(),
        quantity: scaled,
        unit: line.unit.trim(),
        category: categorizeItem(line.item_name),
      })
    }
  }
  return [...buckets.values()]
    .map(({ display, ...item }) => ({ ...item, name: display, quantity: round2(item.quantity) }))
    .sort((a, b) => {
      const ca = GROCERY_CATEGORIES.indexOf(a.category)
      const cb = GROCERY_CATEGORIES.indexOf(b.category)
      return ca !== cb ? ca - cb : a.name.localeCompare(b.name)
    })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
