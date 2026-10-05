import type { Messages } from "../../types.js"

export const app: Messages["app"] = {
  name: "Ponto",
  tagline: "A place for conversations worth having.",
  foundationNotice: "We are building the foundation of Ponto. The first features are coming soon.",
  apiStatus: {
    checking: "Checking the API...",
    online: "API available",
    offline: "API unavailable",
  },
}
