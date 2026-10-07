import js from "@eslint/js"
import nextPlugin from "@next/eslint-plugin-next"
import stylistic from "@stylistic/eslint-plugin"
import prettier from "eslint-config-prettier"
import betterTailwind from "eslint-plugin-better-tailwindcss"
import { getDefaultVariables } from "eslint-plugin-better-tailwindcss/defaults"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

/**
 * @typedef {{ tsconfigRootDir: string, ignores?: string[] }} ConfigOptions
 * @typedef {import('eslint').Linter.Config} Config
 */

const OBJECT_PARAMS_MESSAGE =
  "Functions with two or more parameters must take a single object parameter instead."

const OBJECT_PARAMS_RESTRICTIONS = [
  "FunctionDeclaration[params.length>1]",
  "VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression)[params.length>1]",
  "PropertyDefinition > ArrowFunctionExpression[params.length>1]",
  "MethodDefinition[kind='method'] > FunctionExpression[params.length>1]:not(:has(Decorator))",
  "TSMethodSignature[params.length>1]",
  "TSDeclareFunction[params.length>1]",
].map((selector) => ({ selector, message: OBJECT_PARAMS_MESSAGE }))

const INLINE_AWAIT_MESSAGE =
  "Store the awaited result in a variable first, then pass that variable along."

const INLINE_AWAIT_RESTRICTIONS = [
  "CallExpression > AwaitExpression.arguments",
  "NewExpression > AwaitExpression.arguments",
  "MemberExpression > AwaitExpression.object",
  "SpreadElement > AwaitExpression",
  "Property > AwaitExpression.value",
  "ArrayExpression > AwaitExpression",
].map((selector) => ({ selector, message: INLINE_AWAIT_MESSAGE }))

const NAMED_SIGNATURE_TYPE_MESSAGE =
  "Declare parameter and return types as named interfaces or types outside the function signature."

const NAMED_SIGNATURE_TYPE_RESTRICTIONS = [
  ":function > ObjectPattern > TSTypeAnnotation > TSTypeLiteral",
  ":function > AssignmentPattern > ObjectPattern > TSTypeAnnotation > TSTypeLiteral",
  ":function > Identifier > TSTypeAnnotation > TSTypeLiteral",
  ":function > TSTypeAnnotation > TSTypeLiteral",
  ":function > TSTypeAnnotation > TSTypeReference > TSTypeParameterInstantiation > TSTypeLiteral",
].map((selector) => ({ selector, message: NAMED_SIGNATURE_TYPE_MESSAGE }))

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
      plugins: { "@stylistic": stylistic },
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
        "no-restricted-syntax": [
          "error",
          ...OBJECT_PARAMS_RESTRICTIONS,
          ...INLINE_AWAIT_RESTRICTIONS,
          ...NAMED_SIGNATURE_TYPE_RESTRICTIONS,
        ],
        "@stylistic/padding-line-between-statements": [
          "error",
          { blankLine: "always", prev: "*", next: "if" },
          { blankLine: "always", prev: "if", next: "*" },
          { blankLine: "always", prev: "*", next: ["expression", "multiline-expression"] },
          { blankLine: "always", prev: ["expression", "multiline-expression"], next: "*" },
          { blankLine: "always", prev: "*", next: ["multiline-const", "multiline-let"] },
          { blankLine: "always", prev: ["multiline-const", "multiline-let"], next: "*" },
        ],
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
    {
      rules: {
        curly: ["error", "multi-or-nest", "consistent"],
      },
    },
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

/**
 * Tailwind class checks with autofix: canonical names (max-w-[560px] -> max-w-140), class
 * order, duplicates, deprecated, unknown and conflicting classes. Line wrapping is left
 * to Prettier.
 * @param {{ tsconfigRootDir: string, entryPoint: string }} options
 * @returns {Config}
 */
function tailwindConfig({ tsconfigRootDir, entryPoint }) {
  return {
    files: ["**/*.{ts,tsx}"],
    ...betterTailwind.configs["recommended-error"],
    settings: {
      "better-tailwindcss": {
        cwd: tsconfigRootDir,
        entryPoint,
        detectComponentClasses: true,
        variables: [...getDefaultVariables(), ["Classes$", [{ match: "strings" }]]],
      },
    },
    rules: {
      ...betterTailwind.configs["recommended-error"].rules,
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
      "better-tailwindcss/enforce-canonical-classes": ["error", { rootFontSize: 16 }],
    },
  }
}

/** @param {ConfigOptions & { tailwindEntryPoint: string }} options @returns {Config[]} */
export function nextConfig({ tailwindEntryPoint, ...options }) {
  return createConfig({
    ...options,
    runtimeGlobals: { ...globals.browser, ...globals.node },
    extra: [
      reactHooks.configs.flat.recommended,
      nextPlugin.configs["core-web-vitals"],
      tailwindConfig({ tsconfigRootDir: options.tsconfigRootDir, entryPoint: tailwindEntryPoint }),
    ],
  })
}
