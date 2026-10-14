import type { Messages } from "../../types.js"

export const auth: Messages["auth"] = {
  errors: {
    invalidCredentials: "Correo electrónico o contraseña incorrectos.",
    invalidToken: "Este enlace no es válido o ha caducado. Solicita uno nuevo.",
    emailAlreadyInUse: "Ya existe una cuenta con este correo electrónico.",
    accountSuspended: "Esta cuenta está suspendida por incumplir las normas de la comunidad.",
    emailNotVerified: "Confirma tu correo para publicar. Te enviamos un enlace al crear la cuenta.",
    humanCheckFailed: "No pudimos confirmar que eres una persona. Inténtalo de nuevo.",
    twoFactorRequired:
      "Activa la verificación en dos pasos para usar las herramientas de moderación.",
    invalidTwoFactorCode: "Código no válido o caducado.",
  },
}
