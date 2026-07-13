import { z } from 'zod'

export const emailSchema = z.string().trim().email().max(254)
export const passwordSchema = z.string().min(10).max(128).regex(/\p{L}/u).regex(/\p{N}/u)
export const messageSchema = z.string().trim().min(1).max(4000)
export const titleSchema = z.string().trim().min(1).max(120)

export function titleFromMessage(message: string): string {
  const normalized = message.trim().replace(/\s+/g, ' ')
  return normalized.length <= 60 ? normalized : `${normalized.slice(0, 57)}…`
}
