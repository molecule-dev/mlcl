/**
 * Per-user demo seed for hr-management.
 *
 * On a freshly signed-up user's first authenticated GET (e.g. /employees),
 * `seedDemoForUser` populates a small but realistic dataset so the
 * Dashboard, Employees, PTO calendar, Org-chart, Documents and
 * Notifications pages all render with content immediately. Idempotent
 * on user_id — re-running is a no-op.
 *
 * @module
 */

import { count, create, findMany } from '@molecule/api-database'

interface DepartmentSeed {
  name: string
  description: string
}

interface EmployeeSeed {
  first_name: string
  last_name: string
  title: string
  email: string
  department: string
  manager_email: string | null
  hire_date: string
  status: 'active' | 'on_leave' | 'terminated'
  office_location: string
  pronouns: string
  employment_type: string
  employee_number: string
  salary_cents: number
  phone: string
}

const DEPARTMENTS: DepartmentSeed[] = [
  { name: 'Executive', description: 'Office of the CEO.' },
  { name: 'Engineering', description: 'Web, mobile, infra, and platform teams.' },
  { name: 'Design', description: 'Product design, brand, and content.' },
  { name: 'Sales', description: 'Direct, partner, and field sales.' },
  { name: 'Marketing', description: 'Demand gen, content, and PR.' },
  { name: 'People', description: 'HR ops, recruiting, and L&D.' },
  { name: 'Finance', description: 'Accounting, FP&A, and procurement.' },
]

const EMPLOYEES: EmployeeSeed[] = [
  {
    first_name: 'Alex',
    last_name: 'Rivera',
    title: 'Chief Executive Officer',
    email: 'alex.rivera@arbor.example',
    department: 'Executive',
    manager_email: null,
    hire_date: '2018-03-12',
    status: 'active',
    office_location: 'San Francisco, CA',
    pronouns: 'they/them',
    employment_type: 'full-time',
    employee_number: 'ARB-0001',
    salary_cents: 28_000_000,
    phone: '+1 (415) 555-0101',
  },
  {
    first_name: 'Devon',
    last_name: 'Park',
    title: 'VP, Engineering',
    email: 'devon.park@arbor.example',
    department: 'Engineering',
    manager_email: 'alex.rivera@arbor.example',
    hire_date: '2019-06-01',
    status: 'active',
    office_location: 'San Francisco, CA',
    pronouns: 'he/him',
    employment_type: 'full-time',
    employee_number: 'ARB-0014',
    salary_cents: 22_000_000,
    phone: '+1 (415) 555-0104',
  },
  {
    first_name: 'Morgan',
    last_name: 'Yeoh',
    title: 'Senior Software Engineer',
    email: 'morgan.yeoh@arbor.example',
    department: 'Engineering',
    manager_email: 'devon.park@arbor.example',
    hire_date: '2021-09-13',
    status: 'active',
    office_location: 'Remote · NYC',
    pronouns: 'she/her',
    employment_type: 'full-time',
    employee_number: 'ARB-0042',
    salary_cents: 18_500_000,
    phone: '+1 (212) 555-0181',
  },
  {
    first_name: 'Priya',
    last_name: 'Kapoor',
    title: 'Staff Software Engineer',
    email: 'priya.kapoor@arbor.example',
    department: 'Engineering',
    manager_email: 'devon.park@arbor.example',
    hire_date: '2020-02-04',
    status: 'on_leave',
    office_location: 'Remote · Bangalore',
    pronouns: 'she/her',
    employment_type: 'full-time',
    employee_number: 'ARB-0029',
    salary_cents: 19_500_000,
    phone: '+91 80 4555 0125',
  },
  {
    first_name: 'Sam',
    last_name: 'Chen',
    title: 'Product Designer',
    email: 'sam.chen@arbor.example',
    department: 'Design',
    manager_email: 'alex.rivera@arbor.example',
    hire_date: '2022-04-18',
    status: 'active',
    office_location: 'San Francisco, CA',
    pronouns: 'they/them',
    employment_type: 'full-time',
    employee_number: 'ARB-0067',
    salary_cents: 16_000_000,
    phone: '+1 (415) 555-0166',
  },
  {
    first_name: 'Riley',
    last_name: 'Nakamura',
    title: 'Account Executive',
    email: 'riley.nakamura@arbor.example',
    department: 'Sales',
    manager_email: 'alex.rivera@arbor.example',
    hire_date: '2023-01-09',
    status: 'active',
    office_location: 'Chicago, IL',
    pronouns: 'they/them',
    employment_type: 'full-time',
    employee_number: 'ARB-0091',
    salary_cents: 14_500_000,
    phone: '+1 (312) 555-0144',
  },
  {
    first_name: 'Jordan',
    last_name: 'Bell',
    title: 'Demand Generation Lead',
    email: 'jordan.bell@arbor.example',
    department: 'Marketing',
    manager_email: 'alex.rivera@arbor.example',
    hire_date: '2021-11-22',
    status: 'active',
    office_location: 'Remote · Austin',
    pronouns: 'she/her',
    employment_type: 'full-time',
    employee_number: 'ARB-0058',
    salary_cents: 15_500_000,
    phone: '+1 (512) 555-0117',
  },
  {
    first_name: 'Taylor',
    last_name: 'Brooks',
    title: 'People Ops Partner',
    email: 'taylor.brooks@arbor.example',
    department: 'People',
    manager_email: 'alex.rivera@arbor.example',
    hire_date: '2020-08-31',
    status: 'active',
    office_location: 'San Francisco, CA',
    pronouns: 'she/her',
    employment_type: 'full-time',
    employee_number: 'ARB-0036',
    salary_cents: 14_000_000,
    phone: '+1 (415) 555-0193',
  },
  {
    first_name: 'Hassan',
    last_name: 'Adel',
    title: 'Senior Accountant',
    email: 'hassan.adel@arbor.example',
    department: 'Finance',
    manager_email: 'alex.rivera@arbor.example',
    hire_date: '2024-02-12',
    status: 'active',
    office_location: 'Remote · London',
    pronouns: 'he/him',
    employment_type: 'full-time',
    employee_number: 'ARB-0118',
    salary_cents: 13_500_000,
    phone: '+44 20 7555 0102',
  },
  {
    first_name: 'Isla',
    last_name: 'Romano',
    title: 'Product Designer (Junior)',
    email: 'isla.romano@arbor.example',
    department: 'Design',
    manager_email: 'sam.chen@arbor.example',
    hire_date: '2026-04-15', // recent hire — appears in onboarding
    status: 'active',
    office_location: 'San Francisco, CA',
    pronouns: 'she/her',
    employment_type: 'full-time',
    employee_number: 'ARB-0140',
    salary_cents: 11_000_000,
    phone: '+1 (415) 555-0231',
  },
  {
    first_name: 'Marco',
    last_name: 'Webb',
    title: 'Customer Success Manager',
    email: 'marco.webb@arbor.example',
    department: 'Sales',
    manager_email: 'riley.nakamura@arbor.example',
    hire_date: '2026-04-22', // recent hire — appears in onboarding
    status: 'active',
    office_location: 'Remote · Berlin',
    pronouns: 'he/him',
    employment_type: 'full-time',
    employee_number: 'ARB-0142',
    salary_cents: 12_500_000,
    phone: '+49 30 4555 0119',
  },
]

interface PtoSeed {
  email: string
  kind: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'holiday'
  start_date: string
  end_date: string
  hours: number
  reason: string
  status: 'pending' | 'approved' | 'denied'
}

const PTO_SEEDS: PtoSeed[] = [
  {
    email: 'morgan.yeoh@arbor.example',
    kind: 'vacation',
    start_date: '2026-05-12',
    end_date: '2026-05-16',
    hours: 40,
    reason: 'Family trip to Big Sur. Coverage handed off to Devon.',
    status: 'pending',
  },
  {
    email: 'sam.chen@arbor.example',
    kind: 'personal',
    start_date: '2026-05-09',
    end_date: '2026-05-09',
    hours: 8,
    reason: 'Apartment closing — back the next day.',
    status: 'pending',
  },
  {
    email: 'riley.nakamura@arbor.example',
    kind: 'sick',
    start_date: '2026-05-08',
    end_date: '2026-05-08',
    hours: 8,
    reason: 'Stomach flu. Will rejoin standup tomorrow.',
    status: 'approved',
  },
  {
    email: 'jordan.bell@arbor.example',
    kind: 'vacation',
    start_date: '2026-05-23',
    end_date: '2026-05-30',
    hours: 56,
    reason: 'Annual leave — visiting parents in Austin.',
    status: 'approved',
  },
  {
    email: 'priya.kapoor@arbor.example',
    kind: 'personal',
    start_date: '2026-05-01',
    end_date: '2026-05-31',
    hours: 168,
    reason: 'Parental leave continuation.',
    status: 'approved',
  },
  {
    email: 'hassan.adel@arbor.example',
    kind: 'sick',
    start_date: '2026-05-15',
    end_date: '2026-05-16',
    hours: 16,
    reason: 'Minor surgery and recovery.',
    status: 'pending',
  },
]

interface DocumentSeed {
  title: string
  kind: 'pdf' | 'doc' | 'xls' | 'img'
  category: string
  file_url: string
  content_type: string
  file_size: number
  uploaded_by_email: string
}

const DOCUMENTS: DocumentSeed[] = [
  {
    title: 'Employee Handbook 2026.pdf',
    kind: 'pdf',
    category: 'Policy',
    file_url: 'https://arbor.example/docs/employee-handbook-2026.pdf',
    content_type: 'application/pdf',
    file_size: 482_113,
    uploaded_by_email: 'taylor.brooks@arbor.example',
  },
  {
    title: 'Mutual Non-Disclosure Agreement.pdf',
    kind: 'pdf',
    category: 'Contract',
    file_url: 'https://arbor.example/docs/mnda.pdf',
    content_type: 'application/pdf',
    file_size: 124_887,
    uploaded_by_email: 'alex.rivera@arbor.example',
  },
  {
    title: 'Headcount Forecast Q2.xlsx',
    kind: 'xls',
    category: 'Reports',
    file_url: 'https://arbor.example/docs/headcount-forecast-q2.xlsx',
    content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    file_size: 39_002,
    uploaded_by_email: 'hassan.adel@arbor.example',
  },
  {
    title: 'Compensation Bands 2026.docx',
    kind: 'doc',
    category: 'Confidential',
    file_url: 'https://arbor.example/docs/comp-bands-2026.docx',
    content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 56_402,
    uploaded_by_email: 'taylor.brooks@arbor.example',
  },
  {
    title: 'H1 Performance Calibration Notes.pdf',
    kind: 'pdf',
    category: 'Performance',
    file_url: 'https://arbor.example/docs/h1-calibration.pdf',
    content_type: 'application/pdf',
    file_size: 87_311,
    uploaded_by_email: 'alex.rivera@arbor.example',
  },
]

interface NotificationSeed {
  kind: 'pto' | 'document' | 'mention' | 'anniversary' | 'review'
  title: string
  body: string
  link: string
  hoursAgo: number
  unread: boolean
  actor_email?: string
}

const NOTIFICATIONS: NotificationSeed[] = [
  {
    kind: 'pto',
    title: 'New PTO request',
    body: 'Morgan Yeoh requested 5 days of vacation (May 12 → 16).',
    link: '/pto',
    hoursAgo: 1,
    unread: true,
    actor_email: 'morgan.yeoh@arbor.example',
  },
  {
    kind: 'pto',
    title: 'PTO request awaiting review',
    body: 'Sam Chen requested 1 personal day (May 9).',
    link: '/pto',
    hoursAgo: 5,
    unread: true,
    actor_email: 'sam.chen@arbor.example',
  },
  {
    kind: 'document',
    title: 'Document uploaded',
    body: 'Taylor Brooks uploaded "Employee Handbook 2026.pdf".',
    link: '/documents',
    hoursAgo: 18,
    unread: true,
    actor_email: 'taylor.brooks@arbor.example',
  },
  {
    kind: 'anniversary',
    title: 'Work anniversary this week',
    body: 'Devon Park reaches 7 years on June 1.',
    link: '/employees',
    hoursAgo: 32,
    unread: false,
    actor_email: 'devon.park@arbor.example',
  },
  {
    kind: 'review',
    title: 'Performance review reminder',
    body: 'H1 cycle closes May 15 — 4 reviews still in progress.',
    link: '/performance',
    hoursAgo: 50,
    unread: false,
  },
]

interface PerfSeed {
  employee_email: string
  reviewer_email: string
  rating: number | null
  status: 'draft' | 'in_progress' | 'completed'
  summary: string | null
  cycle_name: string
}

const PERF_SEEDS: PerfSeed[] = [
  {
    employee_email: 'morgan.yeoh@arbor.example',
    reviewer_email: 'devon.park@arbor.example',
    rating: 4.5,
    status: 'completed',
    summary: 'Exceeds in shipping and code quality. Mentored two juniors.',
    cycle_name: 'H1 2026',
  },
  {
    employee_email: 'sam.chen@arbor.example',
    reviewer_email: 'alex.rivera@arbor.example',
    rating: 4.0,
    status: 'in_progress',
    summary: 'Solid design system progress; needs deeper user research.',
    cycle_name: 'H1 2026',
  },
  {
    employee_email: 'riley.nakamura@arbor.example',
    reviewer_email: 'alex.rivera@arbor.example',
    rating: null,
    status: 'in_progress',
    summary: null,
    cycle_name: 'H1 2026',
  },
  {
    employee_email: 'jordan.bell@arbor.example',
    reviewer_email: 'alex.rivera@arbor.example',
    rating: 3.5,
    status: 'completed',
    summary: 'Meets quota, leadership during pipeline shift.',
    cycle_name: 'H1 2026',
  },
  {
    employee_email: 'taylor.brooks@arbor.example',
    reviewer_email: 'alex.rivera@arbor.example',
    rating: null,
    status: 'draft',
    summary: null,
    cycle_name: 'H1 2026',
  },
]

/**
 * Idempotently seed a freshly signed-up user with realistic HR demo data.
 * Returns a count summary; returns zeros if the user already has employees.
 */
export async function seedDemoForUser(userId: string): Promise<{
  departmentsCreated: number
  employeesCreated: number
  ptoCreated: number
  documentsCreated: number
  notificationsCreated: number
  reviewsCreated: number
  cyclesCreated: number
}> {
  if (!userId) {
    return {
      departmentsCreated: 0,
      employeesCreated: 0,
      ptoCreated: 0,
      documentsCreated: 0,
      notificationsCreated: 0,
      reviewsCreated: 0,
      cyclesCreated: 0,
    }
  }

  const existingEmployees = await count('employees', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existingEmployees > 0) {
    return {
      departmentsCreated: 0,
      employeesCreated: 0,
      ptoCreated: 0,
      documentsCreated: 0,
      notificationsCreated: 0,
      reviewsCreated: 0,
      cyclesCreated: 0,
    }
  }

  const now = new Date()

  // 1. Departments
  const deptIdByName = new Map<string, string>()
  for (const dept of DEPARTMENTS) {
    const created = await create<Record<string, unknown>>('departments', {
      user_id: userId,
      name: dept.name,
      description: dept.description,
      parent_id: null,
      head_employee_id: null,
      created_at: now,
      updated_at: now,
    })
    const row = (created.data ?? created) as Record<string, unknown>
    deptIdByName.set(dept.name, String(row.id))
  }

  // 2. Employees — first pass, no managers (avoid forward refs).
  const empIdByEmail = new Map<string, string>()
  for (const emp of EMPLOYEES) {
    const created = await create<Record<string, unknown>>('employees', {
      user_id: userId,
      employee_number: emp.employee_number,
      first_name: emp.first_name,
      last_name: emp.last_name,
      work_email: emp.email,
      personal_email: null,
      phone: emp.phone,
      start_date: emp.hire_date,
      hire_date: emp.hire_date,
      employment_type: emp.employment_type,
      department_id: deptIdByName.get(emp.department) ?? null,
      manager_id: null,
      office_location: emp.office_location,
      title: emp.title,
      status: emp.status,
      pronouns: emp.pronouns,
      timezone: 'America/Los_Angeles',
      bio: null,
      salary_cents: emp.salary_cents,
      photo_s3_key: null,
      created_at: now,
      updated_at: now,
    })
    const row = (created.data ?? created) as Record<string, unknown>
    empIdByEmail.set(emp.email, String(row.id))
  }

  // 2b. Second pass — wire managers (using @molecule/api-database update).
  const { updateById } = await import('@molecule/api-database')
  for (const emp of EMPLOYEES) {
    if (!emp.manager_email) continue
    const id = empIdByEmail.get(emp.email)
    const managerId = empIdByEmail.get(emp.manager_email)
    if (id && managerId) {
      await updateById('employees', id, { manager_id: managerId, updated_at: new Date() })
    }
  }

  // 2c. Department heads (CEO heads Executive; Devon heads Engineering, etc.)
  const HEADS: Record<string, string> = {
    Executive: 'alex.rivera@arbor.example',
    Engineering: 'devon.park@arbor.example',
    Design: 'sam.chen@arbor.example',
    Sales: 'riley.nakamura@arbor.example',
    Marketing: 'jordan.bell@arbor.example',
    People: 'taylor.brooks@arbor.example',
    Finance: 'hassan.adel@arbor.example',
  }
  for (const [deptName, headEmail] of Object.entries(HEADS)) {
    const deptId = deptIdByName.get(deptName)
    const headId = empIdByEmail.get(headEmail)
    if (deptId && headId) {
      await updateById('departments', deptId, {
        head_employee_id: headId,
        updated_at: new Date(),
      })
    }
  }

  // 3. PTO requests
  let ptoCreated = 0
  for (const pto of PTO_SEEDS) {
    const employeeId = empIdByEmail.get(pto.email)
    if (!employeeId) continue
    await create('pto_requests', {
      user_id: userId,
      employee_id: employeeId,
      kind: pto.kind,
      start_date: pto.start_date,
      end_date: pto.end_date,
      hours: pto.hours,
      reason: pto.reason,
      status: pto.status,
      reviewer_id: pto.status === 'approved' ? userId : null,
      reviewed_at: pto.status === 'approved' ? new Date() : null,
      created_at: now,
      updated_at: now,
    })
    ptoCreated++
  }

  // 4. Documents
  let docsCreated = 0
  for (const doc of DOCUMENTS) {
    const uploaderId = empIdByEmail.get(doc.uploaded_by_email)
    await create('documents', {
      user_id: userId,
      employee_id: null,
      kind: doc.kind,
      title: doc.title,
      category: doc.category,
      s3_key: null,
      file_url: doc.file_url,
      content_type: doc.content_type,
      file_size: doc.file_size,
      uploaded_by: uploaderId ?? userId,
      uploaded_at: now,
      created_at: now,
      updated_at: now,
    })
    docsCreated++
  }

  // 5. Notifications
  let notifCreated = 0
  for (const n of NOTIFICATIONS) {
    const occurredAt = new Date(Date.now() - n.hoursAgo * 60 * 60 * 1000)
    const actor = n.actor_email ? EMPLOYEES.find((e) => e.email === n.actor_email) : undefined
    await create('notifications', {
      user_id: userId,
      kind: n.kind,
      title: n.title,
      body: n.body,
      payload: {
        link: n.link,
        actor_name: actor ? `${actor.first_name} ${actor.last_name}` : 'System',
        actor_initial: actor ? actor.first_name[0] : 'S',
        icon: notificationIcon(n.kind),
      },
      read_at: n.unread ? null : occurredAt,
      created_at: occurredAt,
    })
    notifCreated++
  }

  // 6. Review cycle + performance reviews
  const cycleCreated = await create<Record<string, unknown>>('review_cycles', {
    user_id: userId,
    name: 'H1 2026',
    start_date: '2026-01-01',
    end_date: '2026-06-30',
    status: 'in_progress',
    created_at: now,
    updated_at: now,
  })
  const cycleRow = (cycleCreated.data ?? cycleCreated) as Record<string, unknown>
  const cycleId = String(cycleRow.id)

  let reviewsCreated = 0
  for (const r of PERF_SEEDS) {
    const employeeId = empIdByEmail.get(r.employee_email)
    const reviewerId = empIdByEmail.get(r.reviewer_email) ?? null
    if (!employeeId) continue
    await create('performance_reviews', {
      user_id: userId,
      employee_id: employeeId,
      reviewer_id: reviewerId,
      cycle_id: cycleId,
      rating: r.rating,
      summary: r.summary,
      status: r.status,
      submitted_at: r.status === 'completed' ? now : null,
      created_at: now,
      updated_at: now,
    })
    reviewsCreated++
  }

  return {
    departmentsCreated: DEPARTMENTS.length,
    employeesCreated: EMPLOYEES.length,
    ptoCreated,
    documentsCreated: docsCreated,
    notificationsCreated: notifCreated,
    reviewsCreated,
    cyclesCreated: 1,
  }
}

function notificationIcon(kind: NotificationSeed['kind']): string {
  switch (kind) {
    case 'pto':
      return 'event_available'
    case 'document':
      return 'description'
    case 'mention':
      return 'alternate_email'
    case 'anniversary':
      return 'celebration'
    case 'review':
      return 'star'
  }
}

/**
 * Lightweight idempotent seed wrapper used by every authenticated GET
 * route — runs the seed once per user, then becomes a no-op.
 *
 * Cached in-memory so we don't pay a count() for every request from a
 * user we've already seeded this process.
 */
const seededUserIds = new Set<string>()
const inFlight = new Map<string, Promise<void>>()

export async function ensureSeeded(userId: string | null | undefined): Promise<void> {
  if (!userId) return
  if (seededUserIds.has(userId)) return
  let p = inFlight.get(userId)
  if (!p) {
    p = (async () => {
      try {
        await seedDemoForUser(userId)
        seededUserIds.add(userId)
      } finally {
        inFlight.delete(userId)
      }
    })()
    inFlight.set(userId, p)
  }
  await p
}

export async function seedListUserIds(): Promise<string[]> {
  const rows = await findMany<{ user_id: string }>('employees', { limit: 1 })
  return rows.map((r) => String(r.user_id))
}
