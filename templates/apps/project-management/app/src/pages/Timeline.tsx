import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import MobileNav from '../components/MobileNav.js'
import TimelineSideNav from '../components/TimelineSideNav.js'
import { UserMenu } from '../components/UserMenu.js'

function TimelineChrome({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100%' }}>
      <MobileNav />
      <TimelineSideNav />
      <div className="md:ml-[18rem]">{children}</div>
    </div>
  )
}

interface Milestone {
  id: string
  title: string
  due_date: string | null
  status: string
  description: string | null
}

interface Task {
  id: string
  title: string
  due_date: string | null
  status: string
  priority: string
}

interface CalendarEvent {
  id: string
  title: string
  date: Date
  type: 'milestone' | 'task'
  color: 'primary' | 'success' | 'error'
  status: string
}

interface CalendarDay {
  day: number
  isCurrentMonth: boolean
  date: Date
  events: CalendarEvent[]
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MINI_DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  primary: { bg: 'rgba(70, 72, 212, 0.1)', text: '#4648d4', border: '#4648d4' },
  success: { bg: 'rgba(34, 197, 94, 0.1)', text: '#16a34a', border: '#22c55e' },
  error: { bg: 'rgba(186, 26, 26, 0.1)', text: '#ba1a1a', border: '#ba1a1a' },
  tertiary: { bg: 'rgba(181, 93, 0, 0.1)', text: '#b55d00', border: '#b55d00' },
}

function getEventColor(status: string, dueDate: Date): 'primary' | 'success' | 'error' {
  if (status === 'completed' || status === 'done') return 'success'
  if (dueDate < new Date() && status !== 'completed' && status !== 'done') return 'error'
  return 'primary'
}

function buildCalendarDays(year: number, month: number, events: CalendarEvent[]): CalendarDay[] {
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const days: CalendarDay[] = []

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    days.push({ day, isCurrentMonth: false, date: new Date(year, month - 1, day), events: [] })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dayEvents = events.filter(
      (e) =>
        e.date.getFullYear() === year && e.date.getMonth() === month && e.date.getDate() === day,
    )
    days.push({ day, isCurrentMonth: true, date, events: dayEvents })
  }

  const remaining = 42 - days.length
  for (let day = 1; day <= remaining; day++) {
    days.push({ day, isCurrentMonth: false, date: new Date(year, month + 1, day), events: [] })
  }

  return days
}

export function TimelinePage({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const http = useHttpClient()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [view, setView] = useState<'day' | 'week' | 'month'>('month')
  const [showAddMilestone, setShowAddMilestone] = useState(false)

  // Escape closes the add-milestone modal (keyboard equivalent of the
  // pointer-only backdrop click).
  useEffect(() => {
    if (!showAddMilestone) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddMilestone(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAddMilestone])
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('')
  const [newMilestoneDate, setNewMilestoneDate] = useState('')
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null)
  const cm = getClassMap()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [milestonesRes, tasksRes] = await Promise.all([
        http.get<Milestone[]>('/api/milestones', { params: { project_id: projectId } }),
        http.get<Task[]>('/api/tasks', { params: { project_id: projectId } }),
      ])
      setMilestones(milestonesRes.data ?? [])
      setTasks(tasksRes.data ?? [])
    } catch (_error) {
      // Handled by HTTP client
    } finally {
      setLoading(false)
    }
  }, [http, projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // When invoked without a projectId (top-level /timeline or /calendar
  // route), fall back to the user's first project so "Add Event" can
  // still create a milestone somewhere meaningful.
  useEffect(() => {
    if (projectId) {
      setDefaultProjectId(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get<{ id: string }[]>('/api/projects')
        const list = res?.data ?? []
        if (!cancelled && list[0]?.id) setDefaultProjectId(list[0].id)
      } catch (_error) {
        // ignore — no default project available, add-event button stays disabled
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, projectId])

  const effectiveProjectId = projectId || defaultProjectId

  const openAddMilestone = () => {
    setNewMilestoneTitle('')
    setNewMilestoneDescription('')
    setNewMilestoneDate(new Date().toISOString().slice(0, 10))
    setCreateError(null)
    setShowAddMilestone(true)
  }

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!effectiveProjectId) {
      setCreateError(
        t(
          'timeline.noProjectError',
          {},
          { defaultValue: 'Create a project before adding milestones.' },
        ),
      )
      return
    }
    if (!newMilestoneTitle.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await http.post<Milestone>('/api/milestones', {
        project_id: effectiveProjectId,
        title: newMilestoneTitle.trim(),
        description: newMilestoneDescription.trim() || undefined,
        due_date: newMilestoneDate ? new Date(newMilestoneDate).toISOString() : undefined,
        status: 'open',
      })
      const created = (res?.data ?? res) as unknown as Milestone | undefined
      if (created?.id) {
        track({
          name: 'milestone.created',
          properties: { milestoneId: created.id, projectId: effectiveProjectId },
        })
        setMilestones((prev) => [...prev, created])
      } else {
        await loadData()
      }
      setShowAddMilestone(false)
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t('timeline.createError', {}, { defaultValue: 'Could not create milestone.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteEvent = async (eventId: string, eventType: 'milestone' | 'task') => {
    setSelectedEventId(null)
    try {
      if (eventType === 'milestone') {
        await http.delete(`/api/milestones/${eventId}`)
        track({ name: 'milestone.deleted', properties: { milestoneId: eventId } })
        setMilestones((prev) => prev.filter((m) => m.id !== eventId))
      } else {
        await http.delete(`/api/tasks/${eventId}`)
        setTasks((prev) => prev.filter((t) => t.id !== eventId))
      }
    } catch (_error) {
      // Delete failed — reload to restore the event on the calendar.
      await loadData()
    }
  }

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = []
    for (const m of milestones) {
      if (!m.due_date) continue
      const date = new Date(m.due_date)
      events.push({
        id: m.id,
        title: m.title,
        date,
        type: 'milestone',
        color: getEventColor(m.status, date),
        status: m.status,
      })
    }
    for (const tk of tasks) {
      if (!tk.due_date) continue
      const date = new Date(tk.due_date)
      events.push({
        id: tk.id,
        title: tk.title,
        date,
        type: 'task',
        color: getEventColor(tk.status, date),
        status: tk.status,
      })
    }
    return events.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [milestones, tasks])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = new Date()
  const todayStr = today.toDateString()

  const calendarDays = useMemo(
    () => buildCalendarDays(year, month, calendarEvents),
    [year, month, calendarEvents],
  )

  const upcomingEvents = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return calendarEvents.filter((e) => e.date >= now).slice(0, 5)
  }, [calendarEvents])

  const monthLabel = currentDate.toLocaleDateString(undefined, { month: 'long' })
  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  if (loading) {
    return (
      <TimelineChrome>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.sp('p', 12),
          )}
        >
          <div className={cm.spinner({ size: 'lg' })} />
        </div>
      </TimelineChrome>
    )
  }

  return (
    <TimelineChrome>
      <div
        data-mol-id="page-timeline"
        className={cm.flex({ direction: 'col' })}
        style={{
          minHeight: '100%',
          backgroundColor: 'var(--color-background)',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Header Controls */}
        <header
          data-mol-id="header"
          className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-y-2')}
          style={{
            position: 'sticky',
            top: 0,
            minHeight: 64,
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 8,
            paddingBottom: 8,
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            zIndex: 40,
          }}
        >
          <div className={cm.flex({ align: 'center', gap: 'lg' })}>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                lineHeight: '28px',
                color: 'var(--color-on-background)',
                margin: 0,
              }}
            >
              {t(
                'status.today',
                { month: monthLabel, year: String(year) },
                { defaultValue: `${monthLabel} ${year}` },
              )}
            </h1>
            <div
              className={cm.flex({ align: 'center' })}
              style={{
                backgroundColor: 'var(--color-surface-container)',
                padding: 4,
                borderRadius: 8,
              }}
            >
              <button
                data-mol-id="button-today"
                onClick={goToToday}
                style={{
                  padding: '6px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--color-on-background)',
                  backgroundColor: 'var(--color-on-error)',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                {t('timeline.today', {}, { defaultValue: 'Today' })}
              </button>
              <div className={cm.flex()} style={{ marginLeft: 8 }}>
                <button
                  data-mol-id="button-prev-month"
                  onClick={goToPrevMonth}
                  className={cm.flex({ align: 'center', justify: 'center' })}
                  style={{
                    padding: 10,
                    borderRadius: '6px 0 0 6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    chevron_left
                  </span>
                </button>
                <button
                  data-mol-id="button-next-month"
                  onClick={goToNextMonth}
                  className={cm.flex({ align: 'center', justify: 'center' })}
                  style={{
                    padding: 10,
                    borderRadius: '0 6px 6px 0',
                    border: 'none',
                    borderLeft: '1px solid rgba(148, 163, 184, 0.2)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <div
              className={cm.flex()}
              style={{
                backgroundColor: 'var(--color-surface-container)',
                padding: 4,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {(['day', 'week', 'month'] as const).map((v) => (
                <button
                  key={v}
                  data-mol-id={`button-view-${v}`}
                  onClick={() => setView(v)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                    backgroundColor: view === v ? 'var(--color-on-error)' : 'transparent',
                    color: view === v ? 'var(--color-primary)' : 'var(--color-outline)',
                    boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  {t(
                    `timeline.view.${v}`,
                    {},
                    { defaultValue: v.charAt(0).toUpperCase() + v.slice(1) },
                  )}
                </button>
              ))}
            </div>
            <button
              data-mol-id="button-add-event"
              data-testid="timeline-add-event"
              className={cm.flex({ align: 'center', gap: 'sm' })}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-on-error)',
                padding: '8px 20px',
                borderRadius: 9999,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 16,
                lineHeight: '24px',
                boxShadow: '0 4px 6px rgba(70, 72, 212, 0.15)',
              }}
              onClick={openAddMilestone}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                add_circle
              </span>
              {t('timeline.addEvent', {}, { defaultValue: 'Add Event' })}
            </button>
            <UserMenu />
          </div>
        </header>

        {/* Content Area */}
        <main
          data-mol-id="main-content"
          className={cm.flex()}
          style={{ flex: 1, overflow: 'hidden' }}
        >
          {/* Left Tool Panel — lg+ only; a 288px rail would consume most of
              a phone's viewport (the calendar grid is the primary content on
              mobile). */}
          <aside
            className="hidden lg:flex flex-col w-72 shrink-0 overflow-y-auto p-8 gap-10"
            style={{ backgroundColor: 'rgba(234, 237, 255, 0.3)' }}
          >
            {/* Mini Calendar */}
            <section
              data-mol-id="mini-calendar"
              style={{ fontSize: 10, color: 'var(--color-on-surface-variant)' }}
            >
              <div
                className={cm.flex({ align: 'center', justify: 'between' })}
                style={{ marginBottom: 16, padding: '0 4px' }}
              >
                <h2
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    lineHeight: '20px',
                    color: 'var(--color-on-background)',
                    margin: 0,
                  }}
                >
                  {t(
                    'timeline.miniCalTitle',
                    { month: monthLabel, year: String(year) },
                    { defaultValue: `${monthLabel} ${year}` },
                  )}
                </h2>
                <div className={cm.flex({ gap: 'sm' })}>
                  <button
                    type="button"
                    aria-label={t('timeline.prevMonth', undefined, {
                      defaultValue: 'Previous month',
                    })}
                    className="material-symbols-outlined"
                    onClick={goToPrevMonth}
                    style={{
                      fontSize: 14,
                      cursor: 'pointer',
                      color: 'var(--color-outline)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                    }}
                  >
                    arrow_back_ios
                  </button>
                  <button
                    type="button"
                    aria-label={t('timeline.nextMonth', undefined, {
                      defaultValue: 'Next month',
                    })}
                    className="material-symbols-outlined"
                    onClick={goToNextMonth}
                    style={{
                      fontSize: 14,
                      cursor: 'pointer',
                      color: 'var(--color-outline)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                    }}
                  >
                    arrow_forward_ios
                  </button>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  textAlign: 'center',
                  rowGap: 8,
                }}
              >
                {MINI_DAY_HEADERS.map((d) => (
                  <span
                    key={d}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--color-outline)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t(`timeline.miniDay.${d}`, {}, { defaultValue: d })}
                  </span>
                ))}
                {calendarDays.map((d, i) => {
                  const isToday = d.isCurrentMonth && d.date.toDateString() === todayStr
                  return (
                    <span
                      key={i}
                      style={{
                        fontSize: 12,
                        padding: '4px 0',
                        fontWeight: d.isCurrentMonth ? 500 : 400,
                        opacity: d.isCurrentMonth ? 1 : 0.3,
                        color: isToday ? 'var(--color-on-error)' : 'var(--color-on-background)',
                        backgroundColor: isToday ? 'var(--color-primary)' : 'transparent',
                        borderRadius: isToday ? 9999 : 6,
                        cursor: d.isCurrentMonth ? 'pointer' : 'default',
                      }}
                    >
                      {d.day}
                    </span>
                  )
                })}
              </div>
            </section>

            {/* Upcoming Events */}
            <section
              data-mol-id="upcoming-events"
              className={cm.flex({ direction: 'col', gap: 'md' })}
            >
              <h2
                className={cm.flex({ align: 'center', justify: 'between' })}
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: '20px',
                  color: 'var(--color-on-background)',
                  margin: 0,
                }}
              >
                {t('timeline.upcomingEvents', {}, { defaultValue: 'Upcoming Events' })}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    backgroundColor: 'var(--color-surface-container-high)',
                    color: 'var(--color-primary)',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    textTransform: 'uppercase',
                  }}
                >
                  {t(
                    'timeline.totalEvents',
                    { count: String(upcomingEvents.length) },
                    { defaultValue: `${upcomingEvents.length} total` },
                  )}
                </span>
              </h2>
              <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
                {upcomingEvents.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#64748b', padding: 12 }}>
                    {t('timeline.noUpcoming', {}, { defaultValue: 'No upcoming events' })}
                  </p>
                ) : (
                  upcomingEvents.map((event) => {
                    const colors = EVENT_COLORS[event.color]
                    const isUrgent = event.color === 'error'
                    const diffMs = event.date.getTime() - new Date().setHours(0, 0, 0, 0)
                    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

                    let timeLabel: string
                    if (daysUntil <= 0) timeLabel = t('status.today', {}, { defaultValue: 'Today' })
                    else if (daysUntil === 1)
                      timeLabel = t('timeline.eventTomorrow', {}, { defaultValue: 'Tomorrow' })
                    else if (daysUntil <= 7)
                      timeLabel = t(
                        'timeline.inDays',
                        { count: String(daysUntil) },
                        { defaultValue: `In ${daysUntil} days` },
                      )
                    else
                      timeLabel = event.date.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })

                    return (
                      <div
                        key={event.id}
                        style={{
                          padding: 12,
                          backgroundColor: 'var(--color-on-error)',
                          borderRadius: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'lg',
                          cursor: 'pointer',
                          borderLeft: isUrgent ? `4px solid ${colors.border}` : undefined,
                          transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                      >
                        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                          {!isUrgent && (
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 9999,
                                backgroundColor: colors.border,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: 'var(--color-on-background)',
                            }}
                          >
                            {event.title}
                          </span>
                        </div>
                        <span
                          className={cm.flex({ align: 'center', gap: 'xs' })}
                          style={{
                            fontSize: 10,
                            color: isUrgent
                              ? 'var(--color-error)'
                              : 'var(--color-on-surface-variant)',
                            fontWeight: isUrgent ? 500 : 400,
                          }}
                        >
                          {!isUrgent && (
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                              {event.type === 'milestone' ? 'event' : 'schedule'}
                            </span>
                          )}
                          {timeLabel}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </section>
          </aside>

          {/* Calendar Grid */}
          <section
            data-mol-id="calendar-grid"
            style={{
              flex: 1,
              padding: 32,
              backgroundColor: 'var(--color-background)',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            {/* A 7-column calendar cannot stay legible at phone width — keep
                the grid at a readable minimum and let it scroll horizontally
                (fleet-accepted pattern for calendar/board surfaces). */}
            <div className="overflow-x-auto">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gridAutoRows: 'minmax(120px, auto)',
                  backgroundColor: 'var(--color-surface-container)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  gap: '1px',
                  border: '1px solid rgba(199, 196, 215, 0.2)',
                  minWidth: 640,
                }}
              >
                {/* Day Headers */}
                {DAY_HEADERS.map((day) => (
                  <div
                    key={day}
                    style={{
                      backgroundColor: 'var(--color-surface-container-low)',
                      padding: 16,
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--color-outline)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t(`timeline.day.${day}`, {}, { defaultValue: day })}
                  </div>
                ))}

                {/* Calendar Days */}
                {calendarDays.map((d, i) => {
                  return (
                    <div
                      key={i}
                      style={{
                        backgroundColor: d.isCurrentMonth
                          ? 'var(--color-on-error)'
                          : 'rgba(242, 243, 255, 0.5)',
                        padding: 8,
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: 'var(--color-on-background)',
                          lineHeight: '20px',
                          opacity: d.isCurrentMonth ? 1 : 0.3,
                        }}
                      >
                        {d.day}
                      </span>
                      {d.events.map((event) => {
                        const colors = EVENT_COLORS[event.color]
                        const isSelected = selectedEventId === event.id
                        return (
                          <div key={event.id} style={{ position: 'relative' }}>
                            <div
                              data-mol-id={`event-${event.id}`}
                              role="button"
                              tabIndex={0}
                              aria-expanded={isSelected}
                              onClick={() => setSelectedEventId(isSelected ? null : event.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setSelectedEventId(isSelected ? null : event.id)
                                }
                              }}
                              style={{
                                marginTop: 8,
                                backgroundColor: isSelected ? 'var(--color-primary)' : colors.bg,
                                color: isSelected ? 'var(--color-on-error)' : colors.text,
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '4px 8px',
                                borderRadius: 6,
                                borderLeft: isSelected ? 'none' : `2px solid ${colors.border}`,
                                cursor: 'pointer',
                                boxShadow: isSelected ? '0 4px 6px rgba(70, 72, 212, 0.3)' : 'none',
                                lineHeight: '14px',
                              }}
                            >
                              {event.title}
                            </div>

                            {/* Event Detail Popover */}
                            {isSelected && (
                              <div
                                data-mol-id="event-popover"
                                role="dialog"
                                style={{
                                  position: 'absolute',
                                  top: 48,
                                  left: 0,
                                  width: 256,
                                  backgroundColor: 'var(--color-on-error)',
                                  borderRadius: 16,
                                  boxShadow:
                                    '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                                  padding: 16,
                                  zIndex: 50,
                                  border: '1px solid rgba(199, 196, 215, 0.1)',
                                }}
                              >
                                <div
                                  className={cm.flex({ justify: 'between', align: 'start' })}
                                  style={{ marginBottom: 12 }}
                                >
                                  <h3
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 700,
                                      lineHeight: '20px',
                                      color: 'var(--color-on-background)',
                                      margin: 0,
                                    }}
                                  >
                                    {event.title}
                                  </h3>
                                  <button
                                    data-mol-id={`event-close-${event.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedEventId(null)
                                    }}
                                    style={{
                                      border: 'none',
                                      background: 'none',
                                      cursor: 'pointer',
                                      color: 'var(--color-outline)',
                                      padding: 0,
                                    }}
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      style={{ fontSize: 14 }}
                                    >
                                      close
                                    </span>
                                  </button>
                                </div>
                                <div
                                  className={cm.flex({ direction: 'col', gap: 'sm' })}
                                  style={{ marginBottom: 16 }}
                                >
                                  <div
                                    className={cm.flex({ align: 'center', gap: 'sm' })}
                                    style={{
                                      fontSize: 11,
                                      color: 'var(--color-on-surface-variant)',
                                    }}
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      style={{ fontSize: 14 }}
                                    >
                                      schedule
                                    </span>
                                    <span>
                                      {event.date.toLocaleDateString(undefined, {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                  <div
                                    className={cm.flex({ align: 'center', gap: 'sm' })}
                                    style={{
                                      fontSize: 11,
                                      color: 'var(--color-on-surface-variant)',
                                    }}
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      style={{ fontSize: 14 }}
                                    >
                                      assignment
                                    </span>
                                    <span>
                                      {event.type === 'milestone'
                                        ? t(
                                            'timeline.typeMilestone',
                                            {},
                                            { defaultValue: 'Milestone' },
                                          )
                                        : t('timeline.typeTask', {}, { defaultValue: 'Task' })}
                                    </span>
                                  </div>
                                </div>
                                {event.type === 'task' && projectId && (
                                  <div
                                    style={{
                                      paddingTop: 12,
                                      borderTop: '1px solid rgba(199, 196, 215, 0.1)',
                                      marginBottom: 12,
                                    }}
                                  >
                                    <Link
                                      data-mol-id={`event-open-${event.id}`}
                                      data-testid={`timeline-event-open-${event.id}`}
                                      to={`/projects/${projectId}/board`}
                                      style={{
                                        display: 'inline-block',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: 'var(--color-primary)',
                                        textDecoration: 'none',
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {t(
                                        'timeline.viewOnBoard',
                                        {},
                                        { defaultValue: 'View on board →' },
                                      )}
                                    </Link>
                                  </div>
                                )}
                                <div className={cm.flex({ gap: 'sm' })} style={{ marginTop: 8 }}>
                                  <button
                                    data-mol-id={`event-delete-${event.id}`}
                                    data-testid={`timeline-event-delete-${event.id}`}
                                    style={{
                                      flex: 1,
                                      backgroundColor: 'var(--mol-color-background-secondary)',
                                      color: 'var(--color-error)',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      padding: '8px 0',
                                      borderRadius: 8,
                                      border: 'none',
                                      cursor: 'pointer',
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      void handleDeleteEvent(event.id, event.type)
                                    }}
                                  >
                                    {t(
                                      'timeline.deleteEvent',
                                      {},
                                      { defaultValue: 'Delete event' },
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </main>

        {showAddMilestone && (
          <div
            data-testid="timeline-add-event-modal"
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              aria-hidden="true"
              onClick={() => setShowAddMilestone(false)}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(19, 27, 46, 0.4)',
              }}
            />
            <form
              onSubmit={handleCreateMilestone}
              className={cm.flex({ direction: 'col', gap: 'md' })}
              style={{
                position: 'relative',
                backgroundColor: 'var(--color-on-error)',
                borderRadius: 16,
                padding: 24,
                width: 'min(440px, 92vw)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--color-on-background)',
                  margin: 0,
                }}
              >
                {t('timeline.addMilestoneTitle', {}, { defaultValue: 'Add milestone' })}
              </h2>
              <label
                className={cm.flex({ direction: 'col', gap: 'xs' })}
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)' }}
              >
                {t('form.title', {}, { defaultValue: 'Title' })}
                <input
                  data-testid="timeline-add-event-title"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  required
                  style={{
                    border: '1px solid var(--color-outline-variant)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 14,
                    color: 'var(--color-on-background)',
                  }}
                />
              </label>
              <label
                className={cm.flex({ direction: 'col', gap: 'xs' })}
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)' }}
              >
                {t('timeline.milestoneDateLabel', {}, { defaultValue: 'Due date' })}
                <input
                  data-testid="timeline-add-event-date"
                  type="date"
                  value={newMilestoneDate}
                  onChange={(e) => setNewMilestoneDate(e.target.value)}
                  style={{
                    border: '1px solid var(--color-outline-variant)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 14,
                    color: 'var(--color-on-background)',
                  }}
                />
              </label>
              <label
                className={cm.flex({ direction: 'col', gap: 'xs' })}
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface-variant)' }}
              >
                {t('form.description', {}, { defaultValue: 'Description' })}
                <textarea
                  data-testid="timeline-add-event-description"
                  value={newMilestoneDescription}
                  onChange={(e) => setNewMilestoneDescription(e.target.value)}
                  rows={3}
                  style={{
                    border: '1px solid var(--color-outline-variant)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 14,
                    color: 'var(--color-on-background)',
                    resize: 'vertical',
                  }}
                />
              </label>
              {createError && (
                <div role="alert" style={{ fontSize: 12, color: 'var(--color-error)' }}>
                  {createError}
                </div>
              )}
              <div className={cm.flex({ gap: 'sm', justify: 'end' })}>
                <button
                  type="button"
                  onClick={() => setShowAddMilestone(false)}
                  style={{
                    backgroundColor: 'var(--color-surface-container-low)',
                    color: 'var(--color-on-surface-variant)',
                    border: 'none',
                    borderRadius: 9999,
                    padding: '8px 20px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  data-testid="timeline-add-event-submit"
                  disabled={creating}
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-on-error)',
                    border: 'none',
                    borderRadius: 9999,
                    padding: '8px 20px',
                    fontWeight: 600,
                    cursor: creating ? 'not-allowed' : 'pointer',
                    opacity: creating ? 0.7 : 1,
                  }}
                >
                  {creating
                    ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                    : t('common.create', {}, { defaultValue: 'Create' })}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </TimelineChrome>
  )
}
