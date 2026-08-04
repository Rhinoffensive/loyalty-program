import { useSyncExternalStore } from 'react'
import { bytesToB64url, b64urlToBytes } from './base64'
import { checkValue, deriveKey, newSalt, randomBytes } from './crypto'
import { COUPON_TTL_MS } from './coupon'
import { DEFAULT_REWARDS } from '../config/rewards'
import type { AppState, LedgerEntry, PendingRedemption, Reward, Role } from './types'
import { heldCurrency } from './types'

const STORAGE_KEY = 'kp.state.v1'

/** Yedek hatirlaticisinin cikma araligi. */
export const BACKUP_REMINDER_MS = 30 * 24 * 60 * 60 * 1000

function emptyState(): AppState {
  return {
    version: 1,
    identity: null,
    salt: null,
    check: null,
    keyB64: null,
    balances: { kocis: 0, karicik: 0 },
    ledger: [],
    seen: [],
    rewards: DEFAULT_REWARDS.map((r) => ({ ...r })),
    pending: [],
    lastBackup: null,
  }
}

function read(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<AppState>
    // Eksik alanlari varsayilanla tamamla — eski surumden gelen kayitlar patlamasin.
    return { ...emptyState(), ...parsed, balances: { ...emptyState().balances, ...parsed.balances } }
  } catch {
    return emptyState()
  }
}

let state: AppState = typeof localStorage === 'undefined' ? emptyState() : read()
const listeners = new Set<() => void>()

function commit(next: AppState) {
  state = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch (err) {
    console.error('Durum kaydedilemedi', err)
  }
  listeners.forEach((l) => l())
}

function update(fn: (s: AppState) => AppState) {
  commit(fn(state))
}

export function getState(): AppState {
  return state
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Bilesenlerin duruma abone olmasi icin. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState)
}

// --- Kimlik ve kurulum -------------------------------------------------------

function newMemberNo(role: Role): string {
  const prefix = role === 'kocis' ? '10' : '20'
  const digits = Array.from(randomBytes(11), (b) => (b % 10).toString()).join('')
  return prefix + digits
}

/** Ilk cihaz: rol + PIN ile programi baslatir. */
export async function setupFirstDevice(role: Role, pin: string): Promise<void> {
  const salt = newSalt()
  const key = await deriveKey(pin, salt)
  const check = await checkValue(key)
  update((s) => ({
    ...s,
    identity: { role, memberNo: newMemberNo(role), deviceId: bytesToB64url(randomBytes(6)), since: Date.now() },
    salt,
    check,
    keyB64: bytesToB64url(key),
  }))
}

/**
 * Eslestirme QR'i bilincli olarak kucuk tutulur: icine odul katalogu
 * konmaz, cunku uzun icerik QR'i cok yogunlastirip telefonla okunmasini
 * zorlastiriyor. Katalog zaten iki tarafta da ayni varsayilanla basliyor,
 * degistirilirse "Katalogu esimle esitle" ile aktariliyor.
 */
export interface PairingPayload {
  t: 'pair'
  salt: string
  check: string
  /** QR'i olusturan cihazin rolu; karsi taraf otomatik olarak digerini alir. */
  role: Role
}

/** Ikinci cihaz: eslestirme QR'indaki tuz/dogrulama degeriyle ayni anahtari turetir. */
export async function pairDevice(payload: PairingPayload, pin: string): Promise<boolean> {
  const key = await deriveKey(pin, payload.salt)
  const check = await checkValue(key)
  if (check !== payload.check) return false
  const role: Role = payload.role === 'kocis' ? 'karicik' : 'kocis'
  update((s) => ({
    ...s,
    identity: { role, memberNo: newMemberNo(role), deviceId: bytesToB64url(randomBytes(6)), since: Date.now() },
    salt: payload.salt,
    check: payload.check,
    keyB64: bytesToB64url(key),
  }))
  return true
}

export function pairingPayload(): PairingPayload | null {
  if (!state.salt || !state.check || !state.identity) return null
  return { t: 'pair', salt: state.salt, check: state.check, role: state.identity.role }
}

/** Kilitli cihazda PIN dogrular ve anahtari geri yukler. */
export async function unlock(pin: string): Promise<boolean> {
  if (!state.salt || !state.check) return false
  const key = await deriveKey(pin, state.salt)
  if ((await checkValue(key)) !== state.check) return false
  update((s) => ({ ...s, keyB64: bytesToB64url(key) }))
  return true
}

/** Cihaz token'ini siler; veri durur, tekrar PIN sorulur. */
export function lock(): void {
  update((s) => ({ ...s, keyB64: null }))
}

export function getKey(): Uint8Array | null {
  return state.keyB64 ? b64urlToBytes(state.keyB64) : null
}

export function resetDevice(): void {
  localStorage.removeItem(STORAGE_KEY)
  commit(emptyState())
}

// --- Bakiye ve defter --------------------------------------------------------

function pruneSeen(seen: AppState['seen']): AppState['seen'] {
  const cutoff = Date.now() - COUPON_TTL_MS
  return seen.filter((e) => e.ts > cutoff)
}

export function isSeen(nonce: string): boolean {
  return pruneSeen(state.seen).some((e) => e.n === nonce)
}

function withSeen(s: AppState, nonce: string): AppState {
  return { ...s, seen: [...pruneSeen(s.seen), { n: nonce, ts: Date.now() }] }
}

function addEntry(s: AppState, entry: LedgerEntry): AppState {
  return { ...s, ledger: [entry, ...s.ledger].slice(0, 500) }
}

/** Kupon okundu: puan cuzdana eklenir, kupon kimligi kullanilmis isaretlenir. */
export function creditAward(nonce: string, currency: Role, amount: number, note: string, ts: number): void {
  update((s) => {
    let next = withSeen(s, nonce)
    next = { ...next, balances: { ...next.balances, [currency]: next.balances[currency] + amount } }
    return addEntry(next, { id: nonce, kind: 'award', dir: 'in', currency, amount, note, ts })
  })
}

/** Kupon uretildi: kendi defterimize "verdim" kaydi dusulur (bakiye degismez, arz sinirsiz). */
export function logIssuedAward(nonce: string, currency: Role, amount: number, note: string): void {
  update((s) => addEntry(s, { id: nonce, kind: 'award', dir: 'out', currency, amount, note, ts: Date.now() }))
}

// --- Odul akisi --------------------------------------------------------------

/** Rezerve edilmis (talep edilmis ama henuz onaylanmamis) puan toplami. */
export function reservedPoints(): number {
  return state.pending.reduce((sum, p) => sum + p.cost, 0)
}

/** Harcanabilir bakiye = cuzdandaki puan - rezerve. */
export function availablePoints(): number {
  if (!state.identity) return 0
  return state.balances[heldCurrency(state.identity.role)] - reservedPoints()
}

export function addPending(p: PendingRedemption): void {
  update((s) => ({ ...s, pending: [p, ...s.pending] }))
}

export function cancelPending(id: string): void {
  update((s) => ({ ...s, pending: s.pending.filter((p) => p.id !== id) }))
}

export function getPending(id: string): PendingRedemption | undefined {
  return state.pending.find((p) => p.id === id)
}

/** Onay kuponu okundu: rezerve gercek dusume donusur. */
export function settleRedemption(id: string): PendingRedemption | null {
  const p = state.pending.find((x) => x.id === id)
  if (!p) return null
  update((s) => {
    let next = withSeen(s, `ok:${id}`)
    next = {
      ...next,
      pending: next.pending.filter((x) => x.id !== id),
      balances: { ...next.balances, [p.currency]: Math.max(0, next.balances[p.currency] - p.cost) },
    }
    return addEntry(next, {
      id,
      kind: 'redeem',
      dir: 'out',
      currency: p.currency,
      amount: p.cost,
      note: `${p.emoji} ${p.title}`,
      ts: Date.now(),
    })
  })
  return p
}

/** Onaylayan tarafin defterine bilgi kaydi (bakiyesini etkilemez). */
export function logApprovedRedemption(nonce: string, currency: Role, cost: number, note: string): void {
  update((s) => {
    const next = withSeen(s, nonce)
    return addEntry(next, { id: nonce, kind: 'redeem', dir: 'in', currency, amount: cost, note, ts: Date.now() })
  })
}

// --- Katalog -----------------------------------------------------------------

export function setRewards(rewards: Reward[]): void {
  update((s) => ({ ...s, rewards }))
}

// --- Yedek -------------------------------------------------------------------

export function exportBackup(): string {
  update((s) => ({ ...s, lastBackup: Date.now() }))
  return JSON.stringify(state, null, 2)
}

export function importBackup(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as AppState
    if (parsed.version !== 1 || !parsed.identity) return false
    commit({ ...emptyState(), ...parsed })
    return true
  } catch {
    return false
  }
}

export function backupOverdue(): boolean {
  if (state.ledger.length === 0) return false
  const last = state.lastBackup ?? state.identity?.since ?? Date.now()
  return Date.now() - last > BACKUP_REMINDER_MS
}
