"use client"

import { formatDate } from "@contraponha/client-core"
import { AccountStatus, UserRole, type AdminUserSummary } from "@contraponha/types"
import type { AdminUserListQuery } from "@contraponha/validation"
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Input,
  inputClasses,
  useApi,
  useI18n,
} from "@contraponha/web-ui"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Search, Users } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useDebouncedValue } from "@contraponha/client-core/react"

import { StatusChip } from "@/components/users/status-chip"
import { hubQueryKeys } from "@/lib/query-keys"

const FIRST_PAGE: string | undefined = undefined
const SEARCH_DELAY_MS = 300

const STATUS_FILTERS = [
  AccountStatus.ACTIVE,
  AccountStatus.SUSPENDED,
  AccountStatus.DELETION_SCHEDULED,
] as const

type StatusFilter = (typeof STATUS_FILTERS)[number]

function roleOf(value: string): UserRole | undefined {
  return Object.values(UserRole).find((role) => role === value)
}

function statusOf(value: string): StatusFilter | undefined {
  return STATUS_FILTERS.find((status) => status === value)
}

export function UserList(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const [search, setSearch] = useState("")
  const [role, setRole] = useState<UserRole>()
  const [status, setStatus] = useState<StatusFilter>()
  const q = useDebouncedValue({ value: search.trim(), delayMs: SEARCH_DELAY_MS })

  const filters: AdminUserListQuery = { q: q || undefined, role, status }

  const query = useInfiniteQuery({
    queryKey: hubQueryKeys.users(filters),
    queryFn: ({ pageParam }) => api.admin.listUsers({ ...filters, cursor: pageParam }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  const users = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <>
      <h1 className="font-serif text-[28px] font-semibold">{t("hub.users.title")}</h1>
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">{t("hub.users.search")}</span>
          <Search
            aria-hidden
            className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle"
          />
          <Input
            type="search"
            value={search}
            placeholder={t("hub.users.search")}
            className="pl-10"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          aria-label={t("hub.users.role")}
          className={`${inputClasses} md:w-52`}
          value={role ?? ""}
          onChange={(event) => setRole(roleOf(event.target.value))}
        >
          <option value="">{t("hub.users.allRoles")}</option>
          {Object.values(UserRole).map((value) => (
            <option key={value} value={value}>
              {t(`hub.roles.${value}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t("hub.users.status")}
          className={`${inputClasses} md:w-52`}
          value={status ?? ""}
          onChange={(event) => setStatus(statusOf(event.target.value))}
        >
          <option value="">{t("hub.users.allStatuses")}</option>
          {STATUS_FILTERS.map((value) => (
            <option key={value} value={value}>
              {t(`hub.status.${value}`)}
            </option>
          ))}
        </select>
      </div>
      {users.length === 0 && !query.isPending ? (
        <Card>
          <EmptyState icon={<Users className="size-8" />} title={t("hub.users.empty")} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {users.map((summary) => (
              <UserRow key={summary.user.id} summary={summary} />
            ))}
          </ul>
        </Card>
      )}
      {query.hasNextPage ? (
        <Button
          variant="secondary"
          className="self-center"
          isLoading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("web.common.loadMore")}
        </Button>
      ) : null}
    </>
  )
}

interface UserRowProps {
  summary: AdminUserSummary
}

function UserRow({ summary }: UserRowProps): React.JSX.Element {
  const { t, locale } = useI18n()
  const { user, status } = summary

  return (
    <li className="border-t border-line first:border-t-0">
      <Link
        href={`/users/${user.handle}`}
        className="flex items-center gap-4 px-5 py-3.5 text-ink no-underline hover:bg-surface-sunken"
      >
        <Avatar id={user.id} name={user.displayName} src={user.avatarUrl} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{user.displayName}</span>
          <span className="truncate text-sm text-muted">
            @{user.handle} · {user.email}
          </span>
        </div>
        <span className="hidden text-[13px] text-subtle md:block">
          {t("hub.users.joined", { date: formatDate({ value: user.createdAt, locale }) })}
        </span>
        <span className="hidden text-[13px] text-muted sm:block">
          {t(`hub.roles.${user.role}`)}
        </span>
        <StatusChip status={status} />
      </Link>
    </li>
  )
}
