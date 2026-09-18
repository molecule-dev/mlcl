import { describe, expect, it } from 'vitest'

import { convertWeight, normalizeWeightUnit } from '../lib/weight.js'

// Set weights are stored canonically in kg but every display hardcoded 'kg', so the weightUnit
// preference had no effect. convertWeight is the pure kg→unit converter the displays now use.

describe('normalizeWeightUnit', () => {
  it('accepts lbs, defaults everything else to kg', () => {
    expect(normalizeWeightUnit('lbs')).toBe('lbs')
    expect(normalizeWeightUnit('kg')).toBe('kg')
    expect(normalizeWeightUnit(undefined)).toBe('kg')
    expect(normalizeWeightUnit(null)).toBe('kg')
    expect(normalizeWeightUnit('stone')).toBe('kg')
  })
})

describe('convertWeight', () => {
  it('passes kilograms through unchanged', () => {
    expect(convertWeight(100, 'kg')).toBe(100)
    expect(convertWeight(72.5, 'kg')).toBe(72.5)
  })
  it('converts kilograms to pounds (×2.2046, one decimal)', () => {
    expect(convertWeight(100, 'lbs')).toBe(220.5)
    expect(convertWeight(10, 'lbs')).toBe(22)
    expect(convertWeight(0, 'lbs')).toBe(0)
  })
})
