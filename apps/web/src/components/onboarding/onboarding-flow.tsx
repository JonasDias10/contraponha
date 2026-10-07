"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Logo } from "@/components/brand/logo"
import { recognitionText } from "@/components/profile/recognition"
import { FollowButton } from "@/components/profile/follow-button"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { InterestsPicker } from "@/components/topics/interests-picker"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/surfaces"
import { errorMessage } from "@/lib/api-errors"
import { cn } from "@/lib/cn"
import { queryKeys } from "@/lib/query-keys"

const MIN_INTERESTS = 3
const TOTAL_STEPS = 2

export function OnboardingFlow(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [selected, setSelected] = useState(new Set<string>())

  const curated = useQuery({
    queryKey: queryKeys.topics.curated,
    queryFn: () => api.topics.listCurated(),
  })

  const suggestions = useQuery({
    queryKey: queryKeys.suggestions,
    queryFn: () => api.users.suggestions(),
    enabled: step === 2,
  })

  const saveInterests = useMutation({
    mutationFn: () => api.topics.followMany({ slugs: [...selected] }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.suggestions })

      setStep(2)
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  const finish = useMutation({
    mutationFn: () => api.users.completeOnboarding(),
    onSuccess: async (profile) => {
      queryClient.setQueryData(queryKeys.me, profile)

      await queryClient.invalidateQueries({ queryKey: queryKeys.feed.all })

      router.push("/home")

      router.refresh()
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  const toggle = (slug: string): void => {
    setSelected((current) => {
      const next = new Set(current)

      if (next.has(slug)) next.delete(slug)
      else next.add(slug)

      return next
    })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center gap-4 border-b border-line px-4 sm:px-8">
        <Logo href="/home" />
        <span className="flex-1 text-center text-sm font-semibold">
          {t("web.onboarding.stepOf", { step, total: TOTAL_STEPS })}
        </span>
        <Button variant="ghost" isLoading={finish.isPending} onClick={() => finish.mutate()}>
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
                {t("web.onboarding.stepOf", { step: 1, total: TOTAL_STEPS })}
              </p>
              <h1 className="font-serif text-[34px] leading-tight font-semibold">
                {t("web.onboarding.interestsTitle")}
              </h1>
              <p className="font-serif text-lg text-muted">{t("web.onboarding.interestsLead")}</p>
            </div>
            <InterestsPicker
              topics={curated.data?.topics ?? []}
              selected={selected}
              onToggle={toggle}
            />
          </section>
        ) : (
          <section className="flex flex-col gap-6">
            <div className="flex max-w-160 flex-col gap-2">
              <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
                {t("web.onboarding.stepOf", { step: 2, total: TOTAL_STEPS })}
              </p>
              <h1 className="font-serif text-[34px] leading-tight font-semibold">
                {t("web.onboarding.peopleTitle")}
              </h1>
              <p className="text-muted">{t("web.onboarding.peopleLead")}</p>
            </div>
            {(suggestions.data?.people.length ?? 0) === 0 ? (
              <p className="text-muted">{t("web.onboarding.peopleEmpty")}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
                {suggestions.data?.people.map(({ profile, recognition }) => (
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
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft aria-hidden className="size-5" />
              {t("web.common.back")}
            </Button>
          ) : null}
          <span className="flex-1" />
          {step === 1 ? (
            <>
              <span className="text-sm text-muted">
                {t("web.onboarding.selected", { count: selected.size })}
              </span>
              <Button
                size="lg"
                disabled={selected.size < MIN_INTERESTS}
                isLoading={saveInterests.isPending}
                onClick={() => saveInterests.mutate()}
              >
                {t("web.common.continue")}
                <ArrowRight aria-hidden className="size-5" />
              </Button>
            </>
          ) : (
            <Button size="lg" isLoading={finish.isPending} onClick={() => finish.mutate()}>
              {t("web.onboarding.finish")}
              <ArrowRight aria-hidden className="size-5" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
