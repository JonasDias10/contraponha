import { CONTENT_EDIT_WINDOW_MINUTES, minutesToMs } from "@contraponha/config"

export interface EditWindowParams {
  createdAt: string
  now?: Date
}

// Mirrors the API rule; the API stays the authority and answers EDIT_WINDOW_EXPIRED.
export function isWithinEditWindow({ createdAt, now = new Date() }: EditWindowParams): boolean {
  return now.getTime() - new Date(createdAt).getTime() <= minutesToMs(CONTENT_EDIT_WINDOW_MINUTES)
}
