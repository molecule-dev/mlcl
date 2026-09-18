/**
 * Unit-preference conversion for the weather displays.
 *
 * The forecast API stores + serves every reading in **imperial base units**
 * (temperature °F, wind mph, pressure hPa, distance/visibility miles), and the
 * Settings page persists the user's chosen display units into localStorage
 * under `weather-dashboard.settings.v1` (`options['units.temperature']`, etc.).
 *
 * These functions are the single bridge between the two: pure converters that
 * take a base-unit reading + the chosen unit and return `{ value, unit }` ready
 * to render. Every weather surface (hero, gauges, hourly strip, location cards,
 * trends) routes its readings through here so the stored preference is actually
 * honored — previously each site hardcoded `°F`/`mph`/`hPa`/`mi` and ignored it.
 *
 * The converters are pure (no storage/DOM); `getUnitPreferences()` is the only
 * localStorage reader and mirrors Settings.tsx's own `loadSettings()` shape.
 *
 * @module
 */

export type TemperatureUnit = 'Fahrenheit' | 'Celsius'
export type WindUnit = 'mph' | 'km/h' | 'knots' | 'm/s'
export type PressureUnit = 'hPa' | 'inHg'
export type DistanceUnit = 'Miles' | 'Kilometers'

export interface UnitPreferences {
  temperature: TemperatureUnit
  wind: WindUnit
  pressure: PressureUnit
  distance: DistanceUnit
}

/** A base-unit reading converted to the chosen display unit. */
export interface FormattedMetric {
  /** Numeric reading in the chosen unit, rounded for display. */
  value: number
  /** Unit suffix to render next to `value` (e.g. `°C`, `km/h`, `inHg`, `km`). */
  unit: string
}

const STORAGE_KEY = 'weather-dashboard.settings.v1'

const DEFAULTS: UnitPreferences = {
  temperature: 'Fahrenheit',
  wind: 'mph',
  pressure: 'hPa',
  distance: 'Miles',
}

/** Convert a base °F reading to the chosen temperature unit. */
export function formatTemperature(fahrenheit: number, unit: TemperatureUnit): FormattedMetric {
  if (unit === 'Celsius') {
    return { value: Math.round(((fahrenheit - 32) * 5) / 9), unit: '°C' }
  }
  return { value: Math.round(fahrenheit), unit: '°F' }
}

/** Convert a base mph reading to the chosen wind-speed unit. */
export function formatWind(mph: number, unit: WindUnit): FormattedMetric {
  const factor =
    unit === 'km/h' ? 1.609344 : unit === 'knots' ? 0.868976 : unit === 'm/s' ? 0.44704 : 1
  return { value: Math.round(mph * factor), unit }
}

/** Convert a base hPa reading to the chosen pressure unit (inHg keeps 2 decimals). */
export function formatPressure(hPa: number, unit: PressureUnit): FormattedMetric {
  if (unit === 'inHg') {
    return { value: Math.round(hPa * 0.0295299830714 * 100) / 100, unit: 'inHg' }
  }
  return { value: Math.round(hPa), unit: 'hPa' }
}

/** Convert a base miles reading to the chosen distance unit. */
export function formatDistance(miles: number, unit: DistanceUnit): FormattedMetric {
  if (unit === 'Kilometers') {
    return { value: Math.round(miles * 1.609344), unit: 'km' }
  }
  return { value: Math.round(miles), unit: 'mi' }
}

/**
 * Convert a base reading by MetricGaugeCard `kind`. Temperature-family kinds
 * (`feels_like`, `dew_point`) use the temperature pref, `wind`/`pressure`/
 * `visibility` use theirs; everything else (humidity, uv, aqi) passes the raw
 * value through with the caller-provided `fallbackUnit`.
 */
export function formatMetricByKind(
  kind: string,
  value: number,
  fallbackUnit: string | undefined,
  prefs: UnitPreferences,
): FormattedMetric {
  switch (kind) {
    case 'wind':
      return formatWind(value, prefs.wind)
    case 'pressure':
      return formatPressure(value, prefs.pressure)
    case 'visibility':
      return formatDistance(value, prefs.distance)
    case 'feels_like':
    case 'dew_point':
      return formatTemperature(value, prefs.temperature)
    default:
      return { value: Math.round(value), unit: fallbackUnit ?? '' }
  }
}

function normalizePreferences(options: Record<string, string> | undefined): UnitPreferences {
  const opts = options ?? {}
  const wind = opts['units.wind']
  return {
    temperature: opts['units.temperature'] === 'Celsius' ? 'Celsius' : 'Fahrenheit',
    wind: wind === 'km/h' || wind === 'knots' || wind === 'm/s' ? wind : 'mph',
    pressure: opts['units.pressure'] === 'inHg' ? 'inHg' : 'hPa',
    distance: opts['units.distance'] === 'Kilometers' ? 'Kilometers' : 'Miles',
  }
}

/** Parse a persisted settings blob into unit preferences (defaults on any gap). */
export function parseUnitPreferences(raw: string | null | undefined): UnitPreferences {
  if (!raw) return { ...DEFAULTS }
  try {
    const parsed = JSON.parse(raw) as { options?: Record<string, string> }
    return normalizePreferences(parsed.options)
  } catch (_error) {
    // corrupted localStorage value — fall back to imperial defaults
    return { ...DEFAULTS }
  }
}

/** Read the user's chosen display units from localStorage (imperial defaults off-DOM). */
export function getUnitPreferences(): UnitPreferences {
  if (typeof window === 'undefined' || !window.localStorage) return { ...DEFAULTS }
  return parseUnitPreferences(window.localStorage.getItem(STORAGE_KEY))
}
