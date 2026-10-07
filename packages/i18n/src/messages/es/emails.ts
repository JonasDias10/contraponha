import type { Messages } from "../../types.js"

export const emails: Messages["emails"] = {
  greeting: "¡Hola, {name}!",
  signature: "El equipo de Contraponha",
  linkFallback: "Si el botón no funciona, copia y pega esta dirección en tu navegador:",
  footer: "Recibiste este correo por tu cuenta en Contraponha.",
  tagline: "Conversaciones que valen la pena.",
  verifyEmail: {
    subject: "Confirma tu correo en Contraponha",
    title: "Confirma tu correo",
    body: "Para confirmar tu correo y activar todas las funciones de tu cuenta, usa el botón de abajo.",
    action: "Confirmar correo",
    expiry: "El enlace es válido durante {hours} horas.",
    ignore: "Si no creaste una cuenta en Contraponha, ignora este mensaje.",
  },
  passwordReset: {
    subject: "Restablece tu contraseña de Contraponha",
    title: "Restablece tu contraseña",
    body: "Recibimos una solicitud para restablecer la contraseña de tu cuenta. Para elegir una nueva, usa el botón de abajo.",
    action: "Elegir nueva contraseña",
    expiry: "El enlace es válido durante {minutes} minutos y solo se puede usar una vez.",
    ignore:
      "Si no solicitaste el restablecimiento, ignora este mensaje. Tu contraseña sigue siendo la misma.",
  },
  dataExportReady: {
    subject: "Tu exportación de datos de Contraponha está lista",
    title: "Tus datos están listos",
    body: "Los datos que pediste están listos. Para descargarlos, entra en tu cuenta y ve a Configuración, en Tus datos.",
    action: "Abrir Tus datos",
    expiry: "El archivo está disponible durante {days} días.",
    ignore:
      "Si no pediste esta exportación, cambia tu contraseña y cierra las otras sesiones en Configuración.",
  },
}
