import { z } from "zod"

export const requestIdSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/)

export function isValidRequestId(value: unknown): value is string {
  return requestIdSchema.safeParse(value).success
}
