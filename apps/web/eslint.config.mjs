import { nextConfig } from "@ponto/eslint-config"

export default nextConfig({
  tsconfigRootDir: import.meta.dirname,
  tailwindEntryPoint: "src/app/globals.css",
})
