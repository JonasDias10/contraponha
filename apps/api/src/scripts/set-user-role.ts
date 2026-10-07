import { parseArgs } from "node:util"

import { createDatabaseConnection, moderationActions, users } from "@contraponha/database"
import { UserRole } from "@contraponha/types"
import { eq } from "drizzle-orm"
import { z } from "zod"

// Bootstraps the first admin (and fixes roles out of band). Recorded in the moderation
// audit trail with no moderator, since it runs outside the API.
const { values } = parseArgs({
  options: { handle: { type: "string" }, role: { type: "string" } },
})

const input = z
  .object({ handle: z.string().min(3), role: z.enum(UserRole) })
  .parse({ handle: values.handle, role: values.role })

const databaseUrl = z.url().parse(process.env.DATABASE_URL)
const connection = createDatabaseConnection({ url: databaseUrl, maxConnections: 1 })

try {
  await connection.db.transaction(async (tx) => {
    const [user] = await tx
      .update(users)
      .set({ role: input.role })
      .where(eq(users.handle, input.handle.toLowerCase()))
      .returning({ id: users.id })

    if (!user) throw new Error(`No user with handle "${input.handle}"`)

    await tx.insert(moderationActions).values({
      type: "role_changed",
      targetUserId: user.id,
      note: `Set to ${input.role} from the command line`,
    })
  })

  process.stdout.write(`@${input.handle} is now ${input.role}\n`)
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)

  process.exitCode = 1
} finally {
  await connection.close()
}
