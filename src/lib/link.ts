// Kuponlari duz "KP1..." metni yerine uygulama adresine gomulu bir baglanti
// olarak tasiyoruz:
//
//   https://<adres>/#k=KP1....
//
// Boylece telefonun VARSAYILAN kamera uygulamasi karekodu okudugunda bir
// baglanti gorur ve dokununca uygulamayi acar — once uygulamayi acip "Tara"
// demeye gerek kalmaz. Ana ekrana eklenmisse Android baglantiyi kurulu
// uygulamada acar; degilse tarayicida acilir, sonuc ayni.
//
// Kupon bilincli olarak adresin ONUNDE degil DIYEZ (#) kisminda durur:
// diyezden sonrasi hicbir zaman sunucuya gonderilmez, yani kuponlariniz
// GitHub'in sunucu kayitlarina dusmez.

const HASH_KEY = 'k'

/** Uygulamanin kok adresi (Pages'te /loyalty-program/ alt yolu dahil). */
function appRoot(): string {
  return new URL(import.meta.env.BASE_URL, location.origin).href
}

/** Kupon metnini paylasilabilir bir baglantiya cevirir. */
export function couponLink(code: string): string {
  return `${appRoot()}#${HASH_KEY}=${encodeURIComponent(code)}`
}

/**
 * Okunan/yapistirilan metinden kupon govdesini cikarir. Hem duz "KP1..."
 * metnini hem de tam baglantiyi kabul eder — eski karekodlar da calismaya
 * devam etsin ve WhatsApp'tan gelen baglanti elle yapistirilabilsin diye.
 */
export function extractCode(text: string): string {
  const raw = text.trim()
  if (raw.startsWith('KP1')) return raw
  const match = /[#&?]k=([^&\s]+)/.exec(raw)
  return match ? decodeURIComponent(match[1]) : raw
}

/** Eslestirme kodu mu, yoksa puan kuponu mu? Ikisi ayri ekranlara gidiyor. */
export function isPairingCode(code: string): boolean {
  return code.startsWith('KP1P.')
}

/** Adresin diyez kisminda bekleyen kupon varsa dondurur. */
export function readIncomingCode(): string | null {
  const match = /[#&]k=([^&]+)/.exec(location.hash)
  if (!match) return null
  const code = decodeURIComponent(match[1]).trim()
  return code.startsWith('KP1') ? code : null
}

/**
 * Kuponu adresten siler. Bilincli olarak ancak kupon gercekten islendikten
 * sonra cagriliyor: cihaz kilitliyken sayfa yenilenirse kupon kaybolmasin.
 */
export function clearIncomingCode(): void {
  history.replaceState(null, '', location.pathname + location.search)
}
