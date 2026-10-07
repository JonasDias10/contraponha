import { Banner } from "@/components/ui/surfaces"

export interface FormBannerProps {
  message: string | null
  tone?: "danger" | "info"
}

export function FormBanner({
  message,
  tone = "danger",
}: FormBannerProps): React.JSX.Element | null {
  if (!message) return null

  return (
    <div role={tone === "danger" ? "alert" : "status"}>
      <Banner tone={tone}>{message}</Banner>
    </div>
  )
}
