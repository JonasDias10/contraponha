"use client"

import { POST_SOURCES_MAX } from "@contraponha/config"
import { BookText, Plus, X } from "lucide-react"
import { useFieldArray, type FieldErrors, type UseFormRegister } from "react-hook-form"

import type { ComposerControl, ComposerValues } from "@/components/composer/composer-schema"
import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/field"

export interface SourcesFieldProps {
  control: ComposerControl
  register: UseFormRegister<ComposerValues>
  errors: FieldErrors<ComposerValues>
}

export function SourcesField({ control, register, errors }: SourcesFieldProps): React.JSX.Element {
  const { t } = useI18n()
  const { fields, append, remove } = useFieldArray({ control, name: "sources" })

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm font-semibold">{t("web.composer.sources")}</legend>
      {fields.map((field, index) => {
        const error = errors.sources?.[index]?.url

        return (
          <div
            key={field.id}
            className="flex flex-col gap-2 rounded-[12px] border border-line bg-surface p-3"
          >
            <div className="flex items-center gap-2">
              <BookText aria-hidden className="size-5 flex-none text-muted" />
              <label className="flex-1">
                <span className="sr-only">{t("web.composer.sourceUrl")}</span>
                <Input
                  type="url"
                  placeholder="https://"
                  aria-invalid={Boolean(error)}
                  {...register(`sources.${index}.url`)}
                />
              </label>
              <Button
                variant="ghost"
                size="iconSm"
                aria-label={t("web.composer.removeSource")}
                onClick={() => remove(index)}
              >
                <X aria-hidden className="size-4" />
              </Button>
            </div>
            <label>
              <span className="sr-only">
                {t("web.composer.sourceTitle", { optional: t("web.common.optional") })}
              </span>
              <Input
                placeholder={t("web.composer.sourceTitle", { optional: t("web.common.optional") })}
                {...register(`sources.${index}.title`)}
              />
            </label>
            {error ? (
              <p role="alert" className="text-[13px] text-danger">
                {t("web.validation.url")}
              </p>
            ) : null}
          </div>
        )
      })}
      {fields.length < POST_SOURCES_MAX ? (
        <Button
          variant="secondary"
          className="w-full sm:w-auto sm:self-start"
          onClick={() => append({ url: "", title: "" })}
        >
          <Plus aria-hidden className="size-4" />
          {fields.length === 0 ? t("web.composer.addSource") : t("web.composer.addAnotherSource")}
        </Button>
      ) : null}
    </fieldset>
  )
}
