import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '../types'
import { ChatView } from './ChatView'

const failedMessage: ChatMessage = {
  id: '50cb9bc1-3ab5-4ec9-b1fd-b16c939dfcaf',
  sequence: 1,
  conversation_id: 'bf7ee97d-2c9f-40a5-94d8-df4e8a4578ab',
  request_id: '44d83274-cbad-45e7-80af-a4cd71908a88',
  role: 'user',
  content: 'Please try this message again',
  status: 'failed',
  created_at: '2026-07-13T18:00:00.000Z',
}

describe('ChatView', () => {
  it('retries a failed message with the original message record', async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined)
    render(
      <ChatView
        language="en"
        messages={[failedMessage]}
        optimisticMessage={null}
        sending={false}
        onSend={vi.fn()}
        onRetry={onRetry}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledWith(failedMessage)
  })

  it('does not enable sending whitespace', () => {
    render(
      <ChatView
        language="en"
        messages={[]}
        optimisticMessage={null}
        sending={false}
        onSend={vi.fn()}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('shows a waiting state for a recent pending message and a retry once it is stale', () => {
    const recent = { ...failedMessage, status: 'pending' as const, created_at: new Date().toISOString() }
    const { rerender } = render(
      <ChatView language="en" messages={[recent]} optimisticMessage={null} sending={false} onSend={vi.fn()} onRetry={vi.fn()} />,
    )
    expect(screen.getByText('Waiting for the answer…')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()

    const stale = { ...recent, id: 'b4b6a0d1-7c39-4c84-9a0e-7f5d0f2f1a11', created_at: new Date(Date.now() - 5 * 60_000).toISOString() }
    rerender(<ChatView language="en" messages={[stale]} optimisticMessage={null} sending={false} onSend={vi.fn()} onRetry={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible()
  })

  it('offers to copy a completed answer', () => {
    const answer = { ...failedMessage, id: 'c1d2e3f4-0000-4000-8000-000000000001', role: 'assistant' as const, status: 'completed' as const, content: 'Feed 8–12 times a day.' }
    render(<ChatView language="en" messages={[answer]} optimisticMessage={null} sending={false} onSend={vi.fn()} onRetry={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Copy answer' })).toBeVisible()
  })
})
