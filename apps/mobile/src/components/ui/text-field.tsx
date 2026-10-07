import { CircleAlert, Eye, EyeOff } from "lucide-react-native"
import { useState } from "react"
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native"

import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { fonts, radius, TOUCH_TARGET } from "@/lib/theme"

export interface TextFieldProps extends TextInputProps {
  label?: string
  hint?: string
  error?: string
  prefix?: string
  isPassword?: boolean
  isSerif?: boolean
}

export function TextField({
  label,
  hint,
  error,
  prefix,
  isPassword = false,
  isSerif = false,
  multiline,
  style,
  ...props
}: TextFieldProps): React.JSX.Element {
  const palette = usePalette()
  const { t } = useI18n()
  const [isFocused, setIsFocused] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const borderColor = error ? palette.danger : isFocused ? palette.brand : palette.lineStrong

  return (
    <View style={styles.wrapper}>
      {label ? <AppText variant="smallStrong">{label}</AppText> : null}
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          {
            borderColor,
            borderWidth: error ? 2 : 1,
            backgroundColor: palette.surfaceRaised,
          },
        ]}
      >
        {prefix ? <AppText tone="subtle">{prefix}</AppText> : null}
        <TextInput
          placeholderTextColor={palette.subtle}
          selectionColor={palette.brand}
          secureTextEntry={isPassword && !isRevealed}
          multiline={multiline}
          aria-label={label}
          aria-invalid={Boolean(error)}
          onFocus={(event) => {
            setIsFocused(true)

            props.onFocus?.(event)
          }}
          onBlur={(event) => {
            setIsFocused(false)

            props.onBlur?.(event)
          }}
          style={[
            styles.input,
            {
              color: palette.ink,
              fontFamily: isSerif ? fonts.serif : fonts.sans,
              textAlignVertical: multiline ? "top" : "center",
            },
            style,
          ]}
          {...props}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isRevealed ? t("web.auth.hidePassword") : t("web.auth.showPassword")
            }
            hitSlop={8}
            onPress={() => setIsRevealed((value) => !value)}
          >
            {isRevealed ? (
              <EyeOff size={20} color={palette.muted} />
            ) : (
              <Eye size={20} color={palette.muted} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.message} accessibilityLiveRegion="polite">
          <CircleAlert size={16} color={palette.danger} />
          <AppText variant="caption" tone="danger" style={styles.messageText}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" tone="subtle">
          {hint}
        </AppText>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  field: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  multiline: { alignItems: "flex-start", paddingVertical: 12, minHeight: 112 },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  message: { flexDirection: "row", alignItems: "center", gap: 6 },
  messageText: { flex: 1 },
})
