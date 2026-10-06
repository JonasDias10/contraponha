import { minutesToMs, msToSeconds, secondsToMs } from "@ponto/config"

export const HEALTH_DEPENDENCY_TIMEOUT_MS = secondsToMs(2)
export const REDIS_COMMAND_TIMEOUT_MS = secondsToMs(2)

export const SESSION_CACHE_MAX_TTL_SECONDS = msToSeconds(minutesToMs(15))
export const SESSION_LAST_USED_WRITE_INTERVAL_MS = minutesToMs(5)

export const EMAIL_VERIFICATION_TTL_HOURS = 24
export const PASSWORD_RESET_TTL_MINUTES = 30
export const MAGIC_LINK_TTL_MINUTES = 15

export const MEDIA_UPLOAD_URL_TTL_MINUTES = 10

export const FEED_FEATURED_WINDOW_DAYS = 7

export const ACCOUNT_DELETION_GRACE_DAYS = 30
export const DATA_EXPORT_RETENTION_DAYS = 7
export const DATA_EXPORT_DOWNLOAD_URL_TTL_MINUTES = 10
export const BACKGROUND_JOBS_INTERVAL_MS = 60_000
