interface ApiStatusBadgeProps {
  isReady: boolean
  label: string
}

export function ApiStatusBadge({ isReady, label }: ApiStatusBadgeProps): React.JSX.Element {
  return (
    <p
      role="status"
      className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm text-muted"
    >
      <span
        aria-hidden
        className={`size-2 rounded-full ${isReady ? "bg-emerald-500" : "bg-rose-500"}`}
      />
      {label}
    </p>
  )
}
