// base64url yardimcilari — QR ve metin kodu icinde '+' '/' '=' istemiyoruz.

export function bytesToB64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function textToB64url(s: string): string {
  return bytesToB64url(new TextEncoder().encode(s))
}

export function b64urlToText(s: string): string {
  return new TextDecoder().decode(b64urlToBytes(s))
}
