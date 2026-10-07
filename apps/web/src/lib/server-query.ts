import "server-only"

import { QueryClient } from "@tanstack/react-query"
import { cache } from "react"

// One QueryClient per request for prefetching in server components; its cache is sent to
// the browser through HydrationBoundary.
export const getServerQueryClient = cache(
  () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } }),
)
