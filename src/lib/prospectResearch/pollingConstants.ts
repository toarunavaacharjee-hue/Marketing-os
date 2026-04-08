/**
 * Prospect memo generation can run two Anthropic calls (each up to ~120s) plus JSON repair.
 * Keep client polling and "stale running" recovery aligned so we do not abort or re-queue
 * jobs that are still legitimately processing.
 */
export const PROSPECT_RESEARCH_CLIENT_POLL_MAX_MS = 15 * 60_000;

/** If status is still "running" after this since started_at, allow re-queue (worker likely died). */
export const PROSPECT_RESEARCH_STALE_RUNNING_MS = 15 * 60_000;
