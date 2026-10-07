import { CircleCheck, History, Lightbulb, ShieldCheck, Star, Sunrise, X } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Logo } from "@/components/brand/logo"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/surfaces"
import { getRequestTranslator } from "@/lib/i18n"
import { getViewer } from "@/lib/viewer"

export default async function LandingPage(): Promise<React.JSX.Element> {
  const viewer = await getViewer()

  if (viewer) redirect("/home")

  const { t } = await getRequestTranslator()

  const principles = [
    {
      Icon: CircleCheck,
      title: t("web.landing.reactionsTitle"),
      body: t("web.landing.reactionsBody"),
    },
    { Icon: Sunrise, title: t("web.landing.endingTitle"), body: t("web.landing.endingBody") },
    { Icon: History, title: t("web.landing.openTitle"), body: t("web.landing.openBody") },
  ]

  const refusals = [
    t("web.landing.notSellData"),
    t("web.landing.notPopularity"),
    t("web.landing.notPull"),
    t("web.landing.notSilentRemoval"),
  ]

  return (
    <>
      <section className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-16 px-4 py-16 sm:px-8 md:py-24">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-6">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            {t("web.landing.overline")}
          </p>
          <h1 className="font-serif text-5xl font-semibold leading-[1.08] tracking-[-0.02em] md:text-[64px]">
            {t("web.landing.title")}
          </h1>
          <p className="max-w-[560px] font-serif text-xl leading-relaxed text-muted">
            {t("web.landing.lead")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">{t("web.landing.createAccount")}</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/home">{t("web.landing.readWithoutAccount")}</Link>
            </Button>
          </div>
          <p className="text-[13px] text-subtle">{t("web.landing.dataNote")}</p>
        </div>
        <div aria-hidden className="flex min-w-0 max-w-[560px] flex-[1_1_440px] flex-col gap-3">
          <Card className="flex flex-col gap-3.5 p-5 shadow-e2">
            <div className="flex items-center gap-3">
              <Avatar id="sample-author" name={t("web.landing.sampleAuthor")} />
              <div className="flex flex-col">
                <span className="font-semibold">{t("web.landing.sampleAuthor")}</span>
                <span className="text-[13px] text-subtle">
                  {t("web.landing.sampleHeadline")} · {t("web.landing.sampleTime")}
                </span>
              </div>
            </div>
            <p className="font-serif text-[21px] font-semibold leading-snug">
              {t("web.landing.sampleTitle")}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-soft px-3.5 text-sm font-semibold text-brand">
                <CircleCheck className="size-[18px]" />
                {t("web.reactions.good_argument")} <span>128</span>
              </span>
              <span className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-3.5 text-sm font-medium">
                <Lightbulb className="size-[18px] text-muted" />
                {t("web.reactions.insightful")} <span className="text-subtle">64</span>
              </span>
            </div>
          </Card>
          <div className="ml-8 flex flex-col gap-2 rounded-[12px] bg-accent-soft px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-accent">
              <Star className="size-4" />
              {t("web.landing.sampleHighlightLabel")}
            </p>
            <p className="text-[13px] text-subtle">
              <span className="font-semibold text-ink">
                {t("web.landing.sampleHighlightAuthor")}
              </span>{" "}
              · {t("web.landing.sampleHighlightPlace")}
            </p>
            <p className="font-serif text-base leading-relaxed">
              {t("web.landing.sampleHighlightBody")}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-surface-sunken py-24">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 sm:px-8">
          <div className="flex max-w-[640px] flex-col gap-3">
            <h2 className="font-serif text-[40px] font-semibold leading-tight">
              {t("web.landing.principlesTitle")}
            </h2>
            <p className="font-serif text-lg text-muted">{t("web.landing.principlesLead")}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {principles.map(({ Icon, title, body }) => (
              <Card key={title} className="flex flex-col gap-3 p-7">
                <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-muted">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[1200px] flex-wrap gap-16 px-4 py-24 sm:px-8">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
          <h2 className="font-serif text-[34px] font-semibold">{t("web.landing.notTitle")}</h2>
          <ul className="mt-2 flex flex-col gap-4">
            {refusals.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <X aria-hidden className="mt-1 size-5 flex-none text-muted" />
                <span className="font-serif text-[17px]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <Card className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 p-8">
          <ShieldCheck aria-hidden className="size-8 text-brand" />
          <h3 className="font-serif text-[25px] font-semibold">{t("web.landing.dataTitle")}</h3>
          <p className="text-muted">{t("web.landing.dataBody")}</p>
          <Link href="/privacy" className="font-semibold text-brand underline underline-offset-2">
            {t("web.landing.dataLink")}
          </Link>
        </Card>
      </section>

      <section className="border-t border-line py-24">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-5 px-4 text-center sm:px-8">
          <Logo className="text-[56px]" />
          <p className="font-serif text-xl text-muted">{t("web.landing.finalLead")}</p>
          <Button asChild size="lg">
            <Link href="/signup">{t("web.landing.createAccount")}</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
