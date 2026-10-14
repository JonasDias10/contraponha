import type { Messages } from "../../types.js"

export const users: Messages["users"] = {
  errors: {
    dataExportInProgress: "Ya hay una exportación en curso. Espera el correo con el enlace.",
    handleUnavailable: "Este nombre de usuario no está disponible.",
    interactionBlocked: "No es posible interactuar con esta cuenta.",
  },
}
