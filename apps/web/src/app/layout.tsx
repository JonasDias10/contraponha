import type { Metadata } from "next"
import { Instrument_Sans, Literata } from "next/font/google"

import { AppProviders, THEME_BOOT_SCRIPT } from "@contraponha/web-ui"
import { getRequestTranslator } from "@contraponha/next-server"

import "./globals.css"

const literata = Literata({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-literata",
  display: "swap",
})

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
})

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()

  return {
    title: { default: t("app.name"), template: `%s · ${t("app.name")}` },
    description: t("app.tagline"),
  }
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default async function RootLayout({
  children,
}: RootLayoutProps): Promise<React.JSX.Element> {
  const { locale } = await getRequestTranslator()

  return (
    <html
      lang={locale}
      className={`${literata.variable} ${instrumentSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <AppProviders locale={locale}>{children}</AppProviders>
      </body>
    </html>
  )
}
