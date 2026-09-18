/**
 * Format an instant in a specific IANA timezone (e.g. "Mon, Mar 3, 2025,
 * 12:00 PM EST"), including the zone abbreviation. Booking confirmation emails
 * use this to show each recipient the meeting time in THEIR timezone (the
 * invitee in their submitted `invitee_timezone`, the host in their availability
 * timezone) instead of a hardcoded UTC time. Falls back to a UTC string for an
 * invalid/unknown timezone.
 *
 * @module
 */

export function formatInTimezone(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date)
  } catch (_error) {
    // Invalid IANA zone — Intl throws a RangeError; fall back to UTC.
    return `${date.toUTCString()} (UTC)`
  }
}
