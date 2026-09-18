/**
 * Telemedicine — startup seed.
 *
 * Idempotently seeds the specialty catalog and a handful of verified
 * accepting providers when the database is empty. Runs at server boot
 * after migrations so the directory page (`/providers`) is never empty
 * for fresh installs.
 *
 * Per-user demo seed runs the first time a freshly-signed-up user GETs
 * any of `appointments`, `prescriptions`, `records`, or `notifications`
 * — see `seedForUser` below — so the patient portal has realistic
 * content immediately after signup.
 *
 * Safe to call repeatedly: every insert checks existence first.
 */
import { count, create, findMany, query } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

const DEMO_PROVIDERS: Array<{
  display_name: string
  specialty: string
  specialty_slug: string
  bio: string
  consultation_fee: number
  rating: number
  total_reviews: number
  total_consultations: number
  languages: string[]
  first_name: string
  last_name: string
  title: string
}> = [
  {
    display_name: 'Dr. Mira Chen',
    first_name: 'Mira',
    last_name: 'Chen',
    title: 'Dr.',
    specialty: 'Internal Medicine',
    specialty_slug: 'internal-medicine',
    bio: 'Board-certified internist with 12 years of experience in primary care, chronic disease management, and preventive medicine.',
    consultation_fee: 79,
    rating: 4.9,
    total_reviews: 847,
    total_consultations: 1820,
    languages: ['English', 'Mandarin'],
  },
  {
    display_name: 'Dr. Aaron Patel',
    first_name: 'Aaron',
    last_name: 'Patel',
    title: 'Dr.',
    specialty: 'Family Medicine',
    specialty_slug: 'family-medicine',
    bio: 'Family physician treating adults and children with a focus on whole-family wellness.',
    consultation_fee: 65,
    rating: 4.8,
    total_reviews: 612,
    total_consultations: 1430,
    languages: ['English', 'Hindi', 'Gujarati'],
  },
  {
    display_name: 'Dr. Sofia Reyes',
    first_name: 'Sofia',
    last_name: 'Reyes',
    title: 'Dr.',
    specialty: 'Dermatology',
    specialty_slug: 'dermatology',
    bio: 'Dermatologist specialising in teledermatology, acne, eczema, and skin cancer screening via photo review.',
    consultation_fee: 95,
    rating: 4.9,
    total_reviews: 423,
    total_consultations: 1210,
    languages: ['English', 'Spanish'],
  },
  {
    display_name: 'Dr. James Okonkwo',
    first_name: 'James',
    last_name: 'Okonkwo',
    title: 'Dr.',
    specialty: 'Mental Health',
    specialty_slug: 'mental-health',
    bio: 'Licensed psychiatrist providing telepsychiatry for anxiety, depression, ADHD, and insomnia.',
    consultation_fee: 120,
    rating: 4.9,
    total_reviews: 528,
    total_consultations: 980,
    languages: ['English', 'French'],
  },
  {
    display_name: 'Dr. Lila Hammond',
    first_name: 'Lila',
    last_name: 'Hammond',
    title: 'Dr.',
    specialty: 'Pediatrics',
    specialty_slug: 'pediatrics',
    bio: 'Pediatrician with a calm bedside manner. Sick visits, well-child checks, and parent guidance.',
    consultation_fee: 75,
    rating: 4.8,
    total_reviews: 391,
    total_consultations: 1040,
    languages: ['English'],
  },
]

const SPECIALTIES = [
  { slug: 'internal-medicine', label: 'Internal Medicine', icon: 'stethoscope' },
  { slug: 'family-medicine', label: 'Family Medicine', icon: 'family_restroom' },
  { slug: 'dermatology', label: 'Dermatology', icon: 'face' },
  { slug: 'mental-health', label: 'Mental Health', icon: 'psychology' },
  { slug: 'pediatrics', label: 'Pediatrics', icon: 'child_care' },
  { slug: 'urgent-care', label: 'Urgent Care', icon: 'emergency' },
  { slug: 'womens-health', label: "Women's Health", icon: 'female' },
  { slug: 'cardiology', label: 'Cardiology', icon: 'cardiology' },
]

let directorySeedRan = false

/**
 * Seed the specialty catalog + demo providers idempotently. Safe at boot.
 */
export async function seedDirectory(): Promise<void> {
  if (directorySeedRan) return
  try {
    const existingSpecialties = (await findMany<{ id: string; slug: string }>(
      'specialties',
      {},
    )) as Array<{
      id: string
      slug: string
    }>
    const haveSlugs = new Set(existingSpecialties.map((s) => s.slug))
    const slugToId = new Map<string, string>(existingSpecialties.map((s) => [s.slug, s.id]))

    for (const sp of SPECIALTIES) {
      if (haveSlugs.has(sp.slug)) continue
      const result = await create('specialties', {
        slug: sp.slug,
        label: sp.label,
        icon: sp.icon,
        created_at: new Date(),
      })
      const created = (result as { data?: Record<string, unknown> }).data ?? result
      const id = (created as { id?: string }).id
      if (id) slugToId.set(sp.slug, id)
    }

    const providerCount = await count('providers')
    if (providerCount === 0) {
      const SYSTEM_PROVIDER_USER_ID = '00000000-0000-0000-0000-000000000001'
      for (const p of DEMO_PROVIDERS) {
        await create('providers', {
          user_id: SYSTEM_PROVIDER_USER_ID,
          display_name: p.display_name,
          first_name: p.first_name,
          last_name: p.last_name,
          title: p.title,
          specialty_id: slugToId.get(p.specialty_slug) ?? null,
          specialty: p.specialty,
          bio: p.bio,
          consultation_fee: p.consultation_fee,
          hourly_rate_cents: p.consultation_fee * 100,
          languages: JSON.stringify(p.languages),
          education: JSON.stringify([]),
          certifications: JSON.stringify([]),
          rating: p.rating,
          total_reviews: p.total_reviews,
          total_consultations: p.total_consultations,
          avatar_url: null,
          is_verified: true,
          is_active: true,
          accepting_patients: true,
          is_accepting_patients: true,
          created_at: new Date(),
        })
      }
    }
    await seedAvailabilitySlots()
    directorySeedRan = true
  } catch (error) {
    logger.error('telemedicine seed: directory failed', error)
  }
}

/**
 * Seed availability slots for every verified provider so the booking
 * flow has slots to render. Idempotent: only runs when the table is
 * empty for a given provider. We seed the next 7 weekdays at fixed
 * 30-minute slots between 09:00 and 16:30.
 */
async function seedAvailabilitySlots(): Promise<void> {
  try {
    const providers = (await findMany<{ id: string }>('providers', {
      where: [{ field: 'is_verified', operator: '=', value: true }],
    })) as Array<{ id: string }>
    if (providers.length === 0) return
    const now = new Date()
    for (const p of providers) {
      const existing = await query<{ id: string }>(
        'SELECT id FROM availability_slots WHERE provider_id = $1 LIMIT 1',
        [p.id],
      )
      if ((existing.rows ?? []).length > 0) continue
      for (let d = 1; d <= 14; d++) {
        const day = new Date(now.getTime() + d * 24 * 60 * 60 * 1000)
        const dow = day.getDay()
        if (dow === 0 || dow === 6) continue
        for (let h = 9; h < 17; h++) {
          for (const m of [0, 30]) {
            const start = new Date(day)
            start.setHours(h, m, 0, 0)
            const end = new Date(start.getTime() + 30 * 60 * 1000)
            await create('availability_slots', {
              provider_id: p.id,
              starts_at: start,
              ends_at: end,
              date: start.toISOString().slice(0, 10),
              start_time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
              end_time: `${String(m === 30 ? h + 1 : h).padStart(2, '0')}:${String(m === 30 ? 0 : 30).padStart(2, '0')}:00`,
              is_booked: false,
              created_at: now,
            })
          }
        }
      }
    }
  } catch (error) {
    logger.error('telemedicine seed: availability slots failed', error)
  }
}

const userSeedRan = new Set<string>()
const userSeedInFlight = new Map<string, Promise<void>>()

interface ProviderRow extends Record<string, unknown> {
  id: string
  display_name: string
  user_id: string
  consultation_fee?: number
}

/**
 * Per-user demo seed: creates a couple of upcoming + past appointments,
 * a sample prescription, a sample medical record, and a welcome
 * notification. Idempotent per user (in-process cache + check).
 */
export async function seedForUser(userId: string): Promise<void> {
  if (userSeedRan.has(userId)) return
  // Coalesce concurrent calls for the same user: every dashboard load
  // fires ~5 GETs in parallel (today's appointments, vitals, snapshot,
  // patients, profile), each of which calls seedForUser. Without a
  // shared in-flight promise they all pass `userSeedRan.has(userId)`
  // simultaneously, race past the existing-appointment LIMIT 1 check
  // (it returns empty for all of them at once), and each inserts the
  // demo data → 5x duplicates.
  const inflight = userSeedInFlight.get(userId)
  if (inflight) return inflight
  const promise = (async () => {
    try {
      await seedDirectory()

      const existing = await query<{ id: string }>(
        'SELECT id FROM appointments WHERE patient_user_id = $1 LIMIT 1',
        [userId],
      )
      if ((existing.rows ?? []).length > 0) {
        userSeedRan.add(userId)
        return
      }

      const providers = (await findMany<ProviderRow>('providers', {
        where: [{ field: 'is_verified', operator: '=', value: true }],
      })) as ProviderRow[]
      if (providers.length < 2) {
        userSeedRan.add(userId)
        return
      }

      const provider = providers[0]
      const otherProvider = providers[1]
      const now = new Date()

      const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      inThreeDays.setHours(14, 30, 0, 0)
      await create('appointments', {
        patient_user_id: userId,
        provider_user_id: provider.user_id,
        provider_id: provider.id,
        scheduled_at: inThreeDays,
        duration_minutes: 30,
        type: 'video',
        reason: 'Annual physical follow-up',
        status: 'scheduled',
        created_at: now,
      })

      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      lastWeek.setHours(10, 0, 0, 0)
      await create('appointments', {
        patient_user_id: userId,
        provider_user_id: otherProvider.user_id,
        provider_id: otherProvider.id,
        scheduled_at: lastWeek,
        duration_minutes: 20,
        type: 'video',
        reason: 'Sinus congestion + cough',
        status: 'completed',
        summary: 'Likely viral upper-respiratory infection. Rest, fluids, OTC decongestant.',
        completed_at: lastWeek,
        created_at: lastWeek,
      })

      await create('prescriptions', {
        provider_user_id: otherProvider.user_id,
        provider_id: otherProvider.id,
        patient_user_id: userId,
        drug_name: 'Amoxicillin',
        medication_name: 'Amoxicillin',
        dosage: '500 mg',
        frequency: 'Three times daily',
        duration: '7 days',
        refills: 0,
        refills_allowed: 1,
        refills_used: 0,
        instructions: 'Take with food. Finish the entire course.',
        status: 'filled',
        prescribed_at: lastWeek,
        created_at: lastWeek,
      })

      await create('prescriptions', {
        provider_user_id: provider.user_id,
        provider_id: provider.id,
        patient_user_id: userId,
        drug_name: 'Lisinopril',
        medication_name: 'Lisinopril',
        dosage: '10 mg',
        frequency: 'Once daily',
        duration: '90 days',
        refills: 3,
        refills_allowed: 5,
        refills_used: 2,
        instructions: 'Take in the morning. Monitor blood pressure weekly.',
        status: 'active',
        prescribed_at: now,
        created_at: now,
      })

      await create('prescriptions', {
        provider_user_id: provider.user_id,
        provider_id: provider.id,
        patient_user_id: userId,
        drug_name: 'Atorvastatin',
        medication_name: 'Atorvastatin',
        dosage: '20 mg',
        frequency: 'Once nightly',
        duration: '90 days',
        refills: 2,
        refills_allowed: 5,
        refills_used: 3,
        instructions: 'Take at bedtime. Recheck lipid panel in 12 weeks.',
        status: 'active',
        prescribed_at: now,
        created_at: now,
      })

      await create('medical_records', {
        patient_user_id: userId,
        provider_user_id: otherProvider.user_id,
        provider_id: otherProvider.id,
        kind: 'lab',
        type: 'lab',
        title: 'Comprehensive metabolic panel',
        description: 'Routine bloodwork — normal ranges across the board.',
        data: JSON.stringify({ glucose: 92, sodium: 140, potassium: 4.1 }),
        attachments: JSON.stringify([]),
        occurred_on: lastWeek.toISOString().slice(0, 10),
        record_date: lastWeek.toISOString().slice(0, 10),
        source: 'uploaded',
        created_at: lastWeek,
      })

      await create('notifications', {
        user_id: userId,
        kind: 'system_message',
        payload: JSON.stringify({
          title: 'Welcome to Solace',
          body: 'Your patient portal is ready. Browse providers in the directory to book your next visit.',
        }),
        created_at: now,
      })

      await create('notifications', {
        user_id: userId,
        kind: 'rx_filled',
        payload: JSON.stringify({
          title: 'Prescription ready',
          body: 'Amoxicillin 500mg is ready for pickup at your selected pharmacy.',
        }),
        created_at: now,
      })

      userSeedRan.add(userId)
    } catch (error) {
      logger.error('telemedicine seed: per-user failed', error)
    } finally {
      userSeedInFlight.delete(userId)
    }
  })()
  userSeedInFlight.set(userId, promise)
  return promise
}
