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
  magicLink: {
    subject: "Tu enlace para entrar en Ponto",
    body: "Para entrar en tu cuenta sin contraseña, abre el enlace de abajo:",
    expiry: "El enlace vale por {minutes} minutos y solo se puede usar una vez.",
    ignore: "Si no pediste entrar, ignora este mensaje. Nadie entra en tu cuenta sin este enlace.",
  },
  dataExportReady: {
    subject: "Tu exportación de datos de Ponto está lista",
    body: "Los datos que pediste están listos. Para descargarlos, entra en tu cuenta y ve a Configuración, Tus datos:",
    expiry: "El archivo está disponible durante {days} días.",
    ignore:
      "Si no pediste esta exportación, cambia tu contraseña y cierra las otras sesiones en Configuración.",
  },
}
