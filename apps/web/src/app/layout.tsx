import type { Metadata } from "next"

import { getRequestTranslator } from "@/lib/i18n"

import "./globals.css"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return {
    title: t("app.name"),
    description: t("app.tagline"),
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const { locale } = await getRequestTranslator()

  return (
    <html lang={locale}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  )
}
