import { randomBytes } from "node:crypto"

import { createDatabaseConnection, users } from "@contraponha/database"
import { eq } from "drizzle-orm"
import { generate } from "otplib"

import { API_URL, databaseUrl } from "./env.js"

export interface Account {
  id: string
  handle: string
  email: string
  password: string
  displayName: string
  token: string
}

export interface StaffAccount extends Account {
  twoFactorSecret: string
}

interface RegisterResponse {
  user: { id: string }
  session: { token: string }
}

interface TwoFactorSetupResponse {
  secret: string
}

interface ApiRequestParams {
  path: string
  method?: string
  token?: string
  body?: unknown
}

async function apiRequest<T>({ path, method = "GET", token, body }: ApiRequestParams): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) throw new Error(`${method} ${path} failed with ${response.status}`)

  const text = await response.text()

  return (text ? JSON.parse(text) : undefined) as T
}

export function uniqueSuffix(): string {
  return randomBytes(4).toString("hex")
}

export function newAccountInput(): Omit<Account, "id" | "token"> {
  const suffix = uniqueSuffix()

  return {
    handle: `browser_${suffix}`,
    email: `browser_${suffix}@example.com`,
    password: "correct horse battery staple",
    displayName: `Pessoa ${suffix}`,
  }
}

interface UpdateUserParams {
  id: string
  data: Partial<typeof users.$inferInsert>
}

async function updateUser({ id, data }: UpdateUserParams): Promise<void> {
  const connection = createDatabaseConnection({ url: databaseUrl(), maxConnections: 1 })

  try {
    await connection.db.update(users).set(data).where(eq(users.id, id))
  } finally {
    await connection.close()
  }
}

// A confirmed, onboarded member created through the API, so each test starts from a known
// state without repeating the sign-up screens.
export async function createMember(): Promise<Account> {
  const input = newAccountInput()

  const registered = await apiRequest<RegisterResponse>({
    path: "/auth/register",
    method: "POST",
    body: { ...input, birthDate: "1990-05-17", acceptedTerms: true },
  })

  await updateUser({
    id: registered.user.id,
    data: { emailVerifiedAt: new Date(), onboardedAt: new Date() },
  })

  return { ...input, id: registered.user.id, token: registered.session.token }
}

// Staff need two-step verification; the secret lets the test type the current code.
export async function createAdmin(): Promise<StaffAccount> {
  const member = await createMember()

  await updateUser({ id: member.id, data: { role: "admin" } })

  const setup = await apiRequest<TwoFactorSetupResponse>({
    path: "/auth/two-factor/setup",
    method: "POST",
    token: member.token,
  })

  const code = await generate({ secret: setup.secret })

  await apiRequest({
    path: "/auth/two-factor/enable",
    method: "POST",
    token: member.token,
    body: { code },
  })

  return { ...member, twoFactorSecret: setup.secret }
}

const TOTP_STEP_SECONDS = 30

// Enabling already used the current step and codes are single-use, so sign-in types the
// next step's code, which the server accepts within its one-step tolerance.
export function nextCode(secret: string): Promise<string> {
  return generate({ secret, epoch: Math.floor(Date.now() / 1000) + TOTP_STEP_SECONDS })
}

interface CreatePostParams {
  token: string
  title: string
  body: string
}

export async function createPost({ token, title, body }: CreatePostParams): Promise<string> {
  const post = await apiRequest<{ id: string }>({
    path: "/posts",
    method: "POST",
    token,
    body: { title, body },
  })

  return post.id
}
