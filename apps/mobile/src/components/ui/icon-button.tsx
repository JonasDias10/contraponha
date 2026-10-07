import type { LucideIcon } from "lucide-react-native"
import { Pressable, StyleSheet, type PressableProps } from "react-native"

import { usePalette } from "@/hooks/use-palette"
import { radius, TOUCH_TARGET } from "@/lib/theme"

export interface IconButtonProps extends Omit<PressableProps, "children"> {
  icon: LucideIcon
  label: string
  color?: string
  size?: number
  isActive?: boolean
}

export function IconButton({
  icon: Icon,
  label,
  color,
  size = 22,
  isActive = false,
  style,
  ...props
}: IconButtonProps): React.JSX.Element {
  const palette = usePalette()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      hitSlop={4}
      style={(state) => [
        styles.base,
        state.pressed && { backgroundColor: palette.surfaceSunken },
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      <Icon size={size} color={color ?? (isActive ? palette.brand : palette.muted)} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
})
