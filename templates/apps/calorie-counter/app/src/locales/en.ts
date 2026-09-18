/**
 * App-specific English translations for calorie-counter.
 *
 * Keys here are merged with the per-bond `app/src/locales/en/*.ts` files at
 * runtime (the i18n provider in `config.ts` registers both). Keep namespaces
 * scoped to product features so handlers / pages can use stable `t('ns.key')`
 * lookups across languages.
 */

export default {
  pricing: {
    heading: 'Choose your {{name}} plan',
    limits: {
      diary: '{{value}} diary entries',
      foods: '{{value}} custom foods',
      goals: '{{value}} nutrition goals',
      meals: '{{value}} saved meals',
      nutrition: '{{value}} nutrition reports',
      advanced: 'Advanced features: {{enabled}}',
      export: 'Data export: {{enabled}}',
    },
  },
  nosh: {
    today: {
      heading: 'Good afternoon, {{name}} 🌿',
      date: 'Tuesday, Oct 14',
      todayPill: 'Today',
      remaining: 'calories remaining',
      macroTitle: 'Macronutrients',
      addFood: 'Add food',
      streakHeadline: '{{count}}-day streak! 🔥',
      streakSubtitle: 'Keep it up — every bite counts.',
      calUnit: 'cal',
      dinnerEmpty: "What's for dinner?",
      tapToLog: 'Tap to log',
      meal: {
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner',
        snacks: 'Snacks',
      },
      macros: {
        protein: 'Protein',
        carbs: 'Carbs',
        fat: 'Fat',
      },
      quickAdd: {
        water: 'Water',
        snack: 'Snack',
        coffee: 'Coffee',
        tea: 'Tea',
      },
      water: {
        title: 'Water',
      },
    },
    landing: {
      footer: {
        tagline: '© {{app}} — {{tagline}}.',
        signIn: 'Sign in',
        signUp: 'Sign up',
      },
    },
  },
  diary: {
    dateRequired: 'Date is required',
    dateRangeRequired: 'Start and end dates are required',
    quickAdd: 'Quick Add',
    notFound: 'Diary entry not found',
  },
  food: {
    notFound: 'Food not found',
    barcodeNotFound: 'Food not found for this barcode',
  },
  meal: {
    notFound: 'Saved meal not found',
  },
  goals: {
    notFound: 'Nutrition goal not found',
  },
  nutrition: {
    dateRequired: 'Date is required',
    dateRangeRequired: 'Start and end dates are required',
  },
  weight: {
    notFound: 'Weight log not found',
  },
  auth: {
    unauthorized: 'Authentication required.',
  },
  billing: {
    error: {
      unknownPriceId: 'Unknown priceId "{{priceId}}".',
      providerUnavailable: 'Billing provider unavailable. Try again later.',
      checkoutFailed: 'Could not start checkout. Try again later.',
      cancelFailed: 'No active subscription to cancel.',
    },
  },
} as const
