import { useCallback, useEffect, useRef, useState } from 'react'
import { Coin } from '../components/Coin'
import { Confetti } from '../components/Confetti'
import { QrView } from '../components/QrView'
import { Scanner } from '../components/Scanner'
import { decode, encode, makeApproval, type CouponBody, type RequestBody } from '../lib/coupon'
import { formatPoints } from '../lib/format'
import {
  creditAward,
  getKey,
  isSeen,
  logApprovedRedemption,
  setRewards,
  settleRedemption,
} from '../lib/store'
import { CURRENCY_LABEL, ROLE_LABEL, issuedCurrency, otherRole, type Identity } from '../lib/types'

type View =
  | { k: 'scan' }
  | { k: 'error'; message: string }
  | { k: 'credited'; amount: number; currency: Identity['role']; note: string }
  | { k: 'ask'; body: RequestBody }
  | { k: 'approved'; coupon: string; body: RequestBody }
  | { k: 'settled'; title: string; cost: number }
  | { k: 'catalog'; count: number }

interface Props {
  identity: Identity
  /** Kamera uygulamasindan gelen baglantidaki kupon — kamerayi hic acmadan islenir. */
  incomingCode?: string | null
  onCodeUsed?: () => void
}

export function Scan({ identity, incomingCode, onCodeUsed }: Props) {
  const [view, setView] = useState<View>({ k: 'scan' })
  const handledRef = useRef<string | null>(null)

  const handle = useCallback(
    async (text: string) => {
      const key = getKey()
      if (!key) return setView({ k: 'error', message: 'Cihaz kilitli.' })

      const parsed = await decode(key, text)
      if (!parsed.ok) return setView({ k: 'error', message: parsed.reason })

      const body: CouponBody = parsed.body

      if (body.t === 'aw') {
        if (body.c === issuedCurrency(identity.role)) {
          return setView({
            k: 'error',
            message: 'Bu sizin kendi kestiğiniz kupon. Kendi kuponunuzu kendiniz kullanamazsınız 🙂',
          })
        }
        if (isSeen(body.n)) {
          return setView({ k: 'error', message: 'Bu kupon zaten kullanılmış.' })
        }
        creditAward(body.n, body.c, body.a, body.m, body.d)
        return setView({ k: 'credited', amount: body.a, currency: body.c, note: body.m })
      }

      if (body.t === 'rq') {
        if (body.r === identity.role) {
          return setView({ k: 'error', message: 'Bu sizin kendi ödül talebiniz. Eşiniz onaylamalı.' })
        }
        if (isSeen(body.n)) {
          return setView({ k: 'error', message: 'Bu talep zaten yanıtlanmış.' })
        }
        return setView({ k: 'ask', body })
      }

      if (body.t === 'ok') {
        const settled = settleRedemption(body.n)
        if (!settled) {
          return setView({
            k: 'error',
            message: 'Bu onaya karşılık bekleyen bir ödül talebi bulunamadı. Zaten işlenmiş olabilir.',
          })
        }
        return setView({ k: 'settled', title: `${settled.emoji} ${settled.title}`, cost: settled.cost })
      }

      setRewards(body.r)
      return setView({ k: 'catalog', count: body.r.length })
    },
    [identity.role],
  )

  // Baglantiyla gelen kupon kamera acilmadan islenir; adresten ancak burada silinir.
  // Kilit (handledRef) yalnizca ayni kuponun tek seferde iki kez islenmesini
  // engeller ve kupon tuketilince acilir — ayni baglantiya tekrar dokunuldugunda
  // sessiz kalmak yerine "zaten kullanilmis" diyebilmesi icin.
  useEffect(() => {
    if (!incomingCode) {
      handledRef.current = null
      return
    }
    if (handledRef.current === incomingCode) return
    handledRef.current = incomingCode
    void handle(incomingCode).finally(() => onCodeUsed?.())
  }, [incomingCode, handle, onCodeUsed])

  const approve = async (body: RequestBody) => {
    const key = getKey()
    if (!key) return setView({ k: 'error', message: 'Cihaz kilitli.' })
    const coupon = await encode(key, makeApproval(body.n))
    logApprovedRedemption(body.n, body.c, body.a, `${body.e} ${body.m}`)
    setView({ k: 'approved', coupon, body })
  }

  const again = () => setView({ k: 'scan' })

  if (view.k === 'scan') {
    return (
      <div className="screen">
        <div className="screen-head">
          <div>
            <h1>Tara</h1>
            <p>Kupon, ödül talebi veya onay karekodu</p>
          </div>
        </div>
        <Scanner onScan={(t) => void handle(t)} />
      </div>
    )
  }

  if (view.k === 'error') {
    return (
      <div className="screen screen--plain">
        <div className="stack center">
          <div className="hero-emoji">🤔</div>
          <h1>Olmadı</h1>
          <div className="note note--bad">{view.message}</div>
          <button type="button" className="btn btn--primary btn--block" onClick={again}>
            Tekrar dene
          </button>
        </div>
      </div>
    )
  }

  if (view.k === 'credited') {
    return (
      <div className="screen screen--plain">
        <Confetti />
        <div className="stack center">
          <Coin currency={view.currency} size={110} pop />
          <h1>+{formatPoints(view.amount)}</h1>
          <p className="balance__label">{CURRENCY_LABEL[view.currency]} hesabınıza eklendi</p>
          {view.note && <p className="muted">“{view.note}”</p>}
          <button type="button" className="btn btn--primary btn--block" onClick={again}>
            Harika
          </button>
        </div>
      </div>
    )
  }

  if (view.k === 'ask') {
    const b = view.body
    return (
      <div className="screen screen--plain">
        <div className="stack center">
          <div className="hero-emoji">{b.e}</div>
          <h1>{ROLE_LABEL[b.r]} ödül istiyor</h1>
          <p className="muted">
            <strong>{b.m}</strong>
            <br />
            {formatPoints(b.a)} {CURRENCY_LABEL[b.c]} karşılığında
          </p>
        </div>
        <div className="stack" style={{ marginTop: 24 }}>
          <button type="button" className="btn btn--primary btn--block" onClick={() => void approve(b)}>
            ✅ Onayla
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={again}>
            Şimdi olmaz
          </button>
          <p className="muted tiny center">
            Onaylamazsanız puanı düşmez; talebi eşiniz kendi telefonundan iptal edebilir.
          </p>
        </div>
      </div>
    )
  }

  if (view.k === 'approved') {
    return (
      <div className="screen">
        <div className="screen-head">
          <div>
            <h1>Onay kuponu</h1>
            <p>{ROLE_LABEL[otherRole(identity.role)]} bunu okutunca puanı düşecek.</p>
          </div>
        </div>
        <div className="card stack center">
          <div className="hero-emoji">{view.body.e}</div>
          <strong>{view.body.m}</strong>
          <span className="muted">
            −{formatPoints(view.body.a)} {CURRENCY_LABEL[view.body.c]}
          </span>
        </div>
        <QrView value={view.coupon} shareTitle="Ödül onayı" />
        <button type="button" className="btn btn--block" onClick={again}>
          Bitti
        </button>
      </div>
    )
  }

  if (view.k === 'settled') {
    return (
      <div className="screen screen--plain">
        <Confetti />
        <div className="stack center">
          <div className="hero-emoji">🎉</div>
          <h1>Ödül sizin!</h1>
          <p className="muted">
            <strong>{view.title}</strong>
            <br />
            {formatPoints(view.cost)} puan düşüldü.
          </p>
          <button type="button" className="btn btn--primary btn--block" onClick={again}>
            Tamam
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen screen--plain">
      <div className="stack center">
        <div className="hero-emoji">📋</div>
        <h1>Katalog güncellendi</h1>
        <p className="muted">{view.count} ödül eşinizin listesiyle eşitlendi.</p>
        <button type="button" className="btn btn--primary btn--block" onClick={again}>
          Tamam
        </button>
      </div>
    </div>
  )
}
