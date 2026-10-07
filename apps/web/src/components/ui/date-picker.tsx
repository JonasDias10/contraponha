"use client"

import * as PopoverPrimitive from "@radix-ui/react-popover"
import { CalendarDays } from "lucide-react"
import { useRef, useState } from "react"
import { DayPicker } from "react-day-picker"
import { enUS, es, ptBR } from "react-day-picker/locale"
import {
  dateFromIso,
  dateOrderFor,
  formatIsoDate,
  isoFromDate,
  maskDateInput,
  parseDateInput,
} from "@contraponha/client-core"

import { Input } from "@/components/ui/field"
import { useI18n } from "@/components/providers/i18n-provider"

const CALENDAR_LOCALES = { "pt-BR": ptBR, en: enUS, es }

const CALENDAR_CLASSES = {
  root: "relative p-3",
  month: "flex flex-col gap-2",
  month_caption: "flex h-9 items-center",
  dropdowns: "flex items-center gap-1",
  dropdown_root:
    "relative inline-flex h-9 items-center rounded-md px-2 hover:bg-surface-sunken has-focus-visible:outline-2 has-focus-visible:outline-brand",
  dropdown: "absolute inset-0 w-full cursor-pointer appearance-none opacity-0",
  caption_label: "inline-flex items-center gap-1 text-[15px] font-semibold text-ink capitalize",
  nav: "absolute top-3 right-3 flex gap-1",
  button_previous:
    "grid size-9 place-items-center rounded-md text-muted hover:bg-surface-sunken disabled:opacity-40",
  button_next:
    "grid size-9 place-items-center rounded-md text-muted hover:bg-surface-sunken disabled:opacity-40",
  chevron: "size-4 fill-current",
  month_grid: "border-collapse",
  weekday: "size-10 text-[12px] font-medium text-subtle uppercase",
  day: "group p-0 text-center",
  day_button:
    "grid size-10 place-items-center rounded-full text-[14px] text-ink transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-brand group-data-disabled:pointer-events-none group-data-disabled:opacity-40 group-data-selected:bg-brand group-data-selected:font-semibold group-data-selected:text-on-brand",
}

export interface DatePickerProps extends Omit<
  React.ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "type"
> {
  value: string
  onChange: (iso: string) => void
  startMonth: Date
  endMonth: Date
  defaultMonth: Date
}

// Typed date field with a calendar popover; value is an ISO date or "" when incomplete.
export function DatePicker({
  value,
  onChange,
  startMonth,
  endMonth,
  defaultMonth,
  ...inputProps
}: DatePickerProps): React.JSX.Element {
  const { locale, t } = useI18n()
  const order = dateOrderFor(locale)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState(() => formatIsoDate({ iso: value, order }))
  const [syncedValue, setSyncedValue] = useState(value)

  if (value !== syncedValue) {
    setSyncedValue(value)

    if (value !== parseDateInput({ text, order })) setText(formatIsoDate({ iso: value, order }))
  }

  const selected = dateFromIso(value)

  function handleTextChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const masked = maskDateInput(event.target.value)

    setText(masked)

    onChange(parseDateInput({ text: masked, order }))
  }

  function handleSelect(date: Date | undefined): void {
    if (!date) return

    const iso = isoFromDate(date)

    setText(formatIsoDate({ iso, order }))

    onChange(iso)

    setIsOpen(false)

    inputRef.current?.focus()
  }

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Anchor className="relative">
        <Input
          {...inputProps}
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder={t("web.common.datePlaceholder")}
          value={text}
          onChange={handleTextChange}
          className="pr-12 tabular-nums"
        />
        <PopoverPrimitive.Trigger
          type="button"
          aria-label={t("web.common.openCalendar")}
          title={t("web.common.openCalendar")}
          className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <CalendarDays aria-hidden className="size-5" />
        </PopoverPrimitive.Trigger>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={6}
          align="start"
          className="z-50 origin-(--radix-popover-content-transform-origin) rounded-[12px] border border-line bg-surface-raised shadow-e2 data-[state=closed]:animate-fade-out data-[state=open]:animate-pop-in"
        >
          <DayPicker
            mode="single"
            locale={CALENDAR_LOCALES[locale]}
            captionLayout="dropdown"
            reverseYears
            startMonth={startMonth}
            endMonth={endMonth}
            defaultMonth={selected ?? defaultMonth}
            disabled={{ after: endMonth }}
            selected={selected}
            onSelect={handleSelect}
            autoFocus
            classNames={CALENDAR_CLASSES}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
