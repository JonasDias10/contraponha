"use client"

import { HumanCheck } from "@/components/auth/human-check"

interface ReactNativeBridge {
  postMessage: (message: string) => void
}

function nativeBridge(): ReactNativeBridge | undefined {
  const candidate: unknown = Reflect.get(window, "ReactNativeWebView")

  return typeof candidate === "object" && candidate !== null && "postMessage" in candidate
    ? (candidate as ReactNativeBridge)
    : undefined
}

export function HumanCheckBridge(): React.JSX.Element {
  return (
    <HumanCheck
      onToken={(token) => nativeBridge()?.postMessage(JSON.stringify({ humanCheckToken: token }))}
    />
  )
}
