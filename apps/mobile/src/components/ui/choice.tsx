import { Check } from "lucide-react-native"
import { Pressable, StyleSheet, Switch, View } from "react-native"

import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { space, TOUCH_TARGET } from "@/lib/theme"

export interface CheckboxProps {
  isChecked: boolean
  onChange: (isChecked: boolean) => void
  children: React.ReactNode
  isInvalid?: boolean
}

export function Checkbox({
  isChecked,
  onChange,
  children,
  isInvalid = false,
}: CheckboxProps): React.JSX.Element {
  const palette = usePalette()

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isChecked }}
      onPress={() => onChange(!isChecked)}
      style={styles.row}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: isInvalid
              ? palette.danger
              : isChecked
                ? palette.brand
                : palette.lineStrong,
            backgroundColor: isChecked ? palette.brand : palette.surfaceRaised,
          },
        ]}
      >
        {isChecked ? <Check size={16} color={palette.onBrand} strokeWidth={3} /> : null}
      </View>
      <View style={styles.label}>{children}</View>
    </Pressable>
  )
}

export interface RadioOption<TValue extends string> {
  value: TValue
  label: string
  description?: string
}

export interface RadioGroupProps<TValue extends string> {
  value: TValue | undefined
  options: RadioOption<TValue>[]
  onChange: (value: TValue) => void
}

export function RadioGroup<TValue extends string>({
  value,
  options,
  onChange,
}: RadioGroupProps<TValue>): React.JSX.Element {
  const palette = usePalette()

  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            onPress={() => onChange(option.value)}
            style={styles.row}
          >
            <View
              style={[
                styles.radio,
                { borderColor: isSelected ? palette.brand : palette.lineStrong },
              ]}
            >
              {isSelected ? (
                <View style={[styles.dot, { backgroundColor: palette.brand }]} />
              ) : null}
            </View>
            <View style={styles.label}>
              <AppText>{option.label}</AppText>
              {option.description ? (
                <AppText variant="caption" tone="subtle">
                  {option.description}
                </AppText>
              ) : null}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

export interface SwitchRowProps {
  label: string
  description?: string
  value: boolean
  onChange: (value: boolean) => void
  isDisabled?: boolean
}

export function SwitchRow({
  label,
  description,
  value,
  onChange,
  isDisabled = false,
}: SwitchRowProps): React.JSX.Element {
  const palette = usePalette()

  return (
    <View style={styles.switchRow}>
      <View style={styles.label}>
        <AppText>{label}</AppText>
        {description ? (
          <AppText variant="caption" tone="subtle">
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={isDisabled}
        onValueChange={onChange}
        trackColor={{ true: palette.brand, false: palette.lineStrong }}
        thumbColor="#ffffff"
        ios_backgroundColor={palette.lineStrong}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    minHeight: TOUCH_TARGET - 8,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  label: { flex: 1, gap: 2 },
  group: { gap: space.md },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: TOUCH_TARGET,
  },
})
