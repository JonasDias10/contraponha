import js from "@eslint/js"
import nextPlugin from "@next/eslint-plugin-next"
import prettier from "eslint-config-prettier"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

/**
 * @typedef {{ tsconfigRootDir: string, ignores?: string[] }} ConfigOptions
 * @typedef {import('eslint').Linter.Config} Config
 */

/**
 * @param {ConfigOptions & { runtimeGlobals: Record<string, boolean>, extra?: Config[] }} options
 * @returns {Config[]}
 */
function createConfig({ tsconfigRootDir, ignores = [], runtimeGlobals, extra = [] }) {
  return tseslint.config(
    {
      ignores: [
        "**/build/**",
        "**/coverage/**",
        "**/.turbo/**",
        "**/migrations/**",
        "**/.next/**",
        "**/.expo/**",
        "**/next-env.d.ts",
        "**/expo-env.d.ts",
        ...ignores,
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        globals: runtimeGlobals,
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-non-null-assertion": "error",
        "@typescript-eslint/explicit-module-boundary-types": "error",
        "@typescript-eslint/consistent-type-imports": [
          "error",
          { prefer: "type-imports", fixStyle: "separate-type-imports" },
        ],
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/no-floating-promises": "error",
        "no-console": "error",
        eqeqeq: ["error", "always"],
      },
    },
    ...extra,
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "**/test/**/*.ts"],
      rules: {
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
      },
    },
    {
      files: ["**/*.{js,mjs,cjs}"],
      ...tseslint.configs.disableTypeChecked,
    },
    prettier,
  )
}

/** @param {ConfigOptions} options @returns {Config[]} */
export function nodeConfig(options) {
  return createConfig({ ...options, runtimeGlobals: globals.node })
}

/** @param {ConfigOptions} options @returns {Config[]} */
export function reactConfig(options) {
  return createConfig({
    ...options,
    runtimeGlobals: { ...globals.browser },
    extra: [reactHooks.configs.flat.recommended],
  })
}

/** @param {ConfigOptions} options @returns {Config[]} */
export function nextConfig(options) {
  return createConfig({
    ...options,
    runtimeGlobals: { ...globals.browser, ...globals.node },
    extra: [reactHooks.configs.flat.recommended, nextPlugin.configs["core-web-vitals"]],
  })
}
