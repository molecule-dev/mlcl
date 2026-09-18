import { describe, expect, it } from 'vitest'

import {
  formatDistance,
  formatMetricByKind,
  formatPressure,
  formatTemperature,
  formatWind,
  parseUnitPreferences,
  type UnitPreferences,
} from '../lib/units.js'

const IMPERIAL: UnitPreferences = {
  temperature: 'Fahrenheit',
  wind: 'mph',
  pressure: 'hPa',
  distance: 'Miles',
}
const METRIC: UnitPreferences = {
  temperature: 'Celsius',
  wind: 'km/h',
  pressure: 'inHg',
  distance: 'Kilometers',
}

describe('formatTemperature', () => {
  it('passes Fahrenheit through with the °F label', () => {
    expect(formatTemperature(72.4, 'Fahrenheit')).toEqual({ value: 72, unit: '°F' })
  })
  it('converts to Celsius using (f-32)*5/9', () => {
    expect(formatTemperature(32, 'Celsius')).toEqual({ value: 0, unit: '°C' })
    expect(formatTemperature(212, 'Celsius')).toEqual({ value: 100, unit: '°C' })
    expect(formatTemperature(68, 'Celsius')).toEqual({ value: 20, unit: '°C' })
  })
})

describe('formatWind', () => {
  it('passes mph through', () => {
    expect(formatWind(10, 'mph')).toEqual({ value: 10, unit: 'mph' })
  })
  it('converts to km/h, knots, and m/s', () => {
    expect(formatWind(10, 'km/h')).toEqual({ value: 16, unit: 'km/h' })
    expect(formatWind(10, 'knots')).toEqual({ value: 9, unit: 'knots' })
    expect(formatWind(10, 'm/s')).toEqual({ value: 4, unit: 'm/s' })
  })
})

describe('formatPressure', () => {
  it('rounds hPa to an integer', () => {
    expect(formatPressure(1013.2, 'hPa')).toEqual({ value: 1013, unit: 'hPa' })
  })
  it('converts to inHg keeping 2 decimals', () => {
    expect(formatPressure(1013, 'inHg')).toEqual({ value: 29.91, unit: 'inHg' })
  })
})

describe('formatDistance', () => {
  it('passes miles through', () => {
    expect(formatDistance(10, 'Miles')).toEqual({ value: 10, unit: 'mi' })
  })
  it('converts to kilometers', () => {
    expect(formatDistance(10, 'Kilometers')).toEqual({ value: 16, unit: 'km' })
  })
})

describe('formatMetricByKind', () => {
  it('routes wind/pressure/visibility/temperature kinds to their converters', () => {
    expect(formatMetricByKind('wind', 10, 'mph', METRIC)).toEqual({ value: 16, unit: 'km/h' })
    expect(formatMetricByKind('pressure', 1013, 'hPa', METRIC)).toEqual({
      value: 29.91,
      unit: 'inHg',
    })
    expect(formatMetricByKind('visibility', 10, 'mi', METRIC)).toEqual({ value: 16, unit: 'km' })
    expect(formatMetricByKind('dew_point', 68, '°F', METRIC)).toEqual({ value: 20, unit: '°C' })
    expect(formatMetricByKind('feels_like', 68, '°F', METRIC)).toEqual({ value: 20, unit: '°C' })
  })
  it('passes non-convertible kinds through with the fallback unit', () => {
    expect(formatMetricByKind('humidity', 63.6, '%', METRIC)).toEqual({ value: 64, unit: '%' })
    expect(formatMetricByKind('uv', 6, 'UVI', METRIC)).toEqual({ value: 6, unit: 'UVI' })
    expect(formatMetricByKind('aqi', 42, '', IMPERIAL)).toEqual({ value: 42, unit: '' })
  })
})

describe('parseUnitPreferences', () => {
  it('defaults to imperial for null/empty input', () => {
    expect(parseUnitPreferences(null)).toEqual(IMPERIAL)
    expect(parseUnitPreferences('')).toEqual(IMPERIAL)
  })
  it('defaults to imperial for corrupted JSON', () => {
    expect(parseUnitPreferences('{not json')).toEqual(IMPERIAL)
  })
  it('reads the persisted options blob', () => {
    const raw = JSON.stringify({
      options: {
        'units.temperature': 'Celsius',
        'units.wind': 'knots',
        'units.pressure': 'inHg',
        'units.distance': 'Kilometers',
      },
    })
    expect(parseUnitPreferences(raw)).toEqual({
      temperature: 'Celsius',
      wind: 'knots',
      pressure: 'inHg',
      distance: 'Kilometers',
    })
  })
  it('falls back per-field for unknown or missing option values', () => {
    const raw = JSON.stringify({ options: { 'units.wind': 'furlongs/fortnight' } })
    expect(parseUnitPreferences(raw)).toEqual(IMPERIAL)
  })
})
