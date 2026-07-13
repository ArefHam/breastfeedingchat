import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SafeMarkdown } from './SafeMarkdown'

describe('SafeMarkdown', () => {
  it('does not render raw HTML', () => {
    const { container } = render(<SafeMarkdown>{'**safe**\n\n<script>alert(1)</script>'}</SafeMarkdown>)
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByText('safe')).toBeVisible()
  })

  it('drops active URL schemes', () => {
    const { container } = render(<SafeMarkdown>{'[unsafe](javascript:alert(1))'}</SafeMarkdown>)
    expect(container.querySelector('a')).not.toHaveAttribute('href', expect.stringContaining('javascript:'))
  })
})
