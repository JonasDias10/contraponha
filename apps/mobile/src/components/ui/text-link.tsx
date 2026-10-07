import { router, type Href } from "expo-router"
import { StyleSheet } from "react-native"

import { AppText, type AppTextProps } from "@/components/ui/text"
import { fonts } from "@/lib/theme"

export interface TextLinkProps extends Omit<AppTextProps, "onPress"> {
  href?: Href
  isReplace?: boolean
  onPress?: () => void
}

export function TextLink({
  href,
  isReplace = false,
  onPress,
  style,
  ...props
}: TextLinkProps): React.JSX.Element {
  const navigate = (): void => {
    if (onPress) {
      onPress()

      return
    }

    if (!href) return

    if (isReplace) router.replace(href)
    else router.push(href)
  }

  return (
    <AppText
      accessibilityRole="link"
      tone="brand"
      onPress={navigate}
      style={[styles.link, style]}
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  link: { fontFamily: fonts.sansSemibold, textDecorationLine: "underline" },
})
