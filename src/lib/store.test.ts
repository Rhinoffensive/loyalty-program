// Bakiye, rezerve ve tekrar-kullanim mantigi. store.ts localStorage'a
// yaslandigi icin once kucuk bir bellek-ici taklit kuruluyor.
import { beforeEach, expect, test } from 'vitest'

class MemStorage {
  private map = new Map<string, string>()
  getItem(k: string) {
    return this.map.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.map.set(k, v)
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
  clear() {
    this.map.clear()
  }
}

globalThis.localStorage = new MemStorage() as unknown as Storage

const store = await import('./store')

beforeEach(async () => {
  store.resetDevice()
  await store.setupFirstDevice('karicik', '1234')
})

test('kurulum: rol, tuz ve cihaz anahtari yerine oturur', () => {
  const s = store.getState()
  expect(s.identity?.role).toBe('karicik')
  expect(s.salt).toBeTruthy()
  expect(s.keyB64).toBeTruthy()
  expect(store.getKey()).toHaveLength(32)
})

test('kilitleme anahtari siler ama puanlari birakir', () => {
  store.creditAward('n1', 'kocis', 5000, 'test', Date.now())
  store.lock()
  expect(store.getState().keyB64).toBeNull()
  expect(store.getState().balances.kocis).toBe(5000)
})

test('dogru PIN ile kilit acilir, yanlis PIN ile acilmaz', async () => {
  store.lock()
  expect(await store.unlock('9999')).toBe(false)
  expect(store.getState().keyB64).toBeNull()
  expect(await store.unlock('1234')).toBe(true)
  expect(store.getState().keyB64).toBeTruthy()
})

test('kupon bakiyeyi artirir ve deftere islenir', () => {
  store.creditAward('n1', 'kocis', 5000, 'çöp', Date.now())
  expect(store.getState().balances.kocis).toBe(5000)
  expect(store.getState().ledger[0]).toMatchObject({ dir: 'in', kind: 'award', amount: 5000 })
})

test('ayni kupon iki kez kullanilamaz', () => {
  store.creditAward('n1', 'kocis', 5000, 'çöp', Date.now())
  expect(store.isSeen('n1')).toBe(true)
  expect(store.isSeen('n2')).toBe(false)
})

test('odul talebi puani rezerve eder, bakiyeyi hemen dusurmez', () => {
  store.creditAward('n1', 'kocis', 30_000, '', Date.now())
  store.addPending({
    id: 'p1', rewardId: 'r-masaj', title: '20 dakika masaj', emoji: '💆',
    cost: 25_000, currency: 'kocis', ts: Date.now(),
  })
  expect(store.getState().balances.kocis).toBe(30_000)
  expect(store.reservedPoints()).toBe(25_000)
  expect(store.availablePoints()).toBe(5_000)
})

test('rezerve edilmis puan ikinci kez talep edilemez', () => {
  store.creditAward('n1', 'kocis', 30_000, '', Date.now())
  const req = {
    rewardId: 'r-masaj', title: '20 dakika masaj', emoji: '💆',
    cost: 25_000, currency: 'kocis' as const, ts: Date.now(),
  }
  store.addPending({ ...req, id: 'p1' })
  // Arayuz "harcanabilir" bakiyeye bakiyor; ikinci talep icin puan yetmiyor.
  expect(store.availablePoints()).toBeLessThan(req.cost)
})

test('onay geldiginde puan gercekten duser', () => {
  store.creditAward('n1', 'kocis', 30_000, '', Date.now())
  store.addPending({
    id: 'p1', rewardId: 'r-masaj', title: '20 dakika masaj', emoji: '💆',
    cost: 25_000, currency: 'kocis', ts: Date.now(),
  })
  const settled = store.settleRedemption('p1')
  expect(settled?.title).toBe('20 dakika masaj')
  expect(store.getState().balances.kocis).toBe(5_000)
  expect(store.reservedPoints()).toBe(0)
  expect(store.getState().ledger[0]).toMatchObject({ kind: 'redeem', dir: 'out', amount: 25_000 })
})

test('ayni onay ikinci kez islenmez', () => {
  store.creditAward('n1', 'kocis', 30_000, '', Date.now())
  store.addPending({
    id: 'p1', rewardId: 'r-cay', title: 'çay', emoji: '🍵',
    cost: 2_500, currency: 'kocis', ts: Date.now(),
  })
  expect(store.settleRedemption('p1')).not.toBeNull()
  expect(store.settleRedemption('p1')).toBeNull()
  expect(store.getState().balances.kocis).toBe(27_500)
})

test('iptal edilen talep puani serbest birakir', () => {
  store.creditAward('n1', 'kocis', 30_000, '', Date.now())
  store.addPending({
    id: 'p1', rewardId: 'r-masaj', title: 'masaj', emoji: '💆',
    cost: 25_000, currency: 'kocis', ts: Date.now(),
  })
  store.cancelPending('p1')
  expect(store.reservedPoints()).toBe(0)
  expect(store.availablePoints()).toBe(30_000)
})

test('puan veren tarafin bakiyesi degismez — kendi para biriminde arz sinirsiz', () => {
  store.logIssuedAward('n9', 'karicik', 5_000, 'test')
  expect(store.getState().balances.karicik).toBe(0)
  expect(store.getState().ledger[0]).toMatchObject({ dir: 'out', kind: 'award' })
})

test('yedek alinip geri yuklenince bakiye ve defter aynen doner', () => {
  store.creditAward('n1', 'kocis', 12_345, 'çöp', Date.now())
  const backup = store.exportBackup()
  store.resetDevice()
  expect(store.getState().identity).toBeNull()
  expect(store.importBackup(backup)).toBe(true)
  expect(store.getState().balances.kocis).toBe(12_345)
  expect(store.getState().ledger).toHaveLength(1)
  expect(store.getState().identity?.role).toBe('karicik')
})

test('bozuk yedek dosyasi reddedilir ve mevcut veriyi bozmaz', () => {
  store.creditAward('n1', 'kocis', 500, '', Date.now())
  expect(store.importBackup('{"bu":"yanlış dosya"}')).toBe(false)
  expect(store.importBackup('bu json bile değil')).toBe(false)
  expect(store.getState().balances.kocis).toBe(500)
})
