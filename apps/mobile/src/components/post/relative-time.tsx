import { formatDateTime, formatRelativeDate } from "@contraponha/client-core"

import { AppText, type AppTextProps } from "@/components/ui/text"
import { useI18n } from "@/providers/i18n-provider"

export interface RelativeTimeProps extends Omit<AppTextProps, "children"> {
  value: string
}

export function RelativeTime({ value, ...props }: RelativeTimeProps): React.JSX.Element {
  const { locale } = useI18n()

  return (
    <AppText accessibilityLabel={formatDateTime({ value, locale })} {...props}>
      {formatRelativeDate({ value, locale })}
    </AppText>
  )
}
