import { CONTENT_EDIT_WINDOW_MINUTES, minutesToMs } from "@ponto/config"

export interface IsWithinEditWindowParams {
  createdAt: Date
  now: Date
}

export function isWithinEditWindow({ createdAt, now }: IsWithinEditWindowParams): boolean {
  return now.getTime() - createdAt.getTime() <= minutesToMs(CONTENT_EDIT_WINDOW_MINUTES)
}
