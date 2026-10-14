import { expect, test } from "@playwright/test"

import { newAccountInput, uniqueSuffix } from "../../support/accounts.js"
import { linkFromEmail } from "../../support/mailbox.js"

test("signs up, confirms the email and publishes a post", async ({ page }) => {
  const input = newAccountInput()
  const title = `Transporte público gratuito ${uniqueSuffix()}`

  await page.goto("/signup")

  await page.getByLabel("Nome", { exact: true }).fill(input.displayName)

  await page.getByLabel("Nome de usuário").fill(input.handle)

  await expect(page.getByText(`@${input.handle} está disponível.`)).toBeVisible()

  await page.getByLabel("E-mail").fill(input.email)

  await page.getByLabel("Senha", { exact: true }).fill(input.password)

  await page.getByLabel("Data de nascimento").fill("17/05/1990")

  await page.getByRole("checkbox").check()

  await page.getByRole("button", { name: "Continuar" }).click()

  await expect(page).toHaveURL(/\/onboarding/)

  await page.getByRole("button", { name: "Pular por agora" }).click()

  await expect(page).toHaveURL(/\/home/)

  const link = await linkFromEmail({ email: input.email, path: "/verify-email" })

  await page.goto(link)

  await expect(page.getByText("E-mail confirmado. Obrigado!")).toBeVisible()

  await page.goto("/compose")

  await page.getByRole("textbox", { name: "Título (opcional)" }).fill(title)

  await page
    .getByRole("textbox", {
      name: "Escreva com calma. Um bom post traz contexto, dados e uma pergunta.",
    })
    .fill("Quem paga a conta? Os dados de São Paulo mostram custos e ganhos diferentes.")

  await page.getByRole("button", { name: "Publicar", exact: true }).click()

  await expect(page.getByRole("heading", { name: title })).toBeVisible()
})
