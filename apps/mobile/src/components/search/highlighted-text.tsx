import { HIGHLIGHT_END, HIGHLIGHT_START } from "@contraponha/types"
import { Text } from "react-native"

import { usePalette } from "@/hooks/use-palette"

export interface HighlightedTextProps {
  text: string
}

// The API marks matches with control characters, never HTML.
export function HighlightedText({ text }: HighlightedTextProps): React.JSX.Element {
  const palette = usePalette()
  const parts = text.split(HIGHLIGHT_START)

  return (
    <>
      {parts.map((part, index) => {
        const [match, rest = ""] = index === 0 ? ["", part] : part.split(HIGHLIGHT_END)

        return (
          <Text key={`${index}-${part}`}>
            {match ? <Text style={{ backgroundColor: palette.brandSoft }}>{match}</Text> : null}
            {rest}
          </Text>
        )
      })}
    </>
  )
}
