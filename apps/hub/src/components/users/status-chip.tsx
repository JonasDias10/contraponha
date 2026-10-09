"use client"

import type { AccountStatus } from "@contraponha/types"
import { Chip, useI18n, type ChipProps } from "@contraponha/web-ui"

const TONE: Record<AccountStatus, ChipProps["tone"]> = {
  active: "success",
  suspended: "warning",
  banned: "danger",
  deletion_scheduled: "neutral",
  deleted: "neutral",
}

export interface StatusChipProps {
  status: AccountStatus
}

export function StatusChip({ status }: StatusChipProps): React.JSX.Element {
  const { t } = useI18n()

  return <Chip tone={TONE[status]}>{t(`hub.status.${status}`)}</Chip>
}
