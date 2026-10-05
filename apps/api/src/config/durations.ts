import { minutesToMs, msToSeconds, secondsToMs } from "@ponto/config"

export const HEALTH_DEPENDENCY_TIMEOUT_MS = secondsToMs(2)
export const REDIS_COMMAND_TIMEOUT_MS = secondsToMs(2)

export const SESSION_CACHE_MAX_TTL_SECONDS = msToSeconds(minutesToMs(15))
export const SESSION_LAST_USED_WRITE_INTERVAL_MS = minutesToMs(5)

export const EMAIL_VERIFICATION_TTL_HOURS = 24
export const PASSWORD_RESET_TTL_MINUTES = 30

export const CONTENT_EDIT_WINDOW_MINUTES = 30
