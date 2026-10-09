import { createApiProxy } from "@contraponha/next-server"

import { getWebEnv } from "@/lib/env"

const forward = createApiProxy({ getApiUrl: () => getWebEnv().API_URL })

export { forward as DELETE, forward as GET, forward as PATCH, forward as POST, forward as PUT }
