import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { direction, t } from '../i18n'
import type { Language } from '../types'

export interface DialogRequest {
  title: string
  body?: string
  /** When set, the dialog shows a text field prefilled with this value. */
  input?: { value: string; dir?: 'ltr' | 'rtl' | 'auto'; type?: 'text' | 'email'; maxLength?: number }
  confirmLabel?: string
  danger?: boolean
  /** Return an error message to keep the dialog open, or nothing to close it. */
  onConfirm: (value: string) => Promise<string | void> | string | void
}

interface DialogProps {
  language: Language
  request: DialogRequest
  onClose: () => void
}

export function Dialog({ language, request, onClose }: DialogProps) {
  const [value, setValue] = useState(request.input?.value ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (request.input) inputRef.current?.select()
    else confirmRef.current?.focus()
  }, [request.input])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await request.onConfirm(value)
      if (typeof result === 'string') setError(result)
      else onClose()
    } catch {
      setError(t(language, 'actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <form className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} dir={direction(language)} onSubmit={submit}>
        <h2 id={titleId}>{request.title}</h2>
        {request.body && <p>{request.body}</p>}
        {request.input && (
          <input
            aria-label={request.title}
            dir={request.input.dir ?? 'auto'}
            maxLength={request.input.maxLength}
            onChange={(event) => setValue(event.target.value)}
            ref={inputRef}
            type={request.input.type ?? 'text'}
            value={value}
          />
        )}
        {error && <p className="form-message" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button className="text-button" disabled={busy} type="button" onClick={onClose}>{t(language, 'cancel')}</button>
          <button className={request.danger ? 'primary-button danger' : 'primary-button'} disabled={busy} ref={confirmRef} type="submit">
            {request.confirmLabel ?? t(language, 'confirm')}
          </button>
        </div>
      </form>
    </div>
  )
}
