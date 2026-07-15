import { useState, type FormEvent } from 'react'
import { Baby, HeartHandshake, Languages, LockKeyhole } from 'lucide-react'
import { direction, t } from '../i18n'
import { supabase } from '../lib/supabase'
import { emailSchema, passwordSchema } from '../lib/validation'
import type { Language } from '../types'

interface AuthScreenProps {
  language: Language
  onToggleLanguage: () => void
}

function authFailureMessage(language: Language, error: unknown): string {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? Number(error.status)
    : undefined

  return status === 401 || status === 403
    ? t(language, 'authConfigurationError')
    : t(language, 'authError')
}

export function AuthScreen({ language, onToggleLanguage }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    if (!emailSchema.safeParse(email).success) {
      setMessage(t(language, 'invalidEmail'))
      return
    }

    if (mode === 'register') {
      if (!passwordSchema.safeParse(password).success) {
        setMessage(t(language, 'invalidRegistrationPassword'))
        return
      }
      if (password !== confirmation) {
        setMessage(t(language, 'passwordMismatch'))
        return
      }
    } else if (!password) {
      setMessage(t(language, 'passwordRequired'))
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
        if (!data.session) setMessage(t(language, 'accountCreatedCheckEmail'))
      }
    } catch (error) {
      setMessage(authFailureMessage(language, error))
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode() {
    setMode((current) => (current === 'signin' ? 'register' : 'signin'))
    setMessage(null)
    setPassword('')
    setConfirmation('')
  }

  return (
    <main className="auth-page" dir={direction(language)}>
      <button className="language-button auth-language" type="button" onClick={onToggleLanguage}>
        <Languages aria-hidden="true" size={18} />
        {t(language, 'language')}
      </button>

      <section className="auth-intro" aria-labelledby="auth-product-title">
        <div className="brand-mark" aria-hidden="true">
          <Baby size={35} />
        </div>
        <p className="eyebrow">{language === 'fa' ? 'همراه مادر و نوزاد' : 'For mother and baby'}</p>
        <h1 id="auth-product-title">{t(language, 'appName')}</h1>
        <p className="auth-lede">{t(language, 'appSubtitle')}</p>
        <div className="trust-points">
          <span><LockKeyhole aria-hidden="true" size={20} />{t(language, 'authIntro')}</span>
          <span><HeartHandshake aria-hidden="true" size={20} />{t(language, 'privacyNote')}</span>
        </div>
      </section>

      <section className="auth-form-panel" aria-labelledby="auth-title">
        <div className="auth-form-heading">
          <p className="eyebrow">{mode === 'signin' ? t(language, 'signIn') : t(language, 'register')}</p>
          <h2 id="auth-title">{mode === 'signin' ? t(language, 'signInAction') : t(language, 'registerAction')}</h2>
        </div>

        <form onSubmit={submit} noValidate>
          <label>
            <span>{t(language, 'email')}</span>
            <input
              autoComplete="email"
              dir="ltr"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>{t(language, 'password')}</span>
            <input
              aria-describedby={mode === 'register' ? 'password-hint' : undefined}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              dir="ltr"
              minLength={mode === 'register' ? 10 : undefined}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {mode === 'register' && <small id="password-hint">{t(language, 'passwordHint')}</small>}
          {mode === 'register' && (
            <label>
              <span>{t(language, 'confirmPassword')}</span>
              <input
                autoComplete="new-password"
                dir="ltr"
                minLength={10}
                onChange={(event) => setConfirmation(event.target.value)}
                required
                type="password"
                value={confirmation}
              />
            </label>
          )}

          {message && <p className="form-message" role="alert">{message}</p>}

          <button className="primary-button auth-submit" disabled={submitting} type="submit">
            {submitting
              ? t(language, 'authSubmitting')
              : mode === 'signin' ? t(language, 'signInAction') : t(language, 'registerAction')}
          </button>
        </form>

        <button className="text-button auth-switch" type="button" onClick={switchMode}>
          {mode === 'signin' ? t(language, 'switchToRegister') : t(language, 'switchToSignIn')}
        </button>
      </section>
    </main>
  )
}
