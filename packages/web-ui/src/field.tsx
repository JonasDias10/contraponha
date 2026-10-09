import { CircleAlert, CircleCheck } from "lucide-react"
import { useId } from "react"

import { cn } from "./cn.js"

export const inputClasses =
  "flex h-11 w-full items-center gap-2 rounded-md border border-line-strong bg-surface-raised px-3.5 text-[15px] text-ink placeholder:text-subtle focus-visible:border-brand aria-invalid:border-2 aria-invalid:border-danger disabled:opacity-60"

export const textareaClasses =
  "block min-h-28 w-full resize-y rounded-md border border-line-strong bg-surface-raised px-3.5 py-3 text-[15px] leading-normal text-ink placeholder:text-subtle focus-visible:border-brand aria-invalid:border-2 aria-invalid:border-danger"

export function Input({ className, ...props }: React.ComponentProps<"input">): React.JSX.Element {
  return <input className={cn(inputClasses, className)} {...props} />
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">): React.JSX.Element {
  return <textarea className={cn(textareaClasses, className)} {...props} />
}

interface FieldRenderProps {
  id: string
  describedBy: string | undefined
  isInvalid: boolean
}

export interface FieldProps {
  label: React.ReactNode
  hint?: React.ReactNode
  error?: string
  success?: string
  className?: string
  children: (props: FieldRenderProps) => React.ReactNode
}

// Label, control, hint and error wired together for screen readers.
export function Field({
  label,
  hint,
  error,
  success,
  className,
  children,
}: FieldProps): React.JSX.Element {
  const id = useId()
  const messageId = `${id}-message`
  const hasMessage = Boolean(error ?? success ?? hint)

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children({ id, describedBy: hasMessage ? messageId : undefined, isInvalid: Boolean(error) })}
      {error ? (
        <p
          id={messageId}
          className="flex items-center gap-1.5 text-[13px] text-danger"
          role="alert"
        >
          <CircleAlert aria-hidden className="size-4" />
          {error}
        </p>
      ) : success ? (
        <p id={messageId} className="flex items-center gap-1.5 text-[13px] text-success">
          <CircleCheck aria-hidden className="size-4" />
          {success}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-[13px] text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
