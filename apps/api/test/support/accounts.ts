import { randomBytes } from "node:crypto"

import type { AuthResponse } from "@ponto/types"
import { authResponseSchema } from "@ponto/validation"
import request from "supertest"

export type App = Parameters<typeof request>[0]

export interface AccountInput {
  email: string
  password: string
  handle: string
  displayName: string
  locale?: string
}

export function newAccountInput(overrides: Partial<AccountInput> = {}): AccountInput {
  const suffix = randomBytes(5).toString("hex")
  return {
    email: `person_${suffix}@example.com`,
    password: "correct horse battery staple",
    handle: `person_${suffix}`,
    displayName: "Pessoa de Teste",
    ...overrides,
  }
}

export interface RegisteredAccount {
  input: AccountInput
  auth: AuthResponse
}

export type AuthorizationHeader = {
  Authorization: string
}

export interface RegisterAccountParams {
  server: App
  overrides?: Partial<AccountInput>
}

export async function registerAccount({
  server,
  overrides = {},
}: RegisterAccountParams): Promise<RegisteredAccount> {
  const input = newAccountInput(overrides)
  const response = await request(server).post("/api/v1/auth/register").send(input).expect(201)
  return { input, auth: authResponseSchema.parse(response.body) }
}

export interface LoginParams {
  server: App
  email: string
  password: string
}

export async function login({ server, email, password }: LoginParams): Promise<string> {
  const response = await request(server)
    .post("/api/v1/auth/login")
    .send({ email, password })
    .expect(200)

  return authResponseSchema.parse(response.body).session.token
}

export function bearer(token: string): AuthorizationHeader {
  return { Authorization: `Bearer ${token}` }
}
