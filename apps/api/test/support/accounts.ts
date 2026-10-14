import { randomBytes } from "node:crypto"

import { createDatabaseConnection, users } from "@contraponha/database"
import type { AuthResponse, UserRole } from "@contraponha/types"
import { authResponseSchema } from "@contraponha/validation"
import { eq } from "drizzle-orm"
import request from "supertest"
import { inject } from "vitest"

export type App = Parameters<typeof request>[0]

export interface AccountInput {
  email: string
  password: string
  handle: string
  displayName: string
  birthDate: string
  acceptedTerms: boolean
  locale?: string
}

export function newAccountInput(overrides: Partial<AccountInput> = {}): AccountInput {
  const suffix = randomBytes(5).toString("hex")
  return {
    email: `person_${suffix}@example.com`,
    password: "correct horse battery staple",
    handle: `person_${suffix}`,
    displayName: "Pessoa de Teste",
    birthDate: "1990-05-17",
    acceptedTerms: true,
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
  // Publishing needs a confirmed email; most tests start from a confirmed account.
  isEmailVerified?: boolean
}

export async function registerAccount({
  server,
  overrides = {},
  isEmailVerified = true,
}: RegisterAccountParams): Promise<RegisteredAccount> {
  const input = newAccountInput(overrides)
  const response = await request(server).post("/api/v1/auth/register").send(input).expect(201)
  const auth = authResponseSchema.parse(response.body)

  if (isEmailVerified) await markEmailVerified(auth.user.id)

  return { input, auth }
}

async function markEmailVerified(userId: string): Promise<void> {
  const connection = createDatabaseConnection({ url: inject("testDatabaseUrl") })

  try {
    await connection.db
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(users.id, userId))
  } finally {
    await connection.close()
  }
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

export interface SetRoleParams {
  userId: string
  role: UserRole
  isTwoFactorEnabled?: boolean
}

export async function setRole({
  userId,
  role,
  isTwoFactorEnabled = role !== "member",
}: SetRoleParams): Promise<void> {
  const connection = createDatabaseConnection({ url: inject("testDatabaseUrl") })

  try {
    // Staff routes require two-step verification; tests grant the role with it on.
    await connection.db
      .update(users)
      .set({ role, twoFactorEnabledAt: isTwoFactorEnabled ? new Date() : null })
      .where(eq(users.id, userId))
  } finally {
    await connection.close()
  }
}
