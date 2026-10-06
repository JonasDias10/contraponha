import { Children } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

const ANCHOR_PATTERN = /\s*\{#([a-z0-9_-]+)\}\s*$/

// "## Ataques pessoais {#personal_attack}" renders a heading with that id, so moderation
// notices can link straight to the rule they applied.
interface AnchoredHeading {
  text: React.ReactNode
  id: string | undefined
}

function splitAnchor(children: React.ReactNode): AnchoredHeading {
  const parts = Children.toArray(children)
  const last = parts.at(-1)

  if (typeof last !== "string") return { text: children, id: undefined }

  const match = ANCHOR_PATTERN.exec(last)

  if (!match) return { text: children, id: undefined }

  return { text: [...parts.slice(0, -1), last.replace(ANCHOR_PATTERN, "")], id: match[1] }
}

const REMARK_PLUGINS = [remarkGfm]

const COMPONENTS: Components = {
  h2: ({ children }) => {
    const { text, id } = splitAnchor(children)

    return (
      <h2 id={id} className="scroll-mt-6">
        {text}
      </h2>
    )
  },
  h3: ({ children }) => {
    const { text, id } = splitAnchor(children)

    return (
      <h3 id={id} className="scroll-mt-6">
        {text}
      </h3>
    )
  },
  a: ({ href, children }) => <a href={href}>{children}</a>,
}

export interface LegalDocumentProps {
  markdown: string
}

export function LegalDocument({ markdown }: LegalDocumentProps): React.JSX.Element {
  return (
    <div className="prose-read text-[17px] leading-[1.7] [&_h1]:font-serif [&_h1]:text-[40px] [&_h1]:font-semibold [&_h1]:leading-tight [&_table]:w-full [&_table]:border-collapse [&_table]:font-sans [&_table]:text-sm [&_td]:border [&_td]:border-line [&_td]:p-2 [&_th]:border [&_th]:border-line [&_th]:bg-surface-sunken [&_th]:p-2 [&_th]:text-left">
      <ReactMarkdown components={COMPONENTS} remarkPlugins={REMARK_PLUGINS}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
