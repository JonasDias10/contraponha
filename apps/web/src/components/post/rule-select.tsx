"use client"

import { CommunityRule } from "@ponto/types"

import { useI18n } from "@/components/providers/i18n-provider"
import { RadioGroup, RadioItem } from "@/components/ui/controls"

export const RULES = Object.values(CommunityRule)

export interface RuleSelectProps {
  value: CommunityRule | undefined
  onChange: (rule: CommunityRule) => void
}

function isRule(value: string): value is CommunityRule {
  return RULES.some((rule) => rule === value)
}

export function RuleSelect({ value, onChange }: RuleSelectProps): React.JSX.Element {
  const { t } = useI18n()

  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => {
        if (isRule(next)) onChange(next)
      }}
      aria-label={t("web.moderation.rule")}
      className="grid gap-3 sm:grid-cols-2"
    >
      {RULES.map((rule) => (
        <label key={rule} className="flex items-start gap-3 text-sm">
          <RadioItem value={rule} />
          {t(`web.rules.${rule}`)}
        </label>
      ))}
    </RadioGroup>
  )
}
