"use client"

import type { PrivateProfile } from "@ponto/types"
import { useQuery } from "@tanstack/react-query"
import { createContext, useContext } from "react"

import { useApi } from "@/components/providers/app-providers"
import { queryKeys } from "@/lib/query-keys"

const ViewerSeedContext = createContext<PrivateProfile | null>(null)

interface ViewerProviderProps {
  viewer: PrivateProfile | null
  children: React.ReactNode
}

// The server already knows who is signed in; this seeds the "me" query with it.
export function ViewerProvider({ viewer, children }: ViewerProviderProps): React.JSX.Element {
  return <ViewerSeedContext value={viewer}>{children}</ViewerSeedContext>
}

export function useViewer(): PrivateProfile | null {
  const seed = useContext(ViewerSeedContext)
  const api = useApi()

  const { data } = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.users.me(),
    initialData: seed ?? undefined,
    enabled: seed !== null,
  })

  return seed ? (data ?? seed) : null
}
