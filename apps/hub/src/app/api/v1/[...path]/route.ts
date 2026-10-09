import { createApiProxy } from "@contraponha/next-server"

import { getHubEnv } from "@/lib/env"

const forward = createApiProxy({ getApiUrl: () => getHubEnv().API_URL })

export { forward as DELETE, forward as GET, forward as PATCH, forward as POST, forward as PUT }
