"use client"

import * as Popover from "@radix-ui/react-popover"
import type { ProfileView } from "@contraponha/types"
import { useQuery } from "@tanstack/react-query"
import {
  CalendarDays,
  CircleCheck,
  Link2,
  LogOut,
  MapPin,
  MoreHorizontal,
  SlidersHorizontal,
} from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { formatCount, formatMonthYear, queryKeys, recognitionText } from "@contraponha/client-core"

import { signOut } from "@/actions/auth"
import { FollowButton } from "@/components/profile/follow-button"
import { ProfileActionsMenu } from "@/components/profile/profile-actions-menu"
import {
  Avatar,
  Banner,
  Button,
  Chip,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Panel,
  useApi,
  useI18n,
  useViewer,
  VerifiedBadge,
} from "@contraponha/web-ui"
import { paths } from "@/lib/paths"

export interface ProfileHeaderProps {
  handle: string
}

export function ProfileHeader({ handle }: ProfileHeaderProps): React.JSX.Element | null {
  const api = useApi()

  const { data: profile } = useQuery({
    queryKey: queryKeys.profile(handle),
    queryFn: () => api.users.getByHandle(handle),
  })

  if (!profile) return null

  return <ProfileHeaderContent profile={profile} />
}

interface ProfileStat {
  value: number
  label: string
  href?: Route
}

interface ProfileHeaderContentProps {
  profile: ProfileView
}

function ProfileHeaderContent({ profile }: ProfileHeaderContentProps): React.JSX.Element {
  const { t, locale } = useI18n()
  const api = useApi()
  const viewer = useViewer()
  const isSelf = viewer?.id === profile.id
  const isBlocked = Boolean(profile.viewer?.isBlocking || profile.viewer?.isBlockedBy)

  const followedBy = useQuery({
    queryKey: queryKeys.followedBy(profile.handle),
    queryFn: () => api.users.followedBy(profile.handle),
    enabled: viewer !== null && !isSelf,
  })

  const stats: ProfileStat[] = [
    { value: profile.postCount, label: t("web.profile.statPosts", { count: profile.postCount }) },
    {
      value: profile.followerCount,
      label: t("web.profile.statFollowers", { count: profile.followerCount }),
      href: paths.followers(profile.handle),
    },
    {
      value: profile.followingCount,
      label: t("web.profile.statFollowing", { count: profile.followingCount }),
      href: paths.following(profile.handle),
    },
  ]

  const mutuals = followedBy.data?.people ?? []
  const mutualNames = mutuals.map(({ displayName }) => displayName.split(" ")[0]).join(", ")
  const others = (followedBy.data?.total ?? 0) - mutuals.length

  return (
    <section className="flex flex-col gap-5 pt-4">
      <div className="flex flex-wrap items-start gap-6">
        <Avatar id={profile.id} name={profile.displayName} src={profile.avatarUrl} size="xxl" />
        <div className="flex min-w-65 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="flex items-center gap-2 font-serif text-[34px] leading-tight font-semibold">
                {profile.displayName}
                <VerifiedBadge verification={profile.verification} className="size-6" />
              </h1>
              <p className="flex flex-wrap items-center gap-1.5 text-subtle">
                @{profile.handle}
                {profile.pronouns ? <span>· {profile.pronouns}</span> : null}
                {profile.viewer?.isFollowedBy ? <Chip>{t("web.profile.followsYou")}</Chip> : null}
                {profile.viewer?.isMuting ? <Chip>{t("web.relations.mutedChip")}</Chip> : null}
              </p>
            </div>
            <div className="flex gap-2">
              {isSelf ? (
                <>
                  <Button asChild variant="secondary">
                    <Link href="/settings">{t("web.profile.editProfile")}</Link>
                  </Button>
                  <Menu>
                    <MenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        aria-label={t("web.nav.accountMenu")}
                        className="lg:hidden"
                      >
                        <MoreHorizontal aria-hidden className="size-5" />
                      </Button>
                    </MenuTrigger>
                    <MenuContent>
                      <MenuItem asChild>
                        <Link href="/settings">
                          <SlidersHorizontal aria-hidden className="size-4" />
                          {t("web.nav.settings")}
                        </Link>
                      </MenuItem>
                      <MenuItem onSelect={() => void signOut()}>
                        <LogOut aria-hidden className="size-4" />
                        {t("web.nav.signOut")}
                      </MenuItem>
                    </MenuContent>
                  </Menu>
                </>
              ) : (
                <>
                  {viewer ? <ProfileActionsMenu profile={profile} /> : null}
                  {isBlocked ? null : (
                    <FollowButton
                      handle={profile.handle}
                      initialIsFollowing={profile.viewer?.isFollowing}
                    />
                  )}
                </>
              )}
            </div>
          </div>
          {profile.bio ? (
            <p className="mt-1 font-serif text-[17px] leading-relaxed">{profile.bio}</p>
          ) : null}
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {profile.headline ? <span>{profile.headline}</span> : null}
            {profile.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden className="size-4" />
                {profile.location}
              </span>
            ) : null}
            {profile.website ? (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer nofollow me"
                className="inline-flex items-center gap-1 text-brand"
              >
                <Link2 aria-hidden className="size-4" />
                {new URL(profile.website).hostname.replace(/^www\./, "")}
              </a>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <CalendarDays aria-hidden className="size-4" />
              {t("web.profile.joined", {
                date: formatMonthYear({ value: profile.createdAt, locale }),
              })}
            </span>
          </p>
          <p className="mt-1 flex flex-wrap gap-5 text-sm text-muted">
            {stats.map(({ value, label, href }) => {
              const content = (
                <>
                  <strong className="font-semibold text-ink">
                    {formatCount({ value, locale })}
                  </strong>{" "}
                  {label}
                </>
              )

              return href ? (
                <Link key={label} href={href} className="text-muted no-underline hover:underline">
                  {content}
                </Link>
              ) : (
                <span key={label}>{content}</span>
              )
            })}
          </p>
          {mutuals.length > 0 ? (
            <p className="flex items-center gap-2 text-[13px] text-subtle">
              <span className="flex">
                {mutuals.map((person, index) => (
                  <Avatar
                    key={person.id}
                    id={person.id}
                    name={person.displayName}
                    src={person.avatarUrl}
                    size="xs"
                    className={index > 0 ? "-ml-2 ring-2 ring-surface" : "ring-2 ring-surface"}
                  />
                ))}
              </span>
              {others > 0
                ? t("web.profile.followedByMore", { names: mutualNames, count: others })
                : t("web.profile.followedBy", { names: mutualNames })}
            </p>
          ) : null}
        </div>
      </div>
      {profile.recognition ? (
        <Panel className="flex items-center gap-3 px-4 py-3.5">
          <CircleCheck aria-hidden className="size-5 flex-none text-brand" />
          <p className="flex-1 text-sm">
            {recognitionText({ recognition: profile.recognition, t })}
          </p>
          <Popover.Root>
            <Popover.Trigger className="text-sm text-brand underline decoration-dotted underline-offset-2">
              {t("web.profile.whatIsThis")}
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                sideOffset={6}
                align="end"
                className="z-40 max-w-72 rounded-[12px] border border-line bg-surface-raised p-4 text-sm text-muted shadow-e2"
              >
                {t("web.profile.recognitionExplain")}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </Panel>
      ) : null}
      {profile.viewer?.isBlocking ? (
        <Banner tone="info">{t("web.relations.youBlocked")}</Banner>
      ) : null}
      {profile.viewer?.isBlockedBy ? (
        <Banner tone="info">{t("web.relations.blockedYou")}</Banner>
      ) : null}
    </section>
  )
}
