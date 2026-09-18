/**
 * Per-user demo seeding for payroll-manager.
 *
 * On a freshly-signed-up account this writes:
 *   - company_settings row (legal name + EIN + address + biweekly schedule)
 *   - 6 employees across 4 departments (mix of salaried + hourly)
 *   - 1 processed pay-run with stubs for every active employee
 *     (so Dashboard / Reports / Tax Center / PayRunDetail render real data)
 *   - 4 notifications (pay-run approval, tax deadline, integration sync,
 *     mention)
 *
 * Idempotent: checks for existing rows before inserting.
 *
 * @module
 */

import { count, create } from '@molecule/api-database'
import { encrypt } from '@molecule/api-encryption'

interface EmployeeSeed {
  first_name: string
  last_name: string
  email: string
  title: string
  department: string
  salary: number
  pay_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
  tax_filing_status: 'single' | 'married' | 'head_of_household'
  ssn_last4: string
  status: 'active' | 'on_leave' | 'terminated'
}

const EMPLOYEE_SEEDS: EmployeeSeed[] = [
  {
    first_name: 'Amelia',
    last_name: 'Okafor',
    email: 'amelia.okafor@stipend.example',
    title: 'Staff Software Engineer',
    department: 'Engineering',
    salary: 168_000,
    pay_frequency: 'biweekly',
    tax_filing_status: 'single',
    ssn_last4: '4218',
    status: 'active',
  },
  {
    first_name: 'Marcus',
    last_name: 'Hale',
    email: 'marcus.hale@stipend.example',
    title: 'Account Executive',
    department: 'Sales',
    salary: 96_000,
    pay_frequency: 'biweekly',
    tax_filing_status: 'married',
    ssn_last4: '5102',
    status: 'active',
  },
  {
    first_name: 'Priya',
    last_name: 'Sundaram',
    email: 'priya.s@stipend.example',
    title: 'Payroll Specialist',
    department: 'Operations',
    salary: 78_000,
    pay_frequency: 'biweekly',
    tax_filing_status: 'single',
    ssn_last4: '8841',
    status: 'active',
  },
  {
    first_name: 'Daniel',
    last_name: 'Cho',
    email: 'daniel.cho@stipend.example',
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    salary: 142_000,
    pay_frequency: 'biweekly',
    tax_filing_status: 'married',
    ssn_last4: '2304',
    status: 'on_leave',
  },
  {
    first_name: 'Renee',
    last_name: 'Vasquez',
    email: 'renee.vasquez@stipend.example',
    title: 'Controller',
    department: 'Finance',
    salary: 134_000,
    pay_frequency: 'biweekly',
    tax_filing_status: 'single',
    ssn_last4: '6182',
    status: 'active',
  },
  {
    first_name: 'Jonas',
    last_name: 'Mendel',
    email: 'jonas.mendel@stipend.example',
    title: 'Backend Engineer',
    department: 'Engineering',
    salary: 122_000,
    pay_frequency: 'biweekly',
    tax_filing_status: 'single',
    ssn_last4: '9377',
    status: 'active',
  },
]

interface NotificationSeed {
  category: 'pay_run' | 'tax' | 'integration' | 'mention'
  title: string
  body: string
  href: string | null
  unread: boolean
  hours_ago: number
}

const NOTIFICATION_SEEDS: NotificationSeed[] = [
  {
    category: 'pay_run',
    title: 'Pay run ready for approval',
    body: '5 employees · biweekly cycle · review before Friday.',
    href: '/run-payroll',
    unread: true,
    hours_ago: 1,
  },
  {
    category: 'tax',
    title: 'Q1 941 filing deadline',
    body: 'Federal Form 941 will auto-file on April 30. Confirm or reschedule.',
    href: '/taxes',
    unread: true,
    hours_ago: 18,
  },
  {
    category: 'integration',
    title: 'Bank sync needs attention',
    body: 'Update your routing/account numbers under Settings to enable direct deposit.',
    href: '/settings',
    unread: true,
    hours_ago: 26,
  },
  {
    category: 'mention',
    title: 'Welcome to Stipend Payroll',
    body: 'Your trial includes the first pay-run, six demo employees, and the audit log.',
    href: '/employees',
    unread: false,
    hours_ago: 72,
  },
]

const offsetDate = (hoursAgo: number): Date => new Date(Date.now() - hoursAgo * 60 * 60_000)

const seededUsers = new Set<string>()
const seedingInFlight = new Map<string, Promise<void>>()

const FEDERAL_RATE = 0.18
const STATE_RATE = 0.05
const FICA_RATE = 0.062
const MEDICARE_RATE = 0.0145
// Each W-4 allowance excludes a fixed amount of ANNUAL wages from the income-tax base (the pre-2020
// IRS personal-allowance figure). Federal and state allowances reduce their own bases independently.
const ALLOWANCE_ANNUAL_AMOUNT = 4300

interface PaymentMath {
  gross: number
  federal_tax: number
  state_tax: number
  fica: number
  medicare: number
  deductions_total: number
  net: number
}

/** One employee benefit/garnishment as it affects a pay stub. */
export interface StubDeduction {
  amount: number
  is_percentage: boolean
  is_pretax: boolean
}

/** One employee's W-4 tax-withholding configuration as it affects a pay stub. */
export interface WithholdingConfig {
  /** Federal allowances; each excludes ALLOWANCE_ANNUAL_AMOUNT of annual wages from the fed base. */
  federal_allowances?: number
  /** State allowances; the same annual exclusion applied against the state base. */
  state_allowances?: number
  /** Extra flat federal withholding added every pay period. */
  additional_withholding?: number
  /** When true, no federal income tax is withheld (the employee claims exemption). */
  exempt?: boolean
}

/** One row of a filing-status federal income-tax schedule (annual, marginal). */
export interface FederalBracket {
  min_income: number
  max_income: number | null
  rate: number
}

/**
 * Progressive federal income tax on an ANNUAL taxable income: sum each marginal
 * bracket's rate over the portion of income that falls within it. `brackets`
 * must be sorted ascending by min_income. Returns 0 for an empty schedule so the
 * caller can fall back to the flat rate.
 */
function progressiveFederalTax(annualIncome: number, brackets: FederalBracket[]): number {
  let tax = 0
  for (const b of brackets) {
    if (annualIncome <= b.min_income) break
    const upper = b.max_income == null ? annualIncome : Math.min(annualIncome, b.max_income)
    tax += (upper - b.min_income) * b.rate
  }
  return tax
}

/**
 * Compute one period's stub math from an annual salary + cadence, applying the employee's
 * configured deductions. Pre-tax deductions (401k, cafeteria benefits) lower the income-tax base;
 * FICA/Medicare stay on gross (matches 401k treatment in this simplified flat-rate model). Every
 * deduction — pre- and post-tax — reduces net pay. Passing no deductions preserves the old
 * behaviour (deductions_total = 0). The employee's W-4 `withholding` config further adjusts federal
 * income-tax withholding: allowances reduce the taxable base, `exempt` withholds none, and
 * `additional_withholding` adds a flat amount each period. Passing no withholding preserves the old
 * behaviour (full bracket/flat federal tax, no extra).
 */
export function computeStub(
  salary: number,
  frequency: string,
  deductions: StubDeduction[] = [],
  federalBrackets: FederalBracket[] = [],
  withholding: WithholdingConfig = {},
): PaymentMath {
  const periodsPerYear =
    frequency === 'weekly'
      ? 52
      : frequency === 'semimonthly'
        ? 24
        : frequency === 'monthly'
          ? 12
          : 26
  const gross = salary / periodsPerYear
  let pretaxTotal = 0
  let posttaxTotal = 0
  for (const d of deductions) {
    const value = d.is_percentage ? gross * (d.amount / 100) : d.amount
    if (d.is_pretax) pretaxTotal += value
    else posttaxTotal += value
  }
  const taxableIncome = Math.max(0, gross - pretaxTotal)
  // Apply the employee's W-4 withholding config. Allowances exclude a fixed annual amount from the
  // income-tax base (federal and state independently); `exempt` withholds no federal income tax;
  // `additional_withholding` adds a flat amount every period. FICA/Medicare are statutory and
  // unaffected. Without this the whole tax_withholdings resource was inert — an exempt employee
  // still had full federal tax withheld, and extra/allowance settings changed nothing.
  const fedAllowancePerPeriod =
    (Math.max(0, Number(withholding.federal_allowances ?? 0)) * ALLOWANCE_ANNUAL_AMOUNT) /
    periodsPerYear
  const stateAllowancePerPeriod =
    (Math.max(0, Number(withholding.state_allowances ?? 0)) * ALLOWANCE_ANNUAL_AMOUNT) /
    periodsPerYear
  const fedTaxable = Math.max(0, taxableIncome - fedAllowancePerPeriod)
  const stateTaxable = Math.max(0, taxableIncome - stateAllowancePerPeriod)
  const additional = Math.max(0, Number(withholding.additional_withholding ?? 0))
  // Progressive federal withholding: annualize the per-period taxable wage, tax it
  // against the employee's filing-status brackets, then spread it back across the
  // periods. Falls back to the flat rate when no schedule is supplied (a filing
  // status with no seeded brackets, or callers that pass none — e.g. demo seed).
  const baseFederal =
    federalBrackets.length > 0
      ? progressiveFederalTax(fedTaxable * periodsPerYear, federalBrackets) / periodsPerYear
      : fedTaxable * FEDERAL_RATE
  const federal_tax = withholding.exempt === true ? 0 : baseFederal + additional
  const state_tax = stateTaxable * STATE_RATE
  const fica = gross * FICA_RATE
  const medicare = gross * MEDICARE_RATE
  const deductions_total = pretaxTotal + posttaxTotal
  const net = gross - federal_tax - state_tax - fica - medicare - deductions_total
  return {
    gross: Math.round(gross * 100) / 100,
    federal_tax: Math.round(federal_tax * 100) / 100,
    state_tax: Math.round(state_tax * 100) / 100,
    fica: Math.round(fica * 100) / 100,
    medicare: Math.round(medicare * 100) / 100,
    deductions_total: Math.round(deductions_total * 100) / 100,
    net: Math.round(net * 100) / 100,
  }
}

export const seedDemoForUser = async (userId: string): Promise<void> => {
  if (seededUsers.has(userId)) return
  const inFlight = seedingInFlight.get(userId)
  if (inFlight) return inFlight

  const promise = (async () => {
    const existingEmployees = await count('employees', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (existingEmployees > 0) {
      seededUsers.add(userId)
      return
    }

    // 1. Company settings.
    await create('company_settings', {
      user_id: userId,
      legal_name: 'Stipend Example, Inc.',
      ein: '88-1234567',
      address: '500 Howard St, San Francisco, CA 94105',
      fiscal_year: 'January – December',
      cadence: 'biweekly',
      cycle_end_day: 'Friday',
      pay_date_offset: 3,
      holiday_behavior: 'Pay one business day early',
      created_at: new Date(),
    })

    // 2. Employees.
    interface EmployeeRow {
      id: string
      first_name: string
      last_name: string
      salary: number
      pay_frequency: string
      status: string
      tax_filing_status: string
    }
    const employeeIds: EmployeeRow[] = []
    for (const seed of EMPLOYEE_SEEDS) {
      const ssnEncrypted = await encrypt(`555-${seed.ssn_last4.slice(0, 2)}-${seed.ssn_last4}`)
      const result = await create<EmployeeRow>('employees', {
        user_id: userId,
        first_name: seed.first_name,
        last_name: seed.last_name,
        email: seed.email,
        title: seed.title,
        department: seed.department,
        salary: seed.salary,
        pay_frequency: seed.pay_frequency,
        tax_filing_status: seed.tax_filing_status,
        ssn_encrypted: ssnEncrypted,
        start_date: offsetDate(24 * 365),
        status: seed.status,
        created_at: offsetDate(24 * 90),
      })
      if (result.data) employeeIds.push(result.data)
    }

    // 3. One processed pay-run with stubs for active employees (gives the
    //    Dashboard, Reports, TaxCenter, and PayRunDetail something real to
    //    render on first sign-up). Pay-period: prior biweek; pay-date 3
    //    business days after the period end, per the seeded settings.
    const periodEnd = offsetDate(24 * 8)
    const periodStart = offsetDate(24 * 22)
    const payDate = offsetDate(24 * 5)

    const active = employeeIds.filter((e) => e.status === 'active')
    let totalGross = 0
    let totalTaxes = 0
    let totalDeductions = 0
    let totalNet = 0
    const stubs: Array<{ employee: EmployeeRow; math: PaymentMath; name: string }> = []
    for (const e of active) {
      const m = computeStub(Number(e.salary), e.pay_frequency)
      totalGross += m.gross
      totalTaxes += m.federal_tax + m.state_tax + m.fica + m.medicare
      totalDeductions += m.deductions_total
      totalNet += m.net
      stubs.push({ employee: e, math: m, name: `${e.first_name} ${e.last_name}` })
    }

    interface PayRunRow {
      id: string
    }
    const payRunResult = await create<PayRunRow>('pay_runs', {
      user_id: userId,
      pay_period_start: periodStart,
      pay_period_end: periodEnd,
      pay_date: payDate,
      employee_count: active.length,
      total_gross: Math.round(totalGross * 100) / 100,
      total_taxes: Math.round(totalTaxes * 100) / 100,
      total_deductions: Math.round(totalDeductions * 100) / 100,
      total_net: Math.round(totalNet * 100) / 100,
      status: 'processed',
      approved_by: userId,
      approved_at: offsetDate(24 * 6),
      processed_at: payDate,
      created_at: offsetDate(24 * 9),
    })
    const payRunId = payRunResult.data?.id
    if (payRunId) {
      for (const s of stubs) {
        await create('pay_stubs', {
          user_id: userId,
          pay_run_id: payRunId,
          employee_id: s.employee.id,
          employee_name: s.name,
          gross: s.math.gross,
          federal_tax: s.math.federal_tax,
          state_tax: s.math.state_tax,
          fica: s.math.fica,
          medicare: s.math.medicare,
          deductions_total: s.math.deductions_total,
          net: s.math.net,
          hours: 80,
          period_start: periodStart,
          period_end: periodEnd,
          created_at: payDate,
        })
      }
    }

    // 4. A second pay-run in draft state (so the PayRuns filter chips show
    //    both 'processed' and 'draft' on first load).
    await create('pay_runs', {
      user_id: userId,
      pay_period_start: offsetDate(24 * 7),
      pay_period_end: offsetDate(0),
      pay_date: new Date(Date.now() + 3 * 24 * 60 * 60_000),
      employee_count: 0,
      total_gross: 0,
      total_taxes: 0,
      total_deductions: 0,
      total_net: 0,
      status: 'draft',
      created_at: offsetDate(2),
    })

    // 5. Notifications.
    for (const n of NOTIFICATION_SEEDS) {
      await create('notifications', {
        user_id: userId,
        category: n.category,
        title: n.title,
        body: n.body,
        href: n.href,
        unread: n.unread,
        created_at: offsetDate(n.hours_ago),
      })
    }

    seededUsers.add(userId)
  })()

  seedingInFlight.set(userId, promise)
  try {
    await promise
  } catch (err) {
    // Seed failures should be visible. Drop the in-flight cache so a
    // subsequent request can retry. Don't throw — we don't want a seed
    // bug to take a normal GET 500.

    console.error('[payroll-manager seed] seedDemoForUser failed:', err)
  } finally {
    seedingInFlight.delete(userId)
  }
}

/** Reset the in-memory seed cache so a fresh sign-up triggers a re-seed. */
export const resetSeedCache = (userId?: string): void => {
  if (userId) seededUsers.delete(userId)
  else seededUsers.clear()
}

/** Force-trigger a re-seed for an existing user (test helper). */
export const _seedForTest = (userId: string): Promise<void> => {
  seededUsers.delete(userId)
  return seedDemoForUser(userId)
}
