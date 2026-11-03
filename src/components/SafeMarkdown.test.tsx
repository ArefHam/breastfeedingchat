import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SafeMarkdown } from './SafeMarkdown'

describe('SafeMarkdown', () => {
  it('does not render raw HTML', () => {
    const { container } = render(<SafeMarkdown>{'**safe**\n\n<script>alert(1)</script>'}</SafeMarkdown>)
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByText('safe')).toBeVisible()
  })

  it('keeps the text of headings, quotes and code instead of deleting it', () => {
    const { container } = render(<SafeMarkdown>{'## Signs of enough milk\n\n> quoted advice\n\n`8–12 feeds`\n\n---'}</SafeMarkdown>)
    expect(screen.getByRole('heading', { name: 'Signs of enough milk' })).toBeVisible()
    expect(screen.getByText('quoted advice')).toBeVisible()
    expect(screen.getByText('8–12 feeds')).toBeVisible()
    expect(container.querySelector('hr')).not.toBeNull()
  })

  it('renders tables instead of raw pipes', () => {
    const { container } = render(<SafeMarkdown>{'| Age | Feeds |\n|---|---|\n| 0–1 mo | 8–12 |'}</SafeMarkdown>)
    expect(container.querySelector('table')).not.toBeNull()
    expect(container.textContent).not.toContain('|')
  })

  it('keeps the text of disallowed elements such as images', () => {
    const { container } = render(<SafeMarkdown>{'before ![x](https://example.com/a.png) after'}</SafeMarkdown>)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('before')
    expect(container.textContent).toContain('after')
  })

  it('drops active URL schemes', () => {
    const { container } = render(<SafeMarkdown>{'[unsafe](javascript:alert(1))'}</SafeMarkdown>)
    expect(container.querySelector('a')).not.toHaveAttribute('href', expect.stringContaining('javascript:'))
  })
})
