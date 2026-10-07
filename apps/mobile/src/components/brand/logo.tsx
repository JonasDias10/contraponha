import { StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Path } from "react-native-svg"

import { usePalette } from "@/hooks/use-palette"
import { fonts } from "@/lib/theme"

export interface LogoSymbolProps {
  height: number
}

export function LogoSymbol({ height }: LogoSymbolProps): React.JSX.Element {
  const palette = usePalette()

  return (
    <Svg width={(height * 98) / 64} height={height} viewBox="0 0 98 64">
      <Path fill={palette.brand} d="M42 0A42 32 0 0 0 42 64V54A23 22 0 0 1 42 10Z" />
      <Path fill={palette.accent} d="M98 0A42 32 0 0 0 98 64V54A23 22 0 0 1 98 10Z" />
      <Circle fill={palette.accent} cx={42} cy={32} r={7} />
    </Svg>
  )
}

export interface LogoProps {
  size?: number
}

export function Logo({ size = 24 }: LogoProps): React.JSX.Element {
  const palette = usePalette()

  return (
    <View accessibilityRole="header" accessibilityLabel="contraponha" style={styles.row}>
      <LogoSymbol height={size * 0.9} />
      <Text
        style={[
          styles.word,
          {
            color: palette.ink,
            fontSize: size,
            letterSpacing: -size * 0.03,
            marginLeft: size * 0.3,
          },
        ]}
      >
        contraponha
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  word: { fontFamily: fonts.serifBold, includeFontPadding: false },
})
