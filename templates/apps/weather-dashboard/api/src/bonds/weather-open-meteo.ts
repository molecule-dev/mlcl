/**
 * WeatherOpenMeteo bond setup
 *
 * Wires @molecule/api-weather-open-meteo to @molecule/api-weather.
 * Open-Meteo is keyless and free for non-commercial use; no env vars required.
 */

import { setProvider } from '@molecule/api-weather'
import { provider } from '@molecule/api-weather-open-meteo'

export function setupWeatherOpenMeteo(): void {
  setProvider(provider)
}
