import { Text, type TextProps } from "react-native"

import { usePalette } from "@/hooks/use-palette"
import { type, type Palette, type TypeVariant } from "@/lib/theme"

export type TextTone =
  "ink" | "muted" | "subtle" | "brand" | "accent" | "danger" | "success" | "warning" | "onBrand"

export interface AppTextProps extends TextProps {
  variant?: TypeVariant
  tone?: TextTone
}

export function AppText({
  variant = "body",
  tone = "ink",
  style,
  ...props
}: AppTextProps): React.JSX.Element {
  const palette = usePalette()
  const color: Palette[TextTone] = palette[tone]

  return <Text style={[type[variant], { color }, style]} {...props} />
}
