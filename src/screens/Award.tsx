import { useState } from 'react'
import { Coin } from '../components/Coin'
import { QrView } from '../components/QrView'
import { QUICK_AMOUNTS } from '../config/rewards'
import { encode, makeAward } from '../lib/coupon'
import { formatPoints } from '../lib/format'
import { getKey, logIssuedAward } from '../lib/store'
import { CURRENCY_LABEL, ROLE_LABEL, issuedCurrency, otherRole, type Identity } from '../lib/types'

/**
 * Puan verme: tek yonlu tarama yeter. Kisi kendi para biriminde sinirsiz
 * arz sahibi oldugu icin bakiye kontrolu ve cift-harcama riski yok.
 */
export function Award({ identity }: { identity: Identity }) {
  const currency = issuedCurrency(identity.role)
  const [amount, setAmount] = useState(5_000)
  const [custom, setCustom] = useState('')
  const [note, setNote] = useState('')
  const [coupon, setCoupon] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const effective = custom.trim() ? Number(custom.replace(/\D/g, '')) : amount

  const create = async () => {
    const key = getKey()
    if (!key) return setError('Cihaz kilitli.')
    if (!effective || effective <= 0) return setError('Geçerli bir puan girin.')
    if (effective > 1_000_000) return setError('Bu kadarı biraz fazla kaçmadı mı? En fazla 1.000.000.')
    setError(null)
    const body = makeAward(identity.role, effective, note)
    const text = await encode(key, body)
    logIssuedAward(body.n, currency, effective, note.trim() || 'Puan kuponu')
    setCoupon(text)
  }

  if (coupon) {
    return (
      <div className="screen">
        <div className="screen-head">
          <div>
            <h1>Kupon hazır</h1>
            <p>{ROLE_LABEL[otherRole(identity.role)]} bunu “Tara” ile okutsun.</p>
          </div>
          <Coin currency={currency} size={48} pop />
        </div>

        <div className="card stack center">
          <div className="balance__value">{formatPoints(effective)}</div>
          <div className="balance__label">{CURRENCY_LABEL[currency]}</div>
          {note.trim() && <p className="muted">“{note.trim()}”</p>}
        </div>

        <QrView value={coupon} shareTitle={`${formatPoints(effective)} ${CURRENCY_LABEL[currency]}`} />

        <div className="note">
          Kupon 14 gün geçerli ve yalnızca <strong>bir kez</strong> kullanılabilir. Aynı odada değilseniz
          “Gönder” ile mesajla da yollayabilirsiniz.
        </div>

        <button
          type="button"
          className="btn btn--block"
          onClick={() => {
            setCoupon(null)
            setNote('')
            setCustom('')
          }}
        >
          Yeni kupon kes
        </button>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1>Puan Ver</h1>
          <p>{CURRENCY_LABEL[currency]} kesiyorsunuz</p>
        </div>
        <Coin currency={currency} size={48} />
      </div>

      <div className="card stack">
        <h3>Ne kadar?</h3>
        <div className="chip-row">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              className={`chip${!custom.trim() && amount === a ? ' chip--on' : ''}`}
              onClick={() => {
                setAmount(a)
                setCustom('')
              }}
            >
              {formatPoints(a)}
            </button>
          ))}
        </div>
        <div className="field">
          <label>ya da kendiniz yazın</label>
          <input
            className="input"
            inputMode="numeric"
            placeholder="örn. 12500"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 7))}
          />
        </div>
      </div>

      <div className="card stack">
        <h3>Ne için?</h3>
        <textarea
          className="input"
          rows={3}
          maxLength={120}
          placeholder="örn. çöpü attığın için 💚"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="muted tiny">{note.length}/120 · kuponun üstünde görünecek</p>
      </div>

      {error && <div className="note note--bad">{error}</div>}

      <button type="button" className="btn btn--primary btn--block" onClick={create} disabled={!effective}>
        🎟️ {formatPoints(effective || 0)} puanlık kupon kes
      </button>
    </div>
  )
}
