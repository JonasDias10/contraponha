import { test, type Cookie } from "@playwright/test"

import { createMember, createPost, type Account } from "../../support/accounts.js"
import { expectAccessible } from "../../support/accessibility.js"
import { signIn } from "../../support/sign-in.js"

const PUBLIC_PAGES = [
  "/",
  "/about",
  "/guidelines",
  "/privacy",
  "/terms",
  "/transparency",
  "/login",
  "/signup",
  "/forgot-password",
]

const SIGNED_IN_PAGES = [
  "/home",
  "/home?tab=discover",
  "/search?q=dados",
  "/notifications",
  "/saved",
  "/compose",
  "/settings/account",
  "/settings/privacy",
  "/settings/notifications",
  "/settings/interests",
  "/settings/appearance",
  "/settings/data",
]

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme })

    for (const path of PUBLIC_PAGES) {
      test(`public page ${path}`, async ({ page }) => {
        await page.goto(path)

        await expectAccessible(page)
      })
    }
  })
}

test.describe("signed in", () => {
  let member: Account
  let postId: string
  let cookies: Cookie[]

  // One sign-in for the whole group: signing in on every test would hit the login rate limit.
  test.beforeAll(async ({ browser }, testInfo) => {
    member = await createMember()

    const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL })
    const page = await context.newPage()

    await signIn({ page, account: member })

    cookies = await context.cookies()

    await context.close()

    postId = await createPost({
      token: member.token,
      title: "Ciclovias reduzem acidentes?",
      body: "Os números de Fortaleza sugerem que sim, mas faltam dados de outras cidades.",
    })
  })

  test.beforeEach(async ({ context }) => {
    await context.addCookies(cookies)
  })

  for (const path of SIGNED_IN_PAGES) {
    test(`page ${path}`, async ({ page }) => {
      await page.goto(path)

      await expectAccessible(page)
    })
  }

  test("post and profile", async ({ page }) => {
    await page.goto(`/posts/${postId}`)

    await expectAccessible(page)

    await page.goto(`/u/${member.handle}`)

    await expectAccessible(page)
  })
})
