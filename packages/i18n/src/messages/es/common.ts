import type { Messages } from "../../types.js"

export const common: Messages["common"] = {
  errors: {
    badRequest: "No fue posible procesar la solicitud.",
    validationFailed: "Algunos de los datos enviados no son válidos.",
    unauthorized: "Debes iniciar sesión para continuar.",
    forbidden: "No tienes permiso para realizar esta acción.",
    notFound: "No se encontró el recurso solicitado.",
    conflict: "La solicitud entra en conflicto con el estado actual del recurso.",
    payloadTooLarge: "El contenido enviado supera el tamaño permitido.",
    tooManyRequests: "Demasiadas solicitudes en poco tiempo. Inténtalo de nuevo en unos instantes.",
    internal: "Ocurrió un error inesperado. Inténtalo de nuevo más tarde.",
    serviceUnavailable: "El servicio no está disponible temporalmente.",
  },
}
