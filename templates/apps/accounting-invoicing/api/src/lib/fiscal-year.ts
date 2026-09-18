/**
 * Fiscal-year windowing.
 *
 * The company's stored "Fiscal year starts" month (Settings →
 * `company_profile.fiscal_year_start`, a month NAME like "July") must anchor
 * the dashboard's YTD revenue/expenses/profit window. The dashboard hardcoded
 * January 1, so a non-January fiscal year produced wrong YTD figures.
 *
 * @module
 */

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

/**
 * The UTC start of the fiscal year that contains `now`, given the company's
 * fiscal-year start month NAME (case-insensitive; defaults to January on an
 * unknown/blank value). When `now` is before the start month within the
 * calendar year, the current fiscal year began on the start month of the
 * previous calendar year.
 */
export function fiscalYearStart(now: Date, fiscalYearStartMonth: unknown): Date {
  const idx = MONTHS.indexOf(
    String(fiscalYearStartMonth ?? '')
      .trim()
      .toLowerCase(),
  )
  const startMonth = idx >= 0 ? idx : 0
  const year = now.getUTCMonth() >= startMonth ? now.getUTCFullYear() : now.getUTCFullYear() - 1
  return new Date(Date.UTC(year, startMonth, 1))
}
