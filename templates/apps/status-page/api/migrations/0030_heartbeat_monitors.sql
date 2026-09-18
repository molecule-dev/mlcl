-- Heartbeat (dead-man's-switch) monitors.
--
-- The existing monitor is a POLLER: it fetches `monitor_url` and reports what it
-- finds. That answers "is the target down?" but it cannot answer "did my
-- monitoring stack die?" — the case where alerts silently stop firing while the
-- service itself keeps serving, so every dashboard stays green and nobody is
-- paged. Detecting that requires inverting the direction: the target reports IN
-- on a schedule, and SILENCE is the alarm condition.
--
-- A component is either polled (`monitor_url`) or heartbeat-driven
-- (`heartbeat_key`); the probe sweep treats `heartbeat_key` as authoritative
-- when both are set, because a heartbeat is a stronger signal than a poll.
--
-- `heartbeat_key` is the shared secret in a PUBLIC unauthenticated URL, so it
-- must be unguessable — an attacker who learns it can suppress a real outage by
-- beating on behalf of a dead service. Generate it with `gen_random_uuid()` (the
-- API's default) or another CSPRNG, never a name or slug.

ALTER TABLE public.status_components
    ADD COLUMN heartbeat_key text,
    ADD COLUMN heartbeat_interval_seconds integer,
    ADD COLUMN last_heartbeat_at timestamp with time zone;

-- Unique so a key identifies exactly one component. Partial, so the many
-- components WITHOUT a heartbeat do not collide on NULL.
CREATE UNIQUE INDEX status_components_heartbeat_key_idx
    ON public.status_components (heartbeat_key)
    WHERE heartbeat_key IS NOT NULL;

-- The staleness sweep filters on this; keeps it off a full scan as the fleet grows.
CREATE INDEX status_components_heartbeat_due_idx
    ON public.status_components (last_heartbeat_at)
    WHERE heartbeat_key IS NOT NULL;

-- An interval must be positive when a heartbeat is configured: a NULL or 0
-- interval would make "is it overdue?" undefined, and an undefined monitor that
-- silently never fires is worse than no monitor at all.
ALTER TABLE public.status_components
    ADD CONSTRAINT status_components_heartbeat_interval_check
    CHECK (
        heartbeat_key IS NULL
        OR (heartbeat_interval_seconds IS NOT NULL AND heartbeat_interval_seconds > 0)
    );
