import { getSentryExpoConfig } from "@sentry/react-native/metro.js"

// Sentry's wrapper around Expo's default config adds debug IDs to bundles, so stack traces
// can be symbolicated once source maps are uploaded by the build pipeline.
export default getSentryExpoConfig(import.meta.dirname)
