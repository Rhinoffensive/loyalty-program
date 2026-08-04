// Tum kripto isleri tarayicinin yerlesik Web Crypto API'si ile.
//
// Tasarim notu (onemli): GitHub Pages ucretsiz katmani repoyu public yapmayi
// zorunlu kiliyor, yani paketi herkes indirebilir. Bu yuzden PIN'in dogrulama
// degeri (check) KODA GOMULMEZ — sadece eslesmis cihazlarin localStorage'inda
// durur ve ikinci cihaza bir kerelik "eslestirme QR'i" ile elden gecer.
// Siteyi bulan bir yabanci offline kirabilecegi hicbir materyal bulamaz.

import { bytesToB64url, b64urlToBytes } from './base64'

const PBKDF2_ITERATIONS = 600_000
const CHECK_CONTEXT = 'kp-check-v1'
/** Kupon imzasinin kisaltildigi uzunluk (bayt). 16 bayt = 128 bit, fazlasiyla yeterli. */
const SIG_BYTES = 16

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n)
  crypto.getRandomValues(b)
  return b
}

/** Yeni bir cihaz kurulumu icin rastgele tuz uretir. */
export function newSalt(): string {
  return bytesToB64url(randomBytes(16))
}

/**
 * PIN + tuz -> 256 bitlik ana anahtar.
 * 600k iterasyon telefonda ~1-2 saniye surer; bu yavaslik kasitlidir.
 */
export async function deriveKey(pin: string, saltB64: string): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin.trim()),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: b64urlToBytes(saltB64) as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    256,
  )
  return new Uint8Array(bits)
}

/**
 * Anahtardan dogrulama degeri uretir. Anahtarin kendisini ele vermez
 * (tek yonlu hash), bu yuzden eslestirme QR'inda tasinmasi guvenlidir.
 */
export async function checkValue(key: Uint8Array): Promise<string> {
  const msg = new Uint8Array(key.length + CHECK_CONTEXT.length)
  msg.set(key, 0)
  msg.set(new TextEncoder().encode(CHECK_CONTEXT), key.length)
  const digest = await crypto.subtle.digest('SHA-256', msg as unknown as BufferSource)
  return bytesToB64url(new Uint8Array(digest))
}

async function hmacKey(key: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    key as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

/** Kupon govdesini imzalar. Donen deger base64url, kisaltilmis HMAC-SHA256. */
export async function sign(key: Uint8Array, message: string): Promise<string> {
  const k = await hmacKey(key)
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(message))
  return bytesToB64url(new Uint8Array(sig).slice(0, SIG_BYTES))
}

/** Imzayi sabit zamanli olarak dogrular (zamanlama sizintisi olmasin). */
export async function verify(key: Uint8Array, message: string, signature: string): Promise<boolean> {
  const expected = await sign(key, message)
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return diff === 0
}

/** Kupon/islem kimligi — cakisma ihtimali yok denecek kadar dusuk. */
export function newNonce(): string {
  return bytesToB64url(randomBytes(9))
}
