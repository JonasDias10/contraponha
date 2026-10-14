import { expect, type Page } from "@playwright/test"

import { nextCode, type Account, type StaffAccount } from "./accounts.js"

export interface SignInParams {
  page: Page
  account: Account
}

async function submitCredentials({ page, account }: SignInParams): Promise<void> {
  await page.goto("/login")

  await page.getByLabel("E-mail").fill(account.email)

  await page.getByLabel("Senha", { exact: true }).fill(account.password)

  await page.getByRole("button", { name: "Entrar", exact: true }).click()
}

export async function signIn({ page, account }: SignInParams): Promise<void> {
  await submitCredentials({ page, account })

  await expect(page).toHaveURL(/\/home/)
}

export interface SignInToHubParams {
  page: Page
  account: StaffAccount
}

export async function signInToHub({ page, account }: SignInToHubParams): Promise<void> {
  await submitCredentials({ page, account })

  const code = await nextCode(account.twoFactorSecret)

  await page.getByLabel("Código do app ou de recuperação").fill(code)

  await page.getByRole("button", { name: "Verificar" }).click()

  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible()
}
