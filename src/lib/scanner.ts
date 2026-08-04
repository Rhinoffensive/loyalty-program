// QR okuma: once tarayicinin yerlesik BarcodeDetector API'si denenir
// (Android Chrome'da yerlidir, hizli ve pilsiz), desteklenmiyorsa
// @zxing/browser'a dusulur (iOS Safari bu yolu kullanir).

export interface ScannerHandle {
  stop: () => void
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
}

type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike

function nativeDetector(): BarcodeDetectorCtor | null {
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  return typeof ctor === 'function' ? ctor : null
}

export function cameraUnavailableReason(): string | null {
  if (!window.isSecureContext) {
    return 'Kamera yalnızca güvenli bağlantıda (HTTPS) çalışır. Yayındaki adresi kullanın ya da aşağıdan kodu yapıştırın.'
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'Bu tarayıcı kamera erişimini desteklemiyor. Aşağıdan kodu yapıştırabilirsiniz.'
  }
  return null
}

function permissionMessage(err: unknown): string {
  const name = (err as { name?: string })?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Kamera izni verilmedi. Tarayıcı ayarlarından izin verin ya da aşağıdan kodu yapıştırın.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Kullanılabilir bir kamera bulunamadı. Aşağıdan kodu yapıştırabilirsiniz.'
  }
  if (name === 'NotReadableError') {
    return 'Kamera başka bir uygulama tarafından kullanılıyor olabilir.'
  }
  return 'Kamera açılamadı. Aşağıdan kodu yapıştırabilirsiniz.'
}

/**
 * Kamerayi acar ve ilk gecerli okumada onResult cagirir.
 * Donen handle ile durdurulur; ekran kapanirken mutlaka cagrilmali.
 */
export async function startScanner(
  video: HTMLVideoElement,
  onResult: (text: string) => void,
  onError: (message: string) => void,
): Promise<ScannerHandle> {
  const blocked = cameraUnavailableReason()
  if (blocked) {
    onError(blocked)
    return { stop: () => {} }
  }

  let stopped = false
  let stream: MediaStream | null = null
  let rafId = 0
  let zxingControls: { stop: () => void } | null = null

  const stop = () => {
    stopped = true
    if (rafId) cancelAnimationFrame(rafId)
    zxingControls?.stop()
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
  }

  const Detector = nativeDetector()

  if (Detector) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop())
        return { stop }
      }
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play()

      const detector = new Detector({ formats: ['qr_code'] })
      const tick = async () => {
        if (stopped) return
        try {
          if (video.readyState >= 2) {
            const found = await detector.detect(video)
            if (found.length > 0 && found[0].rawValue) {
              onResult(found[0].rawValue)
              return
            }
          }
        } catch {
          // Tek kare hatasi onemli degil, taramaya devam.
        }
        rafId = requestAnimationFrame(() => void tick())
      }
      void tick()
      return { stop }
    } catch (err) {
      stop()
      stopped = false
      onError(permissionMessage(err))
      return { stop }
    }
  }

  // Yerlesik API yoksa ZXing'e dus (iOS Safari).
  try {
    const { BrowserQRCodeReader } = await import('@zxing/browser')
    if (stopped) return { stop }
    const reader = new BrowserQRCodeReader()
    zxingControls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
      if (stopped || !result) return
      onResult(result.getText())
    })
    if (stopped) zxingControls.stop()
  } catch (err) {
    stop()
    onError(permissionMessage(err))
  }

  return { stop }
}
