export interface AuthHeadingProps {
  title: string
  lead?: React.ReactNode
}

export function AuthHeading({ title, lead }: AuthHeadingProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-serif text-[28px] leading-tight font-semibold sm:text-[34px]">{title}</h1>
      {lead ? <p className="text-muted">{lead}</p> : null}
    </div>
  )
}
