import { CommunityRule } from "@contraponha/types"

import { RadioGroup } from "@/components/ui/choice"
import { useI18n } from "@/providers/i18n-provider"

const RULES = Object.values(CommunityRule)

export interface RuleSelectProps {
  value: CommunityRule | undefined
  onChange: (rule: CommunityRule) => void
}

export function RuleSelect({ value, onChange }: RuleSelectProps): React.JSX.Element {
  const { t } = useI18n()

  return (
    <RadioGroup
      value={value}
      onChange={onChange}
      options={RULES.map((rule) => ({ value: rule, label: t(`web.rules.${rule}`) }))}
    />
  )
}
