import { describe, expect, it } from 'vitest'
import { direction, t } from './i18n'

describe('localization', () => {
  it('sets Persian RTL and English LTR', () => {
    expect(direction('fa')).toBe('rtl')
    expect(direction('en')).toBe('ltr')
  })

  it('provides translated operational labels', () => {
    expect(t('fa', 'newChat')).not.toBe(t('en', 'newChat'))
    expect(t('fa', 'deleteAccount')).toBeTruthy()
    expect(t('en', 'privacyNote')).toContain('does not replace')
  })
})
