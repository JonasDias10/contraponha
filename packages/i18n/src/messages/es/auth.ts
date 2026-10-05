import type { Messages } from "../../types.js"

export const auth: Messages["auth"] = {
  errors: {
    invalidCredentials: "Correo electrónico o contraseña incorrectos.",
    invalidToken: "Este enlace no es válido o ha caducado. Solicita uno nuevo.",
    emailAlreadyInUse: "Ya existe una cuenta con este correo electrónico.",
  },
}
