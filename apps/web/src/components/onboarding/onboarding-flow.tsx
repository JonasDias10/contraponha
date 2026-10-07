"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { recognitionText } from "@contraponha/client-core"
import { ONBOARDING_TOTAL_STEPS, useOnboardingFlow } from "@contraponha/client-core/react"

import { Logo } from "@/components/brand/logo"
import { FollowButton } from "@/components/profile/follow-button"
import { useI18n } from "@/components/providers/i18n-provider"
import { InterestsPicker } from "@/components/topics/interests-picker"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/surfaces"
import { cn } from "@/lib/cn"

export function OnboardingFlow(): React.JSX.Element {
  const { t } = useI18n()
  const router = useRouter()

  const flow = useOnboardingFlow({
    onFinished: () => {
      router.push("/home")

      router.refresh()
    },
  })

  const { step } = flow

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center gap-4 border-b border-line px-4 sm:px-8">
        <Logo href="/home" />
        <span className="flex-1 text-center text-sm font-semibold">
          {t("web.onboarding.stepOf", { step, total: ONBOARDING_TOTAL_STEPS })}
        </span>
        <Button variant="ghost" isLoading={flow.isFinishing} onClick={flow.finish}>
          {t("web.onboarding.skip")}
        </Button>
      </header>
      <div aria-hidden className="flex">
        {[1, 2].map((index) => (
          <span key={index} className={cn("h-1 flex-1", index <= step ? "bg-brand" : "bg-line")} />
        ))}
      </div>
      <main
        id="content"
        className="mx-auto flex w-full max-w-240 flex-1 flex-col gap-12 px-4 py-14 sm:px-8"
      >
        {step === 1 ? (
          <section className="flex flex-col gap-6">
            <div className="flex max-w-160 flex-col gap-2">
              <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
                {t("web.onboarding.stepOf", { step: 1, total: ONBOARDING_TOTAL_STEPS })}
              </p>
              <h1 className="font-serif text-[34px] leading-tight font-semibold">
                {t("web.onboarding.interestsTitle")}
              </h1>
              <p className="font-serif text-lg text-muted">{t("web.onboarding.interestsLead")}</p>
            </div>
            <InterestsPicker topics={flow.topics} selected={flow.selected} onToggle={flow.toggle} />
          </section>
        ) : (
          <section className="flex flex-col gap-6">
            <div className="flex max-w-160 flex-col gap-2">
              <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
                {t("web.onboarding.stepOf", { step: 2, total: ONBOARDING_TOTAL_STEPS })}
              </p>
              <h1 className="font-serif text-[34px] leading-tight font-semibold">
                {t("web.onboarding.peopleTitle")}
              </h1>
              <p className="text-muted">{t("web.onboarding.peopleLead")}</p>
            </div>
            {flow.suggestions.length === 0 ? (
              <p className="text-muted">{t("web.onboarding.peopleEmpty")}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                {flow.suggestions.map(({ profile, recognition }) => (
                  <Card key={profile.id} className="flex flex-col gap-3 p-5">
                    <div className="flex items-center gap-3">
                      <Avatar id={profile.id} name={profile.displayName} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-semibold">{profile.displayName}</span>
                        <span className="text-[13px] text-subtle">@{profile.handle}</span>
                      </div>
                    </div>
                    {profile.bio ? <p className="text-sm text-muted">{profile.bio}</p> : null}
                    {recognition ? (
                      <p className="text-[13px] text-subtle">
                        {recognitionText({ recognition, t })}
                      </p>
                    ) : null}
                    <FollowButton handle={profile.handle} initialIsFollowing={false} size="sm" />
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-240 items-center gap-4 p-4 sm:px-8">
          {step === 2 ? (
            <Button variant="ghost" onClick={flow.goBack}>
              <ArrowLeft aria-hidden className="size-5" />
              {t("web.common.back")}
            </Button>
          ) : null}
          <span className="flex-1" />
          {step === 1 ? (
            <>
              <span className="text-sm text-muted">
                {t("web.onboarding.selected", { count: flow.selected.size })}
              </span>
              <Button
                size="lg"
                disabled={!flow.canContinue}
                isLoading={flow.isSaving}
                onClick={flow.saveInterests}
              >
                {t("web.common.continue")}
                <ArrowRight aria-hidden className="size-5" />
              </Button>
            </>
          ) : (
            <Button size="lg" isLoading={flow.isFinishing} onClick={flow.finish}>
              {t("web.onboarding.finish")}
              <ArrowRight aria-hidden className="size-5" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
