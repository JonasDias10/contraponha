import swc from "unplugin-swc"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [swc.vite()],
  ssr: {
    resolve: {
      conditions: ["source"],
    },
  },
  test: {
    include: ["test/**/*.e2e.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    setupFiles: ["test/setup-env.ts"],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
})
