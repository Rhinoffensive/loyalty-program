// Karekod artik uygulama adresine gomulu bir baglanti tasiyor ki telefonun
// varsayilan kamera uygulamasi okudugunda uygulamayi acabilsin.
import { expect, test } from 'vitest'
import { couponLink, extractCode, readIncomingCode } from './link'
import { deriveKey, newSalt } from './crypto'
import { decode, encode, makeAward } from './coupon'

// Testler Node'da kosuyor; link.ts'nin ihtiyaci olan kadarini taklit ediyoruz.
globalThis.location = {
  origin: 'https://ornek.test',
  pathname: '/loyalty-program/',
  search: '',
  hash: '',
} as unknown as Location

const COUPON = 'KP1.eyJ0IjoiYXcifQ.abcDEF123-_x'

test('baglanti uygulama adresini ve kuponu diyez kisminda tasir', () => {
  const link = couponLink(COUPON)
  expect(link).toMatch(/^https?:\/\//)
  expect(link).toContain('#k=')
  // Kritik: kupon soru isaretinden ONCE degil, diyezden SONRA olmali —
  // diyezden sonrasi sunucuya hic gonderilmez.
  expect(link.split('#')[0]).not.toContain(COUPON)
})

test('baglantidan kupon geri cikarilir', () => {
  expect(extractCode(couponLink(COUPON))).toBe(COUPON)
})

test('duz kod da kabul edilir — eski karekodlar calismaya devam eder', () => {
  expect(extractCode(COUPON)).toBe(COUPON)
  expect(extractCode(`  ${COUPON}  `)).toBe(COUPON)
})

test('eslestirme kodu da baglantiyla tasinabilir', () => {
  const pairing = 'KP1P.eyJ0IjoicGFpciJ9'
  expect(extractCode(couponLink(pairing))).toBe(pairing)
})

test('mesajdan yapistirilan baglanti, etrafinda bosluk olsa da cozulur', () => {
  expect(extractCode(`Al bakalım: ${couponLink(COUPON)} 🎁`)).toBe(COUPON)
})

test('baglantiyla gelen gercek kupon karsi tarafta dogrulanir', async () => {
  const key = await deriveKey('1234', newSalt())
  const link = couponLink(await encode(key, makeAward('kocis', 5000, 'çöp')))
  const parsed = await decode(key, link)
  expect(parsed.ok).toBe(true)
  expect(parsed.ok && parsed.body.t).toBe('aw')
})

test('adreste kupon yoksa null doner', () => {
  location.hash = ''
  expect(readIncomingCode()).toBeNull()
  location.hash = '#baskabirsey'
  expect(readIncomingCode()).toBeNull()
})

test('adresteki kupon okunur', () => {
  location.hash = `#k=${encodeURIComponent(COUPON)}`
  expect(readIncomingCode()).toBe(COUPON)
  location.hash = ''
})

test('adrese kupon gibi olmayan bir sey konursa yutulur', () => {
  location.hash = '#k=javascript:alert(1)'
  expect(readIncomingCode()).toBeNull()
  location.hash = ''
})
