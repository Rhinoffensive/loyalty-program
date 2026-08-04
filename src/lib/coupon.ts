// Kupon bicimi:  KP1.<base64url(json)>.<imza>
// Eslestirme:    KP1P.<base64url(json)>      (imzasiz — karsi tarafta henuz anahtar yok)
//
// Kuponlar hem QR olarak hem de duz metin olarak tasinabilir; metin hali
// WhatsApp'tan yollanabildigi icin kamera calismasa da (ve ayni odada
// olunmasa da) puan verilebiliyor.

import { b64urlToText, textToB64url } from './base64'
import { newNonce, sign, verify } from './crypto'
import type { Reward, Role } from './types'

const PREFIX = 'KP1.'
const PAIR_PREFIX = 'KP1P.'
/** Bu suredan eski kuponlar reddedilir; kullanilmis kimlikler de bu yasta budanir. */
export const COUPON_TTL_MS = 14 * 24 * 60 * 60 * 1000
/** Saat farklarina tolerans. */
const CLOCK_SKEW_MS = 24 * 60 * 60 * 1000

export interface AwardBody {
  t: 'aw'
  /** Para birimi = kuponu basan kisinin rolu. */
  c: Role
  a: number
  m: string
  n: string
  d: number
}

export interface RequestBody {
  t: 'rq'
  /** Talebi yapan kisinin rolu. */
  r: Role
  c: Role
  a: number
  m: string
  e: string
  n: string
  d: number
}

export interface ApprovalBody {
  t: 'ok'
  n: string
  d: number
}

export interface CatalogBody {
  t: 'cat'
  r: Reward[]
  d: number
}

export type CouponBody = AwardBody | RequestBody | ApprovalBody | CatalogBody

async function pack(key: Uint8Array, body: CouponBody): Promise<string> {
  const json = JSON.stringify(body)
  const payload = textToB64url(json)
  return PREFIX + payload + '.' + (await sign(key, payload))
}

export function makeAward(role: Role, amount: number, note: string): AwardBody {
  return { t: 'aw', c: role, a: amount, m: note.trim().slice(0, 120), n: newNonce(), d: Date.now() }
}

export function makeRequest(role: Role, currency: Role, reward: Reward): RequestBody {
  return {
    t: 'rq',
    r: role,
    c: currency,
    a: reward.cost,
    m: reward.title.slice(0, 120),
    e: reward.emoji,
    n: newNonce(),
    d: Date.now(),
  }
}

export function makeApproval(requestId: string): ApprovalBody {
  return { t: 'ok', n: requestId, d: Date.now() }
}

export function makeCatalog(rewards: Reward[]): CatalogBody {
  return { t: 'cat', r: rewards, d: Date.now() }
}

export function encode(key: Uint8Array, body: CouponBody): Promise<string> {
  return pack(key, body)
}

export function encodePairing(payload: unknown): string {
  return PAIR_PREFIX + textToB64url(JSON.stringify(payload))
}

export type ParseResult =
  | { ok: true; body: CouponBody }
  | { ok: false; reason: string }

/** Metni cozer, imzayi ve tazeligi dogrular. */
export async function decode(key: Uint8Array, text: string): Promise<ParseResult> {
  const raw = text.trim()
  if (!raw.startsWith(PREFIX)) {
    return {
      ok: false,
      reason: raw.startsWith(PAIR_PREFIX)
        ? 'Bu bir eşleştirme kodu, kupon değil. Eşleştirme kurulumda kullanılır.'
        : 'Bu bir puan kuponu değil.',
    }
  }
  const parts = raw.slice(PREFIX.length).split('.')
  if (parts.length !== 2) return { ok: false, reason: 'Kupon bozuk görünüyor.' }
  const [payload, signature] = parts

  if (!(await verify(key, payload, signature))) {
    return { ok: false, reason: 'Geçersiz kupon: imza tutmuyor. Farklı bir PIN ile üretilmiş olabilir.' }
  }

  let body: CouponBody
  try {
    body = JSON.parse(b64urlToText(payload)) as CouponBody
  } catch {
    return { ok: false, reason: 'Kupon okunamadı.' }
  }

  const age = Date.now() - body.d
  if (age > COUPON_TTL_MS) return { ok: false, reason: 'Bu kuponun süresi dolmuş (14 günden eski).' }
  if (age < -CLOCK_SKEW_MS) return { ok: false, reason: 'Kuponun tarihi ileride görünüyor. Cihaz saatini kontrol edin.' }

  return { ok: true, body }
}

/** Eslestirme kodunu cozer (imzasiz — dogrulugu PIN kontrolu ile kanitlanir). */
export function decodePairing(text: string): unknown | null {
  const raw = text.trim()
  if (!raw.startsWith(PAIR_PREFIX)) return null
  try {
    return JSON.parse(b64urlToText(raw.slice(PAIR_PREFIX.length)))
  } catch {
    return null
  }
}
