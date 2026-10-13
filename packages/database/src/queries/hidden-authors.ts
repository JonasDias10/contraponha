import { sql, type SQL, type SQLWrapper } from "drizzle-orm"

import { userBlocks, userMutes } from "../schema/user-relations.js"

export interface HiddenAuthorParams {
  column: SQLWrapper
  viewerId: string | undefined
}

// Condition for read models that list other people's content: true when the author is
// neither blocked (either way) nor muted by the viewer. Always true for anonymous viewers.
export function isVisibleAuthor({ column, viewerId }: HiddenAuthorParams): SQL {
  if (!viewerId) return sql`true`

  return sql`not exists (
    select 1 from ${userBlocks}
    where (${userBlocks.blockerId} = ${viewerId} and ${userBlocks.blockedId} = ${column})
       or (${userBlocks.blockedId} = ${viewerId} and ${userBlocks.blockerId} = ${column})
  ) and not exists (
    select 1 from ${userMutes}
    where ${userMutes.muterId} = ${viewerId} and ${userMutes.mutedId} = ${column}
  )`
}
