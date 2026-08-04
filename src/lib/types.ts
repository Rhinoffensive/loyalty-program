export type Role = 'kocis' | 'karicik'

/**
 * Para birimi VEREN kisinin adini tasir: Kocis bir sey rica edince esi
 * "Kocis Puani" kazanir. Yani kendi cuzdaninizda hep karsi tarafin
 * para birimi birikir; kendi para biriminizi ise sinirsiz basabilirsiniz.
 */
export type Currency = Role

export type Kind = 'award' | 'redeem'
export type Direction = 'in' | 'out'

export interface LedgerEntry {
  id: string
  kind: Kind
  /** Bu cihazin sahibi acisindan: 'in' = kazandim/aldim, 'out' = verdim/onayladim */
  dir: Direction
  currency: Currency
  amount: number
  note: string
  ts: number
}

export interface Reward {
  id: string
  title: string
  emoji: string
  cost: number
  /** Bu odulu kim talep edebilir. 'both' = ikisi de. */
  who: Role | 'both'
}

/** Talep edilmis, karsi tarafin onayini bekleyen odul. Puani rezerve tutar. */
export interface PendingRedemption {
  id: string
  rewardId: string
  title: string
  emoji: string
  cost: number
  currency: Currency
  ts: number
}

export interface Identity {
  role: Role
  memberNo: string
  deviceId: string
  since: number
}

export interface AppState {
  version: 1
  identity: Identity | null
  salt: string | null
  check: string | null
  /** Cihaz token'i: PIN'den turetilmis anahtar. Varsa PIN bir daha sorulmaz. */
  keyB64: string | null
  balances: Record<Currency, number>
  ledger: LedgerEntry[]
  /** Kullanilmis kupon kimlikleri — ayni kupon iki kez gecmesin. */
  seen: { n: string; ts: number }[]
  rewards: Reward[]
  pending: PendingRedemption[]
  lastBackup: number | null
}

export const ROLE_LABEL: Record<Role, string> = {
  kocis: 'Kociş',
  karicik: 'Karıcık',
}

export const CURRENCY_LABEL: Record<Currency, string> = {
  kocis: 'Kociş Puanı',
  karicik: 'Karıcık Puanı',
}

export const CURRENCY_SHORT: Record<Currency, string> = {
  kocis: 'KP',
  karicik: 'KRP',
}

export function otherRole(role: Role): Role {
  return role === 'kocis' ? 'karicik' : 'kocis'
}

/** Bu rolun basabildigi para birimi (kendi adini tasiyan). */
export function issuedCurrency(role: Role): Currency {
  return role
}

/** Bu rolun cuzdaninda biriken para birimi (karsi tarafin adini tasiyan). */
export function heldCurrency(role: Role): Currency {
  return otherRole(role)
}
