"use client"

import { canActOn, formatDate, formatDateTime, isAdmin } from "@contraponha/client-core"
import { UserRole, type AdminUserDetail } from "@contraponha/types"
import {
  Avatar,
  Banner,
  Button,
  Card,
  ConfirmDialog,
  inputClasses,
  Skeleton,
  useApi,
  useI18n,
  useViewer,
} from "@contraponha/web-ui"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { StatusChip } from "@/components/users/status-chip"
import { SuspendDialog } from "@/components/users/suspend-dialog"
import { SuspensionHistory } from "@/components/users/suspension-history"
import { useUserActions } from "@/hooks/use-user-actions"
import { hubQueryKeys } from "@/lib/query-keys"
import { webLinks } from "@/lib/web-links"

export interface UserDetailProps {
  handle: string
}

export function UserDetail({ handle }: UserDetailProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()

  const query = useQuery({
    queryKey: hubQueryKeys.user(handle),
    queryFn: () => api.admin.getUser(handle),
  })

  return (
    <>
      <Button asChild variant="ghost" className="-ml-2.5 self-start px-2.5">
        <Link href="/users">
          <ArrowLeft aria-hidden className="size-5" />
          {t("hub.user.back")}
        </Link>
      </Button>
      {query.data ? <AccountView detail={query.data} /> : <Skeleton className="h-64" />}
    </>
  )
}

interface AccountViewProps {
  detail: AdminUserDetail
}

function AccountView({ detail }: AccountViewProps): React.JSX.Element {
  const { t, locale } = useI18n()
  const { user, status, suspension } = detail

  return (
    <>
      <header className="flex flex-wrap items-center gap-5">
        <Avatar id={user.id} name={user.displayName} src={user.avatarUrl} size="xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-[28px] leading-tight font-semibold">
              {user.displayName}
            </h1>
            <StatusChip status={status} />
          </div>
          <p className="text-muted">
            @{user.handle} · {t(`hub.roles.${user.role}`)}
          </p>
          <a
            href={webLinks.profile(user.handle)}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1.5 self-start text-sm text-brand"
          >
            <ExternalLink aria-hidden className="size-4" />
            {t("hub.user.openProfile")}
          </a>
        </div>
      </header>
      {suspension ? (
        <Banner tone={suspension.endsAt ? "warning" : "danger"}>
          {t(`web.rules.${suspension.rule}`)} ·{" "}
          {suspension.endsAt
            ? t("hub.user.until", { date: formatDateTime({ value: suspension.endsAt, locale }) })
            : t("hub.user.forever")}
        </Banner>
      ) : null}
      {user.deletionScheduledAt ? (
        <Banner tone="info">
          {t("hub.user.deletionScheduled", {
            date: formatDate({ value: user.deletionScheduledAt, locale }),
          })}
        </Banner>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <AccountFacts detail={detail} />
        <AccountActions detail={detail} />
      </div>
      <SuspensionHistory suspensions={detail.suspensions} />
    </>
  )
}

function AccountFacts({ detail }: AccountViewProps): React.JSX.Element {
  const { t, locale } = useI18n()
  const { user } = detail

  const facts = [
    {
      label: t("hub.user.email"),
      value: `${user.email} (${user.isEmailVerified ? t("hub.user.verified") : t("hub.user.unverified")})`,
    },
    { label: t("hub.user.joined"), value: formatDate({ value: user.createdAt, locale }) },
    {
      label: t("hub.user.lastActive"),
      value: detail.lastActiveAt
        ? formatDateTime({ value: detail.lastActiveAt, locale })
        : t("hub.user.never"),
    },
    { label: t("hub.user.reportsAgainst"), value: String(detail.reportsAgainst) },
    { label: t("hub.user.reportsFiled"), value: String(detail.reportsFiled) },
  ]

  return (
    <Card className="p-5">
      <dl className="grid gap-4 sm:grid-cols-2">
        {facts.map(({ label, value }) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="wrap-break-word">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

type OpenDialog = "suspend" | "lift" | "photo" | null

function AccountActions({ detail }: AccountViewProps): React.JSX.Element | null {
  const { t } = useI18n()
  const viewer = useViewer()
  const { user, suspension } = detail
  const actions = useUserActions(user.handle)
  const [dialog, setDialog] = useState<OpenDialog>(null)

  if (!viewer) return null

  const canAct = canActOn({ actor: viewer, target: user }) && !user.isDeleted
  const canChangeRole = isAdmin(viewer) && viewer.id !== user.id && !user.isDeleted

  if (!canAct && !canChangeRole) return null

  const close = (): void => setDialog(null)

  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="text-sm font-semibold">{t("hub.user.actions")}</h2>
      {canAct && suspension ? (
        <Button variant="secondary" onClick={() => setDialog("lift")}>
          {t("hub.user.lift")}
        </Button>
      ) : null}
      {canAct && !suspension ? (
        <Button variant="dangerOutline" onClick={() => setDialog("suspend")}>
          {t("hub.user.suspend")}
        </Button>
      ) : null}
      {canAct && user.avatarUrl ? (
        <Button variant="secondary" onClick={() => setDialog("photo")}>
          {t("hub.user.removePhoto")}
        </Button>
      ) : null}
      {canChangeRole ? (
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t("hub.user.role")}
          <select
            className={inputClasses}
            value={user.role}
            disabled={actions.changeRole.isPending}
            onChange={(event) => {
              const role = Object.values(UserRole).find((value) => value === event.target.value)

              if (role) actions.changeRole.mutate(role)
            }}
          >
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {t(`hub.roles.${role}`)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <SuspendDialog
        handle={user.handle}
        open={dialog === "suspend"}
        onOpenChange={(open) => setDialog(open ? "suspend" : null)}
        isPending={actions.suspend.isPending}
        onConfirm={(input) => actions.suspend.mutate(input, { onSuccess: close })}
      />
      <ConfirmDialog
        open={dialog === "lift"}
        onOpenChange={(open) => setDialog(open ? "lift" : null)}
        title={t("hub.user.liftTitle", { handle: user.handle })}
        description={t("hub.user.liftLead")}
        confirmLabel={t("hub.user.lift")}
        cancelLabel={t("web.common.cancel")}
        closeLabel={t("web.common.close")}
        tone="primary"
        isPending={actions.lift.isPending}
        onConfirm={() => actions.lift.mutate(undefined, { onSuccess: close })}
      />
      <ConfirmDialog
        open={dialog === "photo"}
        onOpenChange={(open) => setDialog(open ? "photo" : null)}
        title={t("hub.user.removePhotoTitle", { handle: user.handle })}
        description={t("hub.user.removePhotoLead")}
        confirmLabel={t("hub.user.removePhoto")}
        cancelLabel={t("web.common.cancel")}
        closeLabel={t("web.common.close")}
        isPending={actions.removePhoto.isPending}
        onConfirm={() => actions.removePhoto.mutate(undefined, { onSuccess: close })}
      />
    </Card>
  )
}
