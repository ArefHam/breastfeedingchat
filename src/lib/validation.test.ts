import { describe, expect, it } from 'vitest'
import { messageSchema, passwordSchema, titleFromMessage } from './validation'

describe('chat validation', () => {
  it('normalizes and limits automatic titles', () => {
    const title = titleFromMessage(`  ${'breastfeeding '.repeat(8)}  `)
    expect(title.length).toBeLessThanOrEqual(60)
    expect(title.endsWith('…')).toBe(true)
    expect(title).not.toMatch(/\s{2}/)
  })

  it('rejects empty and oversized messages', () => {
    expect(messageSchema.safeParse('   ').success).toBe(false)
    expect(messageSchema.safeParse('a'.repeat(4001)).success).toBe(false)
  })

  it('requires a six-character password with no character-class rules', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false)
    expect(passwordSchema.safeParse('abcdef').success).toBe(true)
    expect(passwordSchema.safeParse('123456').success).toBe(true)
    expect(passwordSchema.safeParse('a'.repeat(129)).success).toBe(false)
  })
})
