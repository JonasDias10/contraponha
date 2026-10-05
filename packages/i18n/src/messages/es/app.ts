import type { Messages } from "../../types.js"

export const app: Messages["app"] = {
  name: "Ponto",
  tagline: "Un lugar para conversaciones que valen la pena.",
  foundationNotice:
    "Estamos construyendo la base de Ponto. Las primeras funciones llegarán pronto.",
  apiStatus: {
    checking: "Verificando la API...",
    online: "API disponible",
    offline: "API no disponible",
  },
}
