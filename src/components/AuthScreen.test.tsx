import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthScreen } from './AuthScreen'

const authMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: { auth: authMocks },
}))

describe('AuthScreen', () => {
  beforeEach(() => {
    authMocks.signInWithPassword.mockReset()
    authMocks.signUp.mockReset()
  })

  it('allows an existing user to sign in with a password shorter than the registration policy', async () => {
    authMocks.signInWithPassword.mockResolvedValue({ data: {}, error: null })
    const user = userEvent.setup()
    render(<AuthScreen language="en" onToggleLanguage={vi.fn()} />)

    await user.type(screen.getByLabelText('Email'), 'mother@example.com')
    await user.type(screen.getByLabelText('Password'), 'legacy1')
    await user.click(screen.getByRole('button', { name: 'Open my conversations' }))

    await waitFor(() => expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'mother@example.com',
      password: 'legacy1',
    }))
  })

  it('explains invalid registration fields before sending a request', async () => {
    const user = userEvent.setup()
    render(<AuthScreen language="en" onToggleLanguage={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'No account? Create one' }))
    await user.type(screen.getByLabelText('Email'), 'mother@example.com')
    await user.type(screen.getByLabelText('Password'), 'abc12')
    await user.type(screen.getByLabelText('Confirm password'), 'abc12')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(authMocks.signUp).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least 6 characters.')
  })

  it('shows a safe configuration message for an authorization failure', async () => {
    authMocks.signUp.mockResolvedValue({ data: {}, error: { status: 401 } })
    const user = userEvent.setup()
    render(<AuthScreen language="en" onToggleLanguage={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'No account? Create one' }))
    await user.type(screen.getByLabelText('Email'), 'mother@example.com')
    await user.type(screen.getByLabelText('Password'), 'safe-pass1')
    await user.type(screen.getByLabelText('Confirm password'), 'safe-pass1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(
      'The secure account service could not be reached. Please try again later.',
    ))
  })

  it.each([
    [{ status: 400, code: 'invalid_credentials' }, 'The email or password is incorrect.'],
    [{ status: 0, name: 'AuthRetryableFetchError' }, 'Could not reach the server. Check your internet or VPN and try again.'],
    [{ status: 429, code: 'over_request_rate_limit' }, 'Too many attempts. Wait a few minutes and try again.'],
  ])('explains a sign-in failure (%o)', async (error, expected) => {
    authMocks.signInWithPassword.mockResolvedValue({ data: {}, error })
    const user = userEvent.setup()
    render(<AuthScreen language="en" onToggleLanguage={vi.fn()} />)

    await user.type(screen.getByLabelText('Email'), 'mother@example.com')
    await user.type(screen.getByLabelText('Password'), 'whatever')
    await user.click(screen.getByRole('button', { name: 'Open my conversations' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(expected))
  })

  it('tells a returning user to sign in when the email is already registered', async () => {
    authMocks.signUp.mockResolvedValue({ data: {}, error: { status: 422, code: 'user_already_exists' } })
    const user = userEvent.setup()
    render(<AuthScreen language="en" onToggleLanguage={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'No account? Create one' }))
    await user.type(screen.getByLabelText('Email'), 'mother@example.com')
    await user.type(screen.getByLabelText('Password'), 'abcdef')
    await user.type(screen.getByLabelText('Confirm password'), 'abcdef')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('An account with this email already exists. Please sign in.'))
  })
})
