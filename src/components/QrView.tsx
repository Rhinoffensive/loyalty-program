import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  value: string
  /** Kamera calismazsa metin olarak paylasilabilsin diye. */
  shareTitle?: string
}

/**
 * QR + "kodu kopyala/paylas". Metin yolu bilincli olarak var: kamera
 * bozulsa da, ayni odada olunmasa da kupon WhatsApp'tan gecebiliyor.
 */
export function QrView({ value, shareTitle = 'Puan kuponu' }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showCode, setShowCode] = useState(false)

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(value, { margin: 1, width: 560, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (alive) setSrc(url)
      })
      .catch((err) => console.error('QR üretilemedi', err))
    return () => {
      alive = false
    }
  }, [value])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setShowCode(true)
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title: shareTitle, text: value })
    } catch {
      /* kullanici vazgecti */
    }
  }

  return (
    <div className="stack">
      <div className="qr">
        {src ? <img src={src} alt="Kupon karekodu" /> : <p className="muted">Karekod hazırlanıyor…</p>}
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn--ghost btn--sm" onClick={copy}>
          {copied ? '✓ Kopyalandı' : '📋 Kodu kopyala'}
        </button>
        {typeof navigator.share === 'function' && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={share}>
            📤 Gönder
          </button>
        )}
      </div>

      {showCode ? (
        <div className="field">
          <label>Kupon kodu (elle kopyalayın)</label>
          <textarea className="input input--code" readOnly rows={4} value={value} onFocus={(e) => e.target.select()} />
        </div>
      ) : (
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowCode(true)}>
          Kodu metin olarak göster
        </button>
      )}
    </div>
  )
}
