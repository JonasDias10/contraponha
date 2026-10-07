import { marked, type Token, type Tokens } from "marked"
import { useMemo } from "react"
import { StyleSheet, Text, View, type TextStyle } from "react-native"

import { usePalette } from "@/hooks/use-palette"
import { openExternalUrl } from "@/lib/open-url"
import { fonts, type Palette } from "@/lib/theme"

export interface MarkdownProps {
  text: string
  numberOfLines?: number
  isLinkDisabled?: boolean
  fontSize?: number
}

interface RenderContext {
  palette: Palette
  isLinkDisabled: boolean
  base: TextStyle
}

interface InlineParams {
  tokens: Token[]
  context: RenderContext
}

interface BlockParams {
  token: Token
  index: number
  context: RenderContext
}

function isTokenList(value: unknown): value is Token[] {
  return Array.isArray(value)
}

function childTokens(token: Token): Token[] {
  return "tokens" in token && isTokenList(token.tokens) ? token.tokens : []
}

function renderInline({ tokens, context }: InlineParams): React.ReactNode[] {
  return tokens.map((token, index) => {
    const key = `${token.type}-${index}`

    switch (token.type) {
      case "strong":
        return (
          <Text key={key} style={{ fontFamily: fonts.serifBold }}>
            {renderInline({ tokens: childTokens(token), context })}
          </Text>
        )
      case "em":
        return (
          <Text key={key} style={{ fontFamily: fonts.serifItalic }}>
            {renderInline({ tokens: childTokens(token), context })}
          </Text>
        )
      case "link": {
        const { href } = token as Tokens.Link

        return (
          <Text
            key={key}
            accessibilityRole={context.isLinkDisabled ? undefined : "link"}
            onPress={context.isLinkDisabled ? undefined : () => openExternalUrl(href)}
            style={{ color: context.palette.brand, textDecorationLine: "underline" }}
          >
            {renderInline({ tokens: childTokens(token), context })}
          </Text>
        )
      }
      case "codespan":
        return (
          <Text
            key={key}
            style={{ fontFamily: fonts.sans, backgroundColor: context.palette.surfaceSunken }}
          >
            {(token as Tokens.Codespan).text}
          </Text>
        )
      case "br":
        return "\n"
      case "text":
      case "escape": {
        const children = childTokens(token)

        return children.length > 0 ? (
          <Text key={key}>{renderInline({ tokens: children, context })}</Text>
        ) : (
          (token as Tokens.Text).text
        )
      }
      default:
        return "text" in token && typeof token.text === "string" ? token.text : token.raw
    }
  })
}

function listItemTokens(item: Tokens.ListItem): Token[] {
  return item.tokens.flatMap((token) =>
    token.type === "paragraph" || token.type === "text"
      ? childTokens(token).length > 0
        ? childTokens(token)
        : [token]
      : [token],
  )
}

function renderBlock({ token, index, context }: BlockParams): React.ReactNode {
  const key = `${token.type}-${index}`
  const { palette, base } = context

  switch (token.type) {
    case "space":
      return null
    case "paragraph":
      return (
        <Text key={key} style={base}>
          {renderInline({ tokens: childTokens(token), context })}
        </Text>
      )
    case "list": {
      const list = token as Tokens.List
      const start = typeof list.start === "number" ? list.start : 1

      return (
        <View key={key} style={styles.list}>
          {list.items.map((item, itemIndex) => (
            <View key={`${key}-${itemIndex}`} style={styles.listItem}>
              <Text style={[base, styles.bullet]}>
                {list.ordered ? `${start + itemIndex}.` : "•"}
              </Text>
              <Text style={[base, styles.listText]}>
                {renderInline({ tokens: listItemTokens(item), context })}
              </Text>
            </View>
          ))}
        </View>
      )
    }
    case "blockquote":
      return (
        <View key={key} style={[styles.quote, { borderLeftColor: palette.line }]}>
          {childTokens(token).map((child, childIndex) =>
            renderBlock({
              token: child,
              index: childIndex,
              context: { ...context, base: { ...base, color: palette.muted } },
            }),
          )}
        </View>
      )
    case "hr":
      return <View key={key} style={[styles.hr, { backgroundColor: palette.line }]} />
    default:
      // Headings, code blocks, tables and raw HTML are outside the allowed subset: plain text.
      return (
        <Text key={key} style={base}>
          {"text" in token && typeof token.text === "string" ? token.text : token.raw}
        </Text>
      )
  }
}

// Inside one Text, so a line limit (feed cards) cuts cleanly across paragraphs.
function renderFlattened({ tokens, context }: InlineParams): React.ReactNode[] {
  return tokens
    .filter((token) => token.type !== "space")
    .flatMap((token, index) => {
      const separator = index > 0 ? "\n\n" : ""

      if (token.type === "list") {
        const list = token as Tokens.List

        return [
          separator,
          ...list.items.map((item, itemIndex) => (
            <Text key={`li-${index}-${itemIndex}`}>
              {itemIndex > 0 ? "\n" : ""}
              {list.ordered ? `${itemIndex + 1}. ` : "• "}
              {renderInline({ tokens: listItemTokens(item), context })}
            </Text>
          )),
        ]
      }

      if (token.type === "blockquote")
        return [separator, ...renderFlattened({ tokens: childTokens(token), context })]

      const children = childTokens(token)

      return [
        separator,
        children.length > 0
          ? renderInline({ tokens: children, context })
          : "text" in token && typeof token.text === "string"
            ? token.text
            : "",
      ]
    })
}

// People write in a small Markdown subset; raw HTML is never rendered and only web and mail
// links open, mirroring the web renderer.
export function Markdown({
  text,
  numberOfLines,
  isLinkDisabled = false,
  fontSize = 17,
}: MarkdownProps): React.JSX.Element {
  const palette = usePalette()
  const tokens = useMemo(() => marked.lexer(text), [text])

  const context: RenderContext = {
    palette,
    isLinkDisabled,
    base: {
      fontFamily: fonts.serif,
      fontSize,
      lineHeight: Math.round(fontSize * 1.62),
      color: palette.ink,
    },
  }

  if (numberOfLines !== undefined) {
    return (
      <Text numberOfLines={numberOfLines} style={context.base}>
        {renderFlattened({ tokens, context })}
      </Text>
    )
  }

  return (
    <View style={styles.blocks}>
      {tokens.map((token, index) => renderBlock({ token, index, context }))}
    </View>
  )
}

const styles = StyleSheet.create({
  blocks: { gap: 14 },
  list: { gap: 6 },
  listItem: { flexDirection: "row", gap: 8 },
  bullet: { minWidth: 18 },
  listText: { flex: 1 },
  quote: { borderLeftWidth: 3, paddingLeft: 14, gap: 10 },
  hr: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
})
