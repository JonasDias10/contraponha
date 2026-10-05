import swc from "unplugin-swc"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    include: ["test/**/*.e2e.test.ts"],
    setupFiles: ["test/setup-env.ts"],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
})
