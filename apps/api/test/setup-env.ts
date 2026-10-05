import { existsSync } from "node:fs"
import { resolve } from "node:path"

const rootEnvFile = resolve(import.meta.dirname, "../../../.env")

if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile)
