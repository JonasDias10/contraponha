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
    include: ["src/**/*.test.ts"],
  },
})
