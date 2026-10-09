import type { AdminTopicListQuery, AdminUserListQuery } from "@contraponha/validation"

// Cache keys for hub-only queries; shared ones (reports, actions) come from client-core.
export const hubQueryKeys = {
  metrics: (days: number) => ["admin", "metrics", days] as const,
  users: (query: AdminUserListQuery) => ["admin", "users", query] as const,
  user: (handle: string) => ["admin", "user", handle] as const,
  topics: (query: AdminTopicListQuery) => ["admin", "topics", query] as const,
  allTopics: ["admin", "topics"] as const,
}
