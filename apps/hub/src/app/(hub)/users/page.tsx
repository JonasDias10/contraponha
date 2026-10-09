import { getRequestTranslator } from "@contraponha/next-server"
import type { Metadata } from "next"

import { UserList } from "@/components/users/user-list"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()

  return { title: t("hub.users.title") }
}

export default function UsersPage(): React.JSX.Element {
  return <UserList />
}
