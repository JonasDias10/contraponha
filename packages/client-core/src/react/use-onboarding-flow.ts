"use client"

import type { SuggestedPeople, TopicView } from "@contraponha/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { errorMessage } from "../api-errors.js"
import { queryKeys } from "../query-keys.js"
import { useClient } from "./client-context.js"

export const ONBOARDING_MIN_INTERESTS = 3
export const ONBOARDING_TOTAL_STEPS = 2

export type OnboardingStep = 1 | 2

export interface UseOnboardingFlowParams {
  onFinished: () => void
}

export interface OnboardingFlow {
  step: OnboardingStep
  goBack: () => void
  topics: TopicView[]
  selected: Set<string>
  toggle: (slug: string) => void
  canContinue: boolean
  isSaving: boolean
  saveInterests: () => void
  suggestions: SuggestedPeople["people"]
  isFinishing: boolean
  finish: () => void
}

// Step 1 picks at least three interests; step 2 suggests people; skipping finishes at once.
export function useOnboardingFlow({ onFinished }: UseOnboardingFlowParams): OnboardingFlow {
  const { api, t, notify } = useClient()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<OnboardingStep>(1)
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

  const save = useMutation({
    mutationFn: () => api.topics.followMany({ slugs: [...selected] }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.suggestions })

      setStep(2)
    },
    onError: (error) => notify.error(errorMessage({ error, t })),
  })

  const complete = useMutation({
    mutationFn: () => api.users.completeOnboarding(),
    onSuccess: async (profile) => {
      queryClient.setQueryData(queryKeys.me, profile)

      await queryClient.invalidateQueries({ queryKey: queryKeys.feed.all })

      onFinished()
    },
    onError: (error) => notify.error(errorMessage({ error, t })),
  })

  const toggle = (slug: string): void => {
    setSelected((current) => {
      const next = new Set(current)

      if (next.has(slug)) next.delete(slug)
      else next.add(slug)

      return next
    })
  }

  return {
    step,
    goBack: () => setStep(1),
    topics: curated.data?.topics ?? [],
    selected,
    toggle,
    canContinue: selected.size >= ONBOARDING_MIN_INTERESTS,
    isSaving: save.isPending,
    saveInterests: () => save.mutate(),
    suggestions: suggestions.data?.people ?? [],
    isFinishing: complete.isPending,
    finish: () => complete.mutate(),
  }
}
