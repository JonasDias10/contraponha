import type { LucideIcon } from "lucide-react-native"
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from "react-native"

import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { fonts, radius, TOUCH_TARGET } from "@/lib/theme"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
export type ButtonSize = "sm" | "md" | "lg"

export interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  isLoading?: boolean
  isBlock?: boolean
}

const HEIGHTS: Record<ButtonSize, number> = { sm: 36, md: TOUCH_TARGET, lg: 52 }

export function Button({
  label,
  variant = "primary",
  size = "md",
  icon: Icon,
  isLoading = false,
  isBlock = false,
  disabled,
  style,
  ...props
}: ButtonProps): React.JSX.Element {
  const palette = usePalette()
  const isDisabled = Boolean(disabled) || isLoading

  const colors = {
    primary: { background: palette.brand, border: palette.brand, text: palette.onBrand },
    secondary: { background: palette.surfaceRaised, border: palette.lineStrong, text: palette.ink },
    ghost: { background: "transparent", border: "transparent", text: palette.ink },
    danger: { background: palette.danger, border: palette.danger, text: palette.onDanger },
  }[variant]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        {
          height: HEIGHTS[size],
          paddingHorizontal: size === "sm" ? 14 : 20,
          backgroundColor: colors.background,
          borderColor: colors.border,
          opacity: isDisabled && !isLoading ? 0.5 : state.pressed ? 0.85 : 1,
          alignSelf: isBlock ? "stretch" : "flex-start",
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={colors.text} />
        ) : Icon ? (
          <Icon size={18} color={colors.text} />
        ) : null}
        <AppText
          style={[
            styles.label,
            { color: colors.text, fontSize: size === "lg" ? 16 : size === "sm" ? 14 : 15 },
          ]}
          numberOfLines={1}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontFamily: fonts.sansSemibold },
})
