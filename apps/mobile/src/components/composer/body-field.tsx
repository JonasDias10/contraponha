import { Bold, Italic, Link2, List, Quote, type LucideIcon } from "lucide-react-native"
import { useState } from "react"
import { StyleSheet, TextInput, View } from "react-native"

import { Markdown } from "@/components/post/markdown"
import { BottomSheet } from "@/components/ui/action-sheet"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { AppText } from "@/components/ui/text"
import { TextField } from "@/components/ui/text-field"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { applyMarkdownFormat, type MarkdownFormat, type TextSelection } from "@/lib/markdown-format"
import { fonts, radius, space } from "@/lib/theme"

export interface BodyFieldProps {
  value: string
  onChange: (value: string) => void
  isPreviewing: boolean
  isInvalid: boolean
  extraTools?: React.ReactNode
}

interface ApplyParams {
  format: MarkdownFormat
  url?: string
}

interface Tool {
  format: MarkdownFormat
  icon: LucideIcon
  label: "bold" | "italic" | "list" | "quote" | "link"
}

const TOOLS: Tool[] = [
  { format: "bold", icon: Bold, label: "bold" },
  { format: "italic", icon: Italic, label: "italic" },
  { format: "list", icon: List, label: "list" },
  { format: "quote", icon: Quote, label: "quote" },
  { format: "link", icon: Link2, label: "link" },
]

// People write Markdown; the toolbar formats the selection and the preview shows the result.
export function BodyField({
  value,
  onChange,
  isPreviewing,
  isInvalid,
  extraTools,
}: BodyFieldProps): React.JSX.Element {
  const { t } = useI18n()
  const palette = usePalette()

  const [selection, setSelection] = useState<TextSelection>({
    start: value.length,
    end: value.length,
  })

  const [isLinkOpen, setIsLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")

  const apply = ({ format, url }: ApplyParams): void => {
    const result = applyMarkdownFormat({ text: value, selection, format, url })

    onChange(result.text)

    setSelection(result.selection)
  }

  const handleTool = (format: MarkdownFormat): void => {
    if (format === "link") {
      setLinkUrl("")

      setIsLinkOpen(true)

      return
    }

    apply({ format })
  }

  const applyLink = (): void => {
    const trimmed = linkUrl.trim()

    setIsLinkOpen(false)

    if (!trimmed) return

    apply({ format: "link", url: /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}` })
  }

  if (isPreviewing) {
    return (
      <View style={styles.preview}>
        {value.trim() ? (
          <Markdown text={value} fontSize={18} />
        ) : (
          <AppText variant="reading" tone="subtle">
            {t("web.composer.bodyPlaceholder")}
          </AppText>
        )}
      </View>
    )
  }

  return (
    <View style={styles.wrapper}>
      <View
        accessibilityRole="toolbar"
        accessibilityLabel={t("web.composer.toolbar")}
        style={[styles.toolbar, { borderColor: palette.line }]}
      >
        {TOOLS.map(({ format, icon, label }) => (
          <IconButton
            key={format}
            icon={icon}
            size={19}
            label={t(`web.composer.${label}`)}
            onPress={() => handleTool(format)}
          />
        ))}
        {extraTools}
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        selection={selection}
        onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
        placeholder={t("web.composer.bodyPlaceholder")}
        placeholderTextColor={palette.subtle}
        selectionColor={palette.brand}
        aria-label={t("web.composer.bodyPlaceholder")}
        aria-invalid={isInvalid}
        multiline
        scrollEnabled={false}
        style={[styles.input, { color: palette.ink }]}
      />
      <BottomSheet
        isOpen={isLinkOpen}
        title={t("web.composer.link")}
        onClose={() => setIsLinkOpen(false)}
      >
        <View style={styles.linkSheet}>
          <TextField
            label={t("web.composer.linkUrl")}
            placeholder="https://"
            value={linkUrl}
            onChangeText={setLinkUrl}
            autoCapitalize="none"
            keyboardType="url"
            autoFocus
            onSubmitEditing={applyLink}
          />
          <Button label={t("web.composer.applyLink")} onPress={applyLink} />
        </View>
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: space.md },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md + 2,
    padding: 2,
  },
  input: {
    minHeight: 200,
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 29,
    textAlignVertical: "top",
    padding: 0,
  },
  preview: { minHeight: 200 },
  linkSheet: { gap: space.lg, paddingHorizontal: space.md, paddingBottom: space.lg },
})
