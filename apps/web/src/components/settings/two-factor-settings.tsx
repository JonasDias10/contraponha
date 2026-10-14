"use client"

import { useTwoFactorSettings } from "@contraponha/client-core/react"
import type { TwoFactorSetup } from "@contraponha/types"
import { twoFactorCodeSchema } from "@contraponha/validation"
import { Button, Chip, Field, Input, Panel, useI18n } from "@contraponha/web-ui"
import { ShieldCheck } from "lucide-react"
import QRCode from "qrcode"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { SettingsSection } from "@/components/settings/settings-section"

type Pending = "disable" | "regenerate" | null

export function TwoFactorSettings(): React.JSX.Element {
  const { t } = useI18n()
  const twoFactor = useTwoFactorSettings()
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const status = twoFactor.status
  const setup = twoFactor.setup.data

  return (
    <SettingsSection
      title={t("web.twoFactor.title")}
      lead={t("web.twoFactor.lead")}
      icon={<ShieldCheck aria-hidden className="size-5 text-brand" />}
    >
      {recoveryCodes ? (
        <RecoveryCodesPanel codes={recoveryCodes} onDone={() => setRecoveryCodes(null)} />
      ) : status?.isEnabled ? (
        <div className="flex flex-col gap-4">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <Chip tone="success">{t("web.twoFactor.on")}</Chip>
            {t("web.twoFactor.codesLeft", { count: status.recoveryCodesLeft })}
          </p>
          {pending ? (
            <CodePrompt
              label={t("web.twoFactor.codeOrRecovery")}
              submitLabel={
                pending === "disable" ? t("web.twoFactor.disable") : t("web.twoFactor.regenerate")
              }
              isPending={twoFactor.disable.isPending || twoFactor.regenerate.isPending}
              onCancel={() => setPending(null)}
              onSubmit={(code) => {
                if (pending === "disable") {
                  twoFactor.disable.mutate({ code }, { onSuccess: () => setPending(null) })

                  return
                }

                twoFactor.regenerate.mutate(
                  { code },
                  {
                    onSuccess: ({ codes }) => {
                      setPending(null)

                      setRecoveryCodes(codes)
                    },
                  },
                )
              }}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPending("regenerate")}>
                {t("web.twoFactor.regenerate")}
              </Button>
              <Button variant="dangerOutline" size="sm" onClick={() => setPending("disable")}>
                {t("web.twoFactor.disable")}
              </Button>
            </div>
          )}
        </div>
      ) : setup ? (
        <SetupPanel
          setup={setup}
          isPending={twoFactor.enable.isPending}
          onConfirm={(code) =>
            twoFactor.enable.mutate({ code }, { onSuccess: ({ codes }) => setRecoveryCodes(codes) })
          }
        />
      ) : (
        <Button
          className="self-start"
          isLoading={twoFactor.setup.isPending}
          onClick={() => twoFactor.setup.mutate()}
        >
          {t("web.twoFactor.start")}
        </Button>
      )}
    </SettingsSection>
  )
}

interface SetupPanelProps {
  setup: TwoFactorSetup
  isPending: boolean
  onConfirm: (code: string) => void
}

function SetupPanel({ setup, isPending, onConfirm }: SetupPanelProps): React.JSX.Element {
  const { t } = useI18n()
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    void QRCode.toDataURL(setup.otpauthUrl, { margin: 1, width: 192 }).then(setQr)
  }, [setup.otpauthUrl])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">{t("web.twoFactor.scan")}</p>
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated data URL
        <img
          src={qr}
          alt={t("web.twoFactor.scan")}
          width={192}
          height={192}
          className="rounded-md bg-white p-2"
        />
      ) : null}
      <p className="text-sm text-muted">{t("web.twoFactor.manualKey")}</p>
      <Panel className="px-4 py-3 font-mono text-sm break-all select-all">{setup.secret}</Panel>
      <CodePrompt
        label={t("web.twoFactor.code")}
        submitLabel={t("web.twoFactor.confirm")}
        isPending={isPending}
        onSubmit={onConfirm}
      />
    </div>
  )
}

interface CodePromptProps {
  label: string
  submitLabel: string
  isPending: boolean
  onSubmit: (code: string) => void
  onCancel?: () => void
}

function CodePrompt({
  label,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: CodePromptProps): React.JSX.Element {
  const { t } = useI18n()
  const [code, setCode] = useState("")
  const isValid = twoFactorCodeSchema.safeParse(code).success

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()

        if (isValid) onSubmit(code)
      }}
    >
      <Field label={label}>
        {({ id }) => (
          <Input
            id={id}
            value={code}
            autoComplete="one-time-code"
            spellCheck={false}
            className="max-w-60"
            onChange={(event) => setCode(event.target.value)}
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={!isValid} isLoading={isPending}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t("web.common.cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  )
}

interface RecoveryCodesPanelProps {
  codes: string[]
  onDone: () => void
}

function RecoveryCodesPanel({ codes, onDone }: RecoveryCodesPanelProps): React.JSX.Element {
  const { t } = useI18n()
  const text = codes.join("\n")

  const download = (): void => {
    const url = URL.createObjectURL(new Blob([`${text}\n`], { type: "text/plain" }))
    const link = document.createElement("a")

    link.href = url

    link.download = "contraponha-recovery-codes.txt"

    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">{t("web.twoFactor.recoveryTitle")}</h3>
        <p className="text-sm text-muted">{t("web.twoFactor.recoveryLead")}</p>
      </div>
      <Panel className="grid grid-cols-2 gap-2 px-4 py-3 font-mono text-sm">
        {codes.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </Panel>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            void navigator.clipboard.writeText(text).then(() => toast(t("web.twoFactor.copied")))
          }
        >
          {t("web.twoFactor.copyCodes")}
        </Button>
        <Button variant="secondary" size="sm" onClick={download}>
          {t("web.twoFactor.downloadCodes")}
        </Button>
        <Button size="sm" onClick={onDone}>
          {t("web.twoFactor.savedCodes")}
        </Button>
      </div>
    </div>
  )
}
