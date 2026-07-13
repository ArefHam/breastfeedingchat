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
})
