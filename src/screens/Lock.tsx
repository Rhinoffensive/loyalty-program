import { useState } from 'react'
import { Coin } from '../components/Coin'
import { PinField, isValidPin } from '../components/PinField'
import { unlock } from '../lib/store'
import { ROLE_LABEL, heldCurrency, type Role } from '../lib/types'

interface Props {
  role: Role
  /** Baglantiyla bir kupon geldi ama cihaz kilitli — PIN sonrasi devam edecek. */
  pendingCoupon?: boolean
}

/** Cihaz token'i silindiginde (Ayarlar > Kilitle) cikan ekran. */
export function Lock({ role, pendingCoupon = false }: Props) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!isValidPin(pin)) return setError('PIN eksik.')
    setBusy(true)
    setError(null)
    try {
      if (!(await unlock(pin))) {
        setError('PIN yanlış.')
        setPin('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen screen--plain">
      <div className="stack center">
        <Coin currency={heldCurrency(role)} size={84} float />
        <h1>Merhaba {ROLE_LABEL[role]}</h1>
        <p className="muted">
          {pendingCoupon
            ? 'Bir kupon geldi 🎁 Açmak için ortak PIN’i girin.'
            : 'Devam etmek için ortak PIN’i girin.'}
        </p>
      </div>
      <div className="card stack" style={{ marginTop: 24 }}>
        <PinField label="PIN" value={pin} onChange={setPin} autoFocus onEnter={submit} />
        {error && <div className="note note--bad">{error}</div>}
        <button type="button" className="btn btn--primary btn--block" disabled={busy} onClick={submit}>
          {busy ? <span className="spinner" /> : 'Kilidi aç'}
        </button>
      </div>
    </div>
  )
}
