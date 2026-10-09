import { UserDetail } from "@/components/users/user-detail"

export default async function UserPage({
  params,
}: PageProps<"/users/[handle]">): Promise<React.JSX.Element> {
  const { handle } = await params

  return <UserDetail handle={decodeURIComponent(handle)} />
}
