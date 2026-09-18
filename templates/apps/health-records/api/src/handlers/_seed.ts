/**
 * health-records — per-user demo seeding.
 *
 * On the first authenticated request from a user (signup or login) this
 * module checks whether the user has any records yet. If not, it seeds
 * a realistic set of conditions, medications, allergies, vitals, labs,
 * visits, immunizations, documents, and notifications. Every row is
 * owned by the caller's user_id, so it stays scoped per-user.
 *
 * The seed is gated on count(conditions). Once a user has conditions,
 * subsequent calls become a no-op. Concurrent calls are guarded with
 * an in-memory `seedingInFlight` map to avoid double-seeding when a
 * fresh signup hits multiple endpoints simultaneously.
 */

import { count, create } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

const seededUsers = new Set<string>()
const seedingInFlight = new Map<string, Promise<void>>()

const DAY = 86_400_000

function relDate(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * DAY)
}

function isoDate(daysAgo: number): string {
  return relDate(daysAgo).toISOString().slice(0, 10)
}

interface CreatedIdResult {
  data?: { id?: string }
}

function takeId(result: unknown): string | null {
  const r = result as CreatedIdResult
  return r?.data?.id ?? null
}

/**
 * Seed demo content for a single user, idempotently. Returns immediately
 * if the user is already seeded.
 */
export async function seedDemoForUser(userId: string): Promise<void> {
  if (seededUsers.has(userId)) return

  const inFlight = seedingInFlight.get(userId)
  if (inFlight) return inFlight

  const promise = (async () => {
    const existing = await count('conditions', [{ field: 'user_id', operator: '=', value: userId }])
    if (existing > 0) {
      seededUsers.add(userId)
      return
    }

    // Conditions
    const conditions = [
      {
        name: 'Type 2 Diabetes Mellitus',
        icd10_code: 'E11.9',
        status: 'active',
        severity: 'moderate',
        onset_date: isoDate(560),
        provider_name: 'Dr. Anika Patel',
        notes: 'Diet-managed; A1C trending 6.8%.',
        source: 'provider',
      },
      {
        name: 'Hypertension, controlled',
        icd10_code: 'I10',
        status: 'active',
        severity: 'mild',
        onset_date: isoDate(1280),
        provider_name: 'Dr. Anika Patel',
        notes: 'Lisinopril 10mg daily.',
        source: 'provider',
      },
      {
        name: 'Allergic rhinitis',
        icd10_code: 'J30.1',
        status: 'chronic',
        severity: 'mild',
        onset_date: isoDate(2400),
        provider_name: 'Dr. Sarah Lin',
        notes: 'Seasonal; loratadine PRN.',
        source: 'self',
      },
    ]
    for (const c of conditions) {
      await create('conditions', {
        user_id: userId,
        ...c,
        resolution_date: null,
        created_at: relDate(560),
      })
    }

    // Allergies
    const allergies = [
      {
        allergen: 'Penicillin',
        substance: 'Penicillin',
        category: 'medication',
        reaction: 'Anaphylaxis (2014)',
        severity: 'severe',
        onset_date: isoDate(4000),
        status: 'active',
        verified_by: 'Dr. Patel',
        notes: 'Use cephalosporins with caution.',
      },
      {
        allergen: 'Latex',
        substance: 'Latex',
        category: 'environmental',
        reaction: 'Contact dermatitis',
        severity: 'moderate',
        onset_date: isoDate(2800),
        status: 'active',
        verified_by: null,
        notes: null,
      },
      {
        allergen: 'Tree pollen',
        substance: 'Tree pollen',
        category: 'environmental',
        reaction: 'Seasonal rhinitis',
        severity: 'mild',
        onset_date: isoDate(2400),
        status: 'active',
        verified_by: null,
        notes: null,
      },
    ]
    for (const a of allergies) {
      await create('allergies', {
        user_id: userId,
        ...a,
        is_active: a.status === 'active',
        created_at: relDate(2400),
      })
    }

    // Medications
    const meds = [
      {
        name: 'Atorvastatin',
        generic_name: 'Atorvastatin Calcium',
        dosage: '20 mg',
        frequency: 'daily',
        route: 'oral',
        prescriber: 'Dr. Anika Patel',
        start_date: isoDate(120),
        refills_total: 6,
        refills_used: 5,
        indication: 'Hyperlipidemia',
        pharmacy: 'Walgreens · Linden Ave',
        instructions: 'Take 1 tablet by mouth at bedtime.',
      },
      {
        name: 'Metformin',
        generic_name: 'Metformin Hydrochloride',
        dosage: '500 mg',
        frequency: 'twice_daily',
        route: 'oral',
        prescriber: 'Dr. Anika Patel',
        start_date: isoDate(560),
        refills_total: 5,
        refills_used: 2,
        indication: 'Type 2 Diabetes',
        pharmacy: 'Walgreens · Linden Ave',
        instructions: 'Take 1 tablet by mouth twice daily with food.',
      },
      {
        name: 'Lisinopril',
        generic_name: 'Lisinopril',
        dosage: '10 mg',
        frequency: 'daily',
        route: 'oral',
        prescriber: 'Dr. Marcus Chen',
        start_date: isoDate(1280),
        refills_total: 4,
        refills_used: 4,
        indication: 'Hypertension',
        pharmacy: 'CVS · 14th & Main',
        instructions: 'Take 1 tablet by mouth once daily in the morning.',
      },
    ]
    for (const m of meds) {
      await create('medications', {
        user_id: userId,
        name: m.name,
        generic_name: m.generic_name,
        dosage: m.dosage,
        frequency: m.frequency,
        route: m.route,
        prescriber: m.prescriber,
        start_date: m.start_date,
        end_date: null,
        indication: m.indication,
        refills_total: m.refills_total,
        refills_used: m.refills_used,
        refills_remaining: Math.max(0, m.refills_total - m.refills_used),
        pharmacy: m.pharmacy,
        instructions: m.instructions,
        is_active: true,
        status: 'active',
        notes: null,
        created_at: relDate(120),
      })
    }

    // Vitals — last few days, two readings each for a small trend
    const today = relDate(0)
    const vitalRows: Array<Record<string, unknown>> = [
      {
        vital_type: 'blood_pressure',
        value: 118,
        secondary_value: 76,
        unit: 'mmHg',
        blood_pressure_sys: 118,
        blood_pressure_dia: 76,
        recorded_at: today,
      },
      { vital_type: 'heart_rate', value: 64, unit: 'bpm', heart_rate: 64, recorded_at: today },
      { vital_type: 'oxygen_saturation', value: 98, unit: '%', spo2: 98, recorded_at: today },
      { vital_type: 'temperature', value: 98.4, unit: '°F', temperature: 98.4, recorded_at: today },
      { vital_type: 'weight', value: 168, unit: 'lbs', weight_kg: 76.2, recorded_at: today },
      {
        vital_type: 'blood_pressure',
        value: 122,
        secondary_value: 78,
        unit: 'mmHg',
        blood_pressure_sys: 122,
        blood_pressure_dia: 78,
        recorded_at: relDate(7),
      },
      { vital_type: 'heart_rate', value: 68, unit: 'bpm', heart_rate: 68, recorded_at: relDate(7) },
    ]
    for (const v of vitalRows) {
      await create('vitals', {
        user_id: userId,
        vital_type: v.vital_type,
        value: v.value,
        secondary_value: v.secondary_value ?? null,
        unit: v.unit,
        blood_pressure_sys: v.blood_pressure_sys ?? null,
        blood_pressure_dia: v.blood_pressure_dia ?? null,
        heart_rate: v.heart_rate ?? null,
        temperature: v.temperature ?? null,
        weight_kg: v.weight_kg ?? null,
        height_cm: v.height_cm ?? null,
        spo2: v.spo2 ?? null,
        respiratory_rate: v.respiratory_rate ?? null,
        source: 'manual',
        recorded_at: v.recorded_at,
        notes: null,
        created_at: v.recorded_at,
      })
    }

    // Visits
    const visit1 = await create('visits', {
      user_id: userId,
      provider_id: null,
      provider_name: 'Dr. Anika Patel',
      clinic_name: 'Brightcare Internal Medicine',
      scheduled_at: relDate(28),
      completed_at: relDate(28),
      chief_complaint: 'Annual physical',
      assessment: 'Well-controlled diabetes and hypertension. Mild dyslipidemia.',
      plan: 'Continue metformin and lisinopril. Repeat A1C and lipid panel in 3 months. Add vitamin D supplement.',
      follow_up_at: relDate(-90),
      notes: 'Discussed exercise plan and DASH diet.',
      created_at: relDate(28),
    })
    const visit1Id = takeId(visit1)
    if (visit1Id) {
      await create('visit_orders', {
        visit_id: visit1Id,
        user_id: userId,
        kind: 'lab',
        description: 'Comprehensive metabolic panel',
        status: 'completed',
        created_at: relDate(28),
      })
      await create('visit_orders', {
        visit_id: visit1Id,
        user_id: userId,
        kind: 'lab',
        description: 'Lipid panel',
        status: 'completed',
        created_at: relDate(28),
      })
      await create('visit_diagnoses', {
        visit_id: visit1Id,
        user_id: userId,
        condition_id: null,
        icd10_code: 'E11.9',
        description: 'Type 2 diabetes mellitus without complications',
        created_at: relDate(28),
      })
    }

    await create('visits', {
      user_id: userId,
      provider_id: null,
      provider_name: 'Dr. Marcus Chen',
      clinic_name: 'CardioSouth · Telehealth',
      scheduled_at: relDate(78),
      completed_at: relDate(78),
      chief_complaint: 'Cardiology follow-up',
      assessment: 'Stable on current antihypertensive regimen.',
      plan: 'Continue lisinopril 10mg daily. ECG in 6 months.',
      follow_up_at: null,
      notes: 'Telehealth visit.',
      created_at: relDate(78),
    })

    // Lab results
    const lab1 = await create('lab_results', {
      user_id: userId,
      panel_name: 'Lipid Panel',
      test_name: 'Lipid Panel',
      category: 'blood',
      ordering_provider: 'Dr. Anika Patel',
      performing_lab: 'Quest Diagnostics',
      collected_date: isoDate(28),
      drawn_at: relDate(28),
      result_date: isoDate(27),
      resulted_at: relDate(27),
      status: 'final',
      results: JSON.stringify([]),
      units: 'mg/dL',
      reference_range: 'see components',
      flag: 'high',
      attachment_id: null,
      notes: null,
      created_at: relDate(28),
    })
    const lab1Id = takeId(lab1)
    if (lab1Id) {
      const components = [
        {
          test_name: 'Total Cholesterol',
          value: '212',
          unit: 'mg/dL',
          reference_low: null,
          reference_high: 200,
          flag: 'high',
        },
        {
          test_name: 'LDL Cholesterol',
          value: '142',
          unit: 'mg/dL',
          reference_low: null,
          reference_high: 100,
          flag: 'high',
        },
        {
          test_name: 'HDL Cholesterol',
          value: '52',
          unit: 'mg/dL',
          reference_low: 40,
          reference_high: null,
          flag: 'normal',
        },
        {
          test_name: 'Triglycerides',
          value: '128',
          unit: 'mg/dL',
          reference_low: null,
          reference_high: 150,
          flag: 'normal',
        },
      ]
      for (const c of components) {
        await create('lab_result_values', {
          result_id: lab1Id,
          user_id: userId,
          test_name: c.test_name,
          value: c.value,
          unit: c.unit,
          reference_low: c.reference_low,
          reference_high: c.reference_high,
          flag: c.flag,
          created_at: relDate(27),
        })
      }
    }

    const lab2 = await create('lab_results', {
      user_id: userId,
      panel_name: 'HbA1c',
      test_name: 'HbA1c',
      category: 'blood',
      ordering_provider: 'Dr. Anika Patel',
      performing_lab: 'Quest Diagnostics',
      collected_date: isoDate(28),
      drawn_at: relDate(28),
      result_date: isoDate(27),
      resulted_at: relDate(27),
      status: 'final',
      results: JSON.stringify([]),
      units: '%',
      reference_range: '< 5.7',
      flag: 'high',
      attachment_id: null,
      notes: null,
      created_at: relDate(28),
    })
    const lab2Id = takeId(lab2)
    if (lab2Id) {
      await create('lab_result_values', {
        result_id: lab2Id,
        user_id: userId,
        test_name: 'HbA1c',
        value: '6.8',
        unit: '%',
        reference_low: null,
        reference_high: 5.7,
        flag: 'high',
        created_at: relDate(27),
      })
    }

    const lab3 = await create('lab_results', {
      user_id: userId,
      panel_name: null,
      test_name: 'Vitamin D, 25-Hydroxy',
      category: 'blood',
      ordering_provider: 'Dr. Anika Patel',
      performing_lab: 'Quest Diagnostics',
      collected_date: isoDate(28),
      drawn_at: relDate(28),
      result_date: isoDate(27),
      resulted_at: relDate(27),
      status: 'final',
      results: JSON.stringify([]),
      units: 'ng/mL',
      reference_range: '30 – 100',
      flag: 'normal',
      attachment_id: null,
      notes: null,
      created_at: relDate(28),
    })
    const lab3Id = takeId(lab3)
    if (lab3Id) {
      await create('lab_result_values', {
        result_id: lab3Id,
        user_id: userId,
        test_name: 'Vitamin D',
        value: '32',
        unit: 'ng/mL',
        reference_low: 30,
        reference_high: 100,
        flag: 'normal',
        created_at: relDate(27),
      })
    }

    // Immunizations
    const imm = [
      {
        vaccine_name: 'COVID-19 mRNA (Pfizer)',
        cvx_code: '208',
        dose_number: 4,
        series_total: 4,
        administered_date: isoDate(210),
        manufacturer: 'Pfizer-BioNTech',
        lot_number: 'FW1234',
        facility: 'CVS Pharmacy · 14th & Main',
        site: 'left deltoid',
      },
      {
        vaccine_name: 'Influenza (quadrivalent)',
        cvx_code: '150',
        dose_number: 1,
        series_total: 1,
        administered_date: isoDate(195),
        manufacturer: 'Sanofi',
        lot_number: 'IF2025A',
        facility: 'CVS Pharmacy · 14th & Main',
        site: 'right deltoid',
      },
      {
        vaccine_name: 'Tdap',
        cvx_code: '115',
        dose_number: 1,
        series_total: 1,
        administered_date: isoDate(720),
        manufacturer: 'GSK',
        lot_number: 'TD7281',
        facility: 'Brightcare Internal Medicine',
        site: 'left deltoid',
      },
    ]
    for (const i of imm) {
      await create('immunizations', {
        user_id: userId,
        vaccine_name: i.vaccine_name,
        cvx_code: i.cvx_code,
        dose_number: i.dose_number,
        series_total: i.series_total,
        administered_date: i.administered_date,
        administered_at: new Date(i.administered_date),
        expiration_date: null,
        lot_number: i.lot_number,
        manufacturer: i.manufacturer,
        administered_by: 'RN K. Lopez',
        administering_provider: 'CVS Pharmacy',
        facility: i.facility,
        site: i.site,
        route: 'intramuscular',
        notes: null,
        created_at: new Date(i.administered_date),
      })
    }

    // Documents (metadata only — no actual file uploads in seed)
    const docs = [
      {
        title: 'Annual physical results · Apr 2026',
        kind: 'lab_pdf',
        category: 'lab_report',
        provider: 'Dr. Patel',
        file: 'physical-2026-04.pdf',
        mime: 'application/pdf',
        size: 412_000,
        daysAgo: 28,
      },
      {
        title: 'Chest X-ray · 2 views',
        kind: 'imaging',
        category: 'imaging',
        provider: 'Mercy Imaging',
        file: 'chest-xray.dcm',
        mime: 'image/dicom',
        size: 2_100_000,
        daysAgo: 52,
      },
      {
        title: 'Cardiology referral letter',
        kind: 'referral',
        category: 'referral',
        provider: 'Dr. Chen',
        file: 'referral-cardio.pdf',
        mime: 'application/pdf',
        size: 84_000,
        daysAgo: 78,
      },
      {
        title: 'Insurance card · BlueCross 2026',
        kind: 'insurance',
        category: 'insurance',
        provider: null,
        file: 'insurance.png',
        mime: 'image/png',
        size: 220_000,
        daysAgo: 125,
      },
    ]
    for (const d of docs) {
      await create('medical_documents', {
        user_id: userId,
        title: d.title,
        kind: d.kind,
        category: d.category,
        s3_key: null,
        file_url: null,
        file_name: d.file,
        file_size: d.size,
        size_bytes: d.size,
        content_type: d.mime,
        mime_type: d.mime,
        encryption_iv: null,
        sha256: null,
        related_record_id: null,
        provider_name: d.provider,
        document_date: isoDate(d.daysAgo),
        notes: null,
        uploaded_at: relDate(d.daysAgo),
        created_at: relDate(d.daysAgo),
      })
    }

    // Notifications
    const notes = [
      {
        kind: 'lab_result',
        payload: {
          title: 'New lab results available',
          body: 'Lipid panel results have arrived. LDL is flagged high.',
          urgency: 'caution',
        },
        daysAgo: 0,
      },
      {
        kind: 'medication_refill',
        payload: {
          title: 'Lisinopril refill due',
          body: '2 days of Lisinopril 10 mg remaining. Tap to request a refill.',
          urgency: 'caution',
        },
        daysAgo: 0,
      },
      {
        kind: 'visit_reminder',
        payload: {
          title: 'Follow-up reminder',
          body: 'Repeat A1C and lipid panel due in 3 months.',
          urgency: 'routine',
        },
        daysAgo: 1,
      },
      {
        kind: 'system',
        payload: {
          title: 'Welcome to Vitals',
          body: 'Your record is encrypted end-to-end. Invite a provider to get started.',
          urgency: 'routine',
        },
        daysAgo: 0,
      },
    ]
    for (const n of notes) {
      await create('notifications', {
        user_id: userId,
        kind: n.kind,
        payload: JSON.stringify(n.payload),
        read_at: null,
        created_at: relDate(n.daysAgo),
      })
    }

    seededUsers.add(userId)
  })()

  seedingInFlight.set(userId, promise)
  try {
    await promise
  } catch (err) {
    logger.error('[health-records/_seed] Failed to seed demo data:', err)
    throw err
  } finally {
    seedingInFlight.delete(userId)
  }
}
