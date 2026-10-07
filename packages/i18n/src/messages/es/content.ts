import type { Messages } from "../../types.js"

export const content: Messages["content"] = {
  removed: "[eliminado]",
  removedByModeration: "[eliminado por moderación]",
  errors: {
    reactionLimitReached: "Puedes dar como máximo 2 reacciones. Quita una antes de elegir otra.",
    repliesRestricted: "El autor limitó las contribuciones a las personas que sigue.",
    editWindowExpired:
      "Solo se puede editar durante los primeros 30 minutos. Para cambiar el contenido, elimínalo y publícalo de nuevo.",
  },
}
