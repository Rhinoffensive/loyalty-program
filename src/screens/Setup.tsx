import { useEffect, useState } from 'react'
import { Coin } from '../components/Coin'
import { PinField, isValidPin, PIN_MIN, PIN_MAX } from '../components/PinField'
import { Scanner } from '../components/Scanner'
import { decodePairing } from '../lib/coupon'
import { pairDevice, setupFirstDevice, type PairingPayload } from '../lib/store'
import { ROLE_LABEL, type Role } from '../lib/types'

type Mode = 'welcome' | 'first' | 'pair-scan' | 'pair-pin'

function isPairingPayload(v: unknown): v is PairingPayload {
  if (typeof v !== 'object' || v === null) return false
  const p = v as Record<string, unknown>
  return p.t === 'pair' && typeof p.salt === 'string' && typeof p.check === 'string' &&
    (p.role === 'kocis' || p.role === 'karicik')
}

interface Props {
  /** Kamera uygulamasindan gelen baglantidaki kod. Eslestirme koduysa dogrudan PIN adimina atlanir. */
  incomingCode?: string | null
  onCodeUsed?: () => void
}

export function Setup({ incomingCode, onCodeUsed }: Props) {
  // Eslestirme baglantisiyla gelindiyse karekod okutma adimini atla: telefon
  // zaten karekodu okuyup buraya geldi, tekrar okutmak sacma olur.
  const incomingPairing = incomingCode ? decodePairing(incomingCode) : null
  const arrivedByPairingLink = isPairingPayload(incomingPairing)

  const [mode, setMode] = useState<Mode>(arrivedByPairingLink ? 'pair-pin' : 'welcome')
  const [role, setRole] = useState<Role>('kocis')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [payload, setPayload] = useState<PairingPayload | null>(
    arrivedByPairingLink ? incomingPairing : null,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Rol secilirken tema da degissin ki hangi renk kimin, kurulumda anlasilsin.
  useEffect(() => {
    if (mode === 'first') document.documentElement.dataset.role = role
    else delete document.documentElement.dataset.role
  }, [mode, role])

  const createFirst = async () => {
    if (!isValidPin(pin)) return setError(`PIN ${PIN_MIN}-${PIN_MAX} haneli olmalı.`)
    if (pin !== pin2) return setError('İki PIN aynı değil.')
    setError(null)
    setBusy(true)
    try {
      await setupFirstDevice(role, pin)
    } catch (err) {
      console.error(err)
      setError('Kurulum tamamlanamadı.')
    } finally {
      setBusy(false)
    }
  }

  const onPairScan = (text: string) => {
    const decoded = decodePairing(text)
    if (!isPairingPayload(decoded)) {
      setError('Bu bir eşleştirme kodu değil. Eşinizin telefonunda Ayarlar > Eşleştirme Kodu ekranını açın.')
      return
    }
    setError(null)
    setPayload(decoded)
    setMode('pair-pin')
  }

  const finishPair = async () => {
    if (!payload) return
    if (!isValidPin(pin)) return setError(`PIN ${PIN_MIN}-${PIN_MAX} haneli olmalı.`)
    setError(null)
    setBusy(true)
    try {
      const ok = await pairDevice(payload, pin)
      if (ok) onCodeUsed?.()
      else setError('PIN eşleşmedi. Eşinizin belirlediği PIN’i girin.')
    } catch (err) {
      console.error(err)
      setError('Eşleştirme tamamlanamadı.')
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'welcome') {
    return (
      <div className="screen screen--plain">
        <div className="stack center">
          <div className="row" style={{ justifyContent: 'center' }}>
            <Coin currency="kocis" size={72} float />
            <Coin currency="karicik" size={72} float />
          </div>
          <h1>Kociş &amp; Karıcık Puan Programı</h1>
          <p className="muted">
            Ev içi sadakat programınıza hoş geldiniz. Rica ettiğiniz her iş puan kazandırır, biriken puanlar
            ödüle dönüşür.
          </p>
        </div>

        {incomingCode && !arrivedByPairingLink && (
          <div className="note" style={{ marginTop: 20 }}>
            🎁 Bir kupon bağlantısıyla geldiniz, ama bu telefon henüz programa katılmamış. Önce eşinizin
            telefonundaki <strong>Eşleştirme Kodu</strong> ile eşleşin; kuponu sonra tekrar açın.
          </div>
        )}

        <div className="stack" style={{ marginTop: 24 }}>
          <button type="button" className="btn btn--primary btn--block" onClick={() => setMode('first')}>
            İlk kez kuruyorum
          </button>
          <button type="button" className="btn btn--block" onClick={() => setMode('pair-scan')}>
            Eşimin telefonuyla eşleştir
          </button>
        </div>

        <p className="muted tiny center" style={{ marginTop: 16 }}>
          Puanlar yalnızca sizin telefonlarınızda saklanır. Sunucu yok, hesap yok.
        </p>
      </div>
    )
  }

  if (mode === 'first') {
    return (
      <div className="screen">
        <div className="screen-head">
          <h1>Kurulum</h1>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setMode('welcome')}>
            Geri
          </button>
        </div>

        <div className="card stack">
          <h3>Bu telefon kimin?</h3>
          <div className="role-pick">
            {(['kocis', 'karicik'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`role-card${role === r ? ' role-card--on' : ''}`}
                onClick={() => setRole(r)}
              >
                <Coin currency={r} size={56} />
                <strong>{ROLE_LABEL[r]}</strong>
                <span className="muted tiny">{ROLE_LABEL[r]} Puanı verir</span>
              </button>
            ))}
          </div>
          <p className="muted tiny">
            Kendi adınızı taşıyan puanı siz verirsiniz; cüzdanınızda ise eşinizin puanı birikir.
          </p>
        </div>

        <div className="card stack">
          <h3>Ortak PIN</h3>
          <p className="muted tiny">
            İkiniz de aynı PIN’i kullanacaksınız. Bir kere girilir, sonra bu telefonda bir daha sorulmaz.
          </p>
          <PinField label={`PIN (${PIN_MIN}-${PIN_MAX} hane)`} value={pin} onChange={setPin} autoFocus />
          <PinField label="PIN tekrar" value={pin2} onChange={setPin2} onEnter={createFirst} />
          {error && <div className="note note--bad">{error}</div>}
          <button type="button" className="btn btn--primary btn--block" disabled={busy} onClick={createFirst}>
            {busy ? <span className="spinner" /> : 'Programı başlat'}
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'pair-scan') {
    return (
      <div className="screen">
        <div className="screen-head">
          <h1>Eşleştir</h1>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setMode('welcome')}>
            Geri
          </button>
        </div>
        <div className="note">
          Eşinizin telefonunda <strong>Ayarlar → Eşleştirme Kodu</strong>’nu açın ve oradaki karekodu okutun.
        </div>
        {error && <div className="note note--bad">{error}</div>}
        <Scanner
          onScan={onPairScan}
          hint="Eşleştirme karekodunu çerçeveye alın."
          pasteLabel="Eşleştirme kodunu yapıştır"
        />
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>Ortak PIN</h1>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setMode(arrivedByPairingLink ? 'welcome' : 'pair-scan')}
        >
          Geri
        </button>
      </div>
      <div className="card stack">
        {arrivedByPairingLink && (
          <div className="note note--good">
            🔗 Eşleştirme bağlantısı tanındı. Son bir adım kaldı.
          </div>
        )}
        <p className="muted tiny">
          Eşiniz kurulumda hangi PIN’i belirlediyse onu girin. PIN doğruysa iki telefon aynı anahtarı üretir
          ve kuponlar birbirini tanır.
        </p>
        <PinField label="PIN" value={pin} onChange={setPin} autoFocus onEnter={finishPair} />
        {error && <div className="note note--bad">{error}</div>}
        <button type="button" className="btn btn--primary btn--block" disabled={busy} onClick={finishPair}>
          {busy ? <span className="spinner" /> : 'Eşleştirmeyi tamamla'}
        </button>
      </div>
    </div>
  )
}
