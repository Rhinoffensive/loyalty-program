import { useEffect, useState } from 'react'
import { Coin } from '../components/Coin'
import { QrView } from '../components/QrView'
import { Sheet } from '../components/Sheet'
import { encode, makeRequest } from '../lib/coupon'
import { formatPoints, formatWhen } from '../lib/format'
import { addPending, availablePoints, cancelPending, getKey, useAppState } from '../lib/store'
import {
  CURRENCY_LABEL,
  ROLE_LABEL,
  heldCurrency,
  otherRole,
  type Identity,
  type Reward,
  type Role,
} from '../lib/types'

/**
 * Odul harcama iki adimlidir: once talep QR'i (puan yerelde rezerve edilir),
 * sonra karsi tarafin onay QR'i okununca puan gercekten duser.
 */
export function Rewards({ identity }: { identity: Identity }) {
  const state = useAppState()
  const currency = heldCurrency(identity.role)
  const available = availablePoints()
  const [sheet, setSheet] = useState<{ coupon: string; reward: Reward } | null>(null)
  const [reopened, setReopened] = useState<string | null>(null)

  const catalog = state.rewards
    .filter((r) => r.who === 'both' || r.who === identity.role)
    .slice()
    .sort((a, b) => a.cost - b.cost)

  const claim = async (reward: Reward) => {
    const key = getKey()
    if (!key) return
    const body = makeRequest(identity.role, currency, reward)
    const coupon = await encode(key, body)
    addPending({
      id: body.n,
      rewardId: reward.id,
      title: reward.title,
      emoji: reward.emoji,
      cost: reward.cost,
      currency,
      ts: body.d,
    })
    setSheet({ coupon, reward })
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1>Ödüller</h1>
          <p>{CURRENCY_LABEL[currency]} ile</p>
        </div>
        <Coin currency={currency} size={48} />
      </div>

      <div className="card">
        <div className="balance">
          <div>
            <div className="balance__value">{formatPoints(Math.max(0, available))}</div>
            <div className="balance__label">harcanabilir puan</div>
          </div>
        </div>
      </div>

      {state.pending.length > 0 && (
        <div className="card">
          <div className="card__title">
            <h3>Onay bekleyen</h3>
            <span className="muted tiny">{ROLE_LABEL[otherRole(identity.role)]} okutmalı</span>
          </div>
          <div className="list">
            {state.pending.map((p) => (
              <div className="list__item" key={p.id}>
                <div className="list__icon" aria-hidden="true">
                  {p.emoji}
                </div>
                <div className="list__main">
                  <strong>{p.title}</strong>
                  <span className="muted tiny">
                    {formatPoints(p.cost)} puan ayrıldı · {formatWhen(p.ts)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() =>
                    setReopened(reopened === p.id ? null : p.id)
                  }
                >
                  {reopened === p.id ? 'Gizle' : 'Kod'}
                </button>
              </div>
            ))}
          </div>
          {reopened && (
            <PendingCoupon id={reopened} role={identity.role} onCancel={() => setReopened(null)} />
          )}
        </div>
      )}

      <div className="stack">
        {catalog.map((r) => {
          const locked = available < r.cost
          return (
            <div className={`reward${locked ? ' reward--locked' : ''}`} key={r.id}>
              <div className="reward__emoji" aria-hidden="true">
                {r.emoji}
              </div>
              <div className="reward__body">
                <strong>{r.title}</strong>
                <span className="muted tiny">
                  {formatPoints(r.cost)} puan
                  {locked ? ` · ${formatPoints(r.cost - Math.max(0, available))} puan eksik` : ''}
                </span>
              </div>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={locked}
                onClick={() => void claim(r)}
              >
                Talep et
              </button>
            </div>
          )
        })}
        {catalog.length === 0 && (
          <p className="muted tiny center">Katalog boş. Ayarlar’dan ödül ekleyebilirsiniz.</p>
        )}
      </div>

      {sheet && (
        <Sheet title="Talebiniz hazır" onClose={() => setSheet(null)}>
          <div className="card stack center">
            <div className="hero-emoji">{sheet.reward.emoji}</div>
            <strong>{sheet.reward.title}</strong>
            <span className="muted">{formatPoints(sheet.reward.cost)} puan</span>
          </div>
          <QrView value={sheet.coupon} shareTitle={`Ödül talebi: ${sheet.reward.title}`} />
          <div className="note">
            Puanınız şimdilik <strong>ayrıldı</strong>, henüz düşmedi. {ROLE_LABEL[otherRole(identity.role)]} bunu
            okutup onaylayınca size bir onay karekodu verecek; onu taradığınızda ödül sizin olur.
          </div>
          <button type="button" className="btn btn--block" onClick={() => setSheet(null)}>
            Tamam
          </button>
        </Sheet>
      )}
    </div>
  )
}

/** Bekleyen talebin kuponunu tekrar gosterir ve iptal imkani verir. */
function PendingCoupon({ id, role, onCancel }: { id: string; role: Role; onCancel: () => void }) {
  const state = useAppState()
  const [coupon, setCoupon] = useState<string | null>(null)
  const pending = state.pending.find((p) => p.id === id)

  // Kuponu, talep anindaki govdenin aynisiyla yeniden imzaliyoruz: nonce ve
  // tarih degismedigi icin ortaya cikan kod ilk uretilenle birebir ayni olur.
  useEffect(() => {
    const key = getKey()
    if (!key || !pending) return
    let alive = true
    void encode(key, {
      t: 'rq',
      r: role,
      c: pending.currency,
      a: pending.cost,
      m: pending.title,
      e: pending.emoji,
      n: pending.id,
      d: pending.ts,
    }).then((text) => {
      if (alive) setCoupon(text)
    })
    return () => {
      alive = false
    }
  }, [pending, role])

  if (!pending) return null

  return (
    <div className="stack" style={{ marginTop: 14 }}>
      {coupon && <QrView value={coupon} shareTitle={`Ödül talebi: ${pending.title}`} />}
      <button
        type="button"
        className="btn btn--danger btn--sm btn--block"
        onClick={() => {
          cancelPending(id)
          onCancel()
        }}
      >
        Talebi iptal et, puanı serbest bırak
      </button>
    </div>
  )
}
