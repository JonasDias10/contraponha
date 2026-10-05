import type { Messages } from "../../types.js"

export const emails: Messages["emails"] = {
  greeting: "¡Hola, {name}!",
  signature: "El equipo de Ponto",
  verifyEmail: {
    subject: "Confirma tu correo en Ponto",
    body: "Para confirmar tu correo y activar todas las funciones de tu cuenta, abre el siguiente enlace:",
    expiry: "El enlace es válido durante {hours} horas.",
    ignore: "Si no creaste una cuenta en Ponto, ignora este mensaje.",
  },
  passwordReset: {
    subject: "Restablece tu contraseña de Ponto",
    body: "Recibimos una solicitud para restablecer la contraseña de tu cuenta. Para elegir una nueva contraseña, abre el siguiente enlace:",
    expiry: "El enlace es válido durante {minutes} minutos y solo se puede usar una vez.",
    ignore:
      "Si no solicitaste el restablecimiento, ignora este mensaje. Tu contraseña sigue siendo la misma.",
  },
}
