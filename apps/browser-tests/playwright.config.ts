import { defineConfig, devices } from "@playwright/test"

import { API_URL, HUB_URL, WEB_URL } from "./support/env.js"

const isCI = Boolean(process.env.CI)
const ROOT = "../.."

// CI starts the built apps; locally the dev servers are started, or reused when running.
const serve = (workspace: string): string =>
  `pnpm --filter @contraponha/${workspace} ${isCI ? "start" : "dev"}`

export default defineConfig({
  testDir: "tests",
  // Dev servers compile each route on first visit.
  timeout: isCI ? 30_000 : 90_000,
  expect: { timeout: isCI ? 5_000 : 20_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "web",
      testDir: "tests/web",
      use: { ...devices["Desktop Chrome"], baseURL: WEB_URL },
    },
    {
      name: "web-phone",
      testDir: "tests/web",
      testMatch: /accessibility\.spec\.ts/,
      use: { ...devices["Pixel 7"], baseURL: WEB_URL },
    },
    {
      name: "hub",
      testDir: "tests/hub",
      use: { ...devices["Desktop Chrome"], baseURL: HUB_URL },
    },
  ],
  webServer: [
    {
      command: serve("api"),
      cwd: ROOT,
      // Every request comes from one address and every test signs up or signs in; production
      // limits would turn later tests into 429s.
      env: {
        RATE_LIMIT_MAX_REQUESTS: "100000",
        AUTH_RATE_LIMIT_MAX_REQUESTS: "10000",
        WRITE_LIMIT_MULTIPLIER: "100",
      },
      url: `${API_URL}/api/v1/health/live`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      // tsc-watch outlives a hard kill and keeps the port busy.
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
    {
      command: serve("web"),
      cwd: ROOT,
      url: WEB_URL,
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
    {
      command: serve("hub"),
      cwd: ROOT,
      url: `${HUB_URL}/login`,
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
  ],
})
