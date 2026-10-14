import type { Metadata } from "next"

import { HumanCheckBridge } from "@/components/auth/human-check-bridge"

export const metadata: Metadata = { robots: { index: false, follow: false } }

// Opened by the mobile app in a WebView during sign-up; the token goes back to the app.
export default function HumanCheckPage(): React.JSX.Element {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface p-4">
      <HumanCheckBridge />
    </main>
  )
}
