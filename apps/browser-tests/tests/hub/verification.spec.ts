import { expect, test } from "@playwright/test"

import { createAdmin, createMember } from "../../support/accounts.js"
import { expectAccessible } from "../../support/accessibility.js"
import { API_URL } from "../../support/env.js"
import { signInToHub } from "../../support/sign-in.js"

test("an admin grants the verified badge and the profile shows it", async ({ page }) => {
  const admin = await createAdmin()
  const member = await createMember()

  await signInToHub({ page, account: admin })

  await page.goto(`/users/${member.handle}`)

  await page.getByRole("button", { name: "Conceder selo" }).click()

  await page.getByRole("radio", { name: "Jornalista" }).check()

  await page.getByLabel("Como a identidade foi confirmada").fill("Carteira de imprensa conferida")

  await page.getByRole("button", { name: "Salvar selo" }).click()

  await expect(page.getByText("Selo salvo.")).toBeVisible()

  await expect(page.getByRole("img", { name: "Verificada: Jornalista" })).toBeVisible()

  const response = await fetch(`${API_URL}/api/v1/users/${member.handle}`)
  const profile: unknown = await response.json()

  expect(profile).toMatchObject({ verification: { category: "journalist" } })
})

test("hub pages are accessible", async ({ page }) => {
  const admin = await createAdmin()
  const member = await createMember()

  await page.goto("/login")

  await expectAccessible(page)

  await signInToHub({ page, account: admin })

  for (const path of [
    "/",
    "/users",
    `/users/${member.handle}`,
    "/moderation",
    "/moderation/actions",
    "/topics",
  ]) {
    await page.goto(path)

    await expectAccessible(page)
  }
})
