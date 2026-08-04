import { useEffect, useRef, useState } from 'react'
import { cameraUnavailableReason, startScanner, type ScannerHandle } from '../lib/scanner'

interface Props {
  onScan: (text: string) => void
  /** Kamera altinda gorunen aciklama. */
  hint?: string
  pasteLabel?: string
}

/**
 * Kamera + elle kod yapistirma. Ikisi de ayni onScan'i besler; kamera
 * calismadiginda (izin yok, HTTPS yok, cihazda kamera yok) metin yolu kalir.
 */
export function Scanner({ onScan, hint, pasteLabel = 'Kupon kodunu yapıştır' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const handleRef = useRef<ScannerHandle | null>(null)
  const firedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState(() => cameraUnavailableReason() !== null)
  const [pasted, setPasted] = useState('')

  useEffect(() => {
    if (manual) return
    const video = videoRef.current
    if (!video) return

    let cancelled = false
    void startScanner(
      video,
      (text) => {
        if (firedRef.current) return
        firedRef.current = true
        handleRef.current?.stop()
        onScan(text)
      },
      (message) => {
        if (!cancelled) {
          setError(message)
          setManual(true)
        }
      },
    ).then((h) => {
      handleRef.current = h
      if (cancelled) h.stop()
    })

    return () => {
      cancelled = true
      handleRef.current?.stop()
      handleRef.current = null
    }
  }, [manual, onScan])

  return (
    <div className="stack">
      {!manual && (
        <>
          <div className="scanner">
            <video ref={videoRef} muted playsInline />
            <div className="scanner__frame" />
          </div>
          <p className="muted tiny center">{hint ?? 'Karekodu çerçevenin içine alın.'}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setManual(true)}>
            Kamera yerine kodu yapıştır
          </button>
        </>
      )}

      {manual && (
        <>
          {error && <div className="note note--bad">{error}</div>}
          <div className="field">
            <label>{pasteLabel}</label>
            <textarea
              className="input input--code"
              rows={4}
              value={pasted}
              placeholder="KP1..."
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setPasted(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={pasted.trim().length < 8}
            onClick={() => onScan(pasted.trim())}
          >
            Kodu kullan
          </button>
          {cameraUnavailableReason() === null && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setError(null)
                firedRef.current = false
                setManual(false)
              }}
            >
              Kamerayı tekrar dene
            </button>
          )}
        </>
      )}
    </div>
  )
}
