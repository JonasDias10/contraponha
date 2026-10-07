import { HIGHLIGHT_END, HIGHLIGHT_START } from "@ponto/types"

export interface HighlightedTextProps {
  text: string
}

// The API marks matches with control characters, never HTML; they become <mark> here.
export function HighlightedText({ text }: HighlightedTextProps): React.JSX.Element {
  const parts = text.split(HIGHLIGHT_START)

  return (
    <>
      {parts.map((part, index) => {
        const [match, rest = ""] = index === 0 ? ["", part] : part.split(HIGHLIGHT_END)

        return (
          <span key={`${index}-${part}`}>
            {match ? (
              <mark className="rounded-[3px] bg-brand-soft px-0.5 text-inherit">{match}</mark>
            ) : null}
            {rest}
          </span>
        )
      })}
    </>
  )
}
