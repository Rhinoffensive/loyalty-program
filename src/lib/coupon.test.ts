// Guvenlik cekirdegi testleri: node --experimental-strip-types --test src/lib/coupon.test.ts
import assert from 'node:assert/strict'
import { test } from 'vitest'
import { checkValue, deriveKey, newSalt } from './crypto'
import { COUPON_TTL_MS, decode, decodePairing, encode, encodePairing, makeAward, makeApproval } from './coupon'

const SALT = newSalt()

test('ayni PIN + ayni tuz ayni anahtari uretir', async () => {
  const a = await deriveKey('1234', SALT)
  const b = await deriveKey('1234', SALT)
  assert.deepEqual([...a], [...b])
})

test('farkli PIN farkli anahtar ve farkli dogrulama degeri uretir', async () => {
  const a = await deriveKey('1234', SALT)
  const b = await deriveKey('9999', SALT)
  assert.notDeepEqual([...a], [...b])
  assert.notEqual(await checkValue(a), await checkValue(b))
})

test('dogrulama degeri anahtari ele vermez (uzunlugu sabit, icerigi hash)', async () => {
  const key = await deriveKey('1234', SALT)
  const check = await checkValue(key)
  assert.equal(check.length, 43) // 32 bayt base64url
  assert.ok(!check.includes(Buffer.from(key).toString('base64url')))
})

test('gecerli kupon karsi tarafta cozulur', async () => {
  const key = await deriveKey('1234', SALT)
  const body = makeAward('kocis', 5000, 'çöpü attığın için')
  const text = await encode(key, body)
  const parsed = await decode(key, text)
  assert.ok(parsed.ok)
  assert.equal(parsed.body.t, 'aw')
  assert.equal(parsed.body.a, 5000)
  assert.equal(parsed.body.m, 'çöpü attığın için')
})

test('farkli PIN ile uretilmis kupon reddedilir', async () => {
  const mine = await deriveKey('1234', SALT)
  const forger = await deriveKey('4321', SALT)
  const text = await encode(forger, makeAward('kocis', 999_999, 'sahte'))
  const parsed = await decode(mine, text)
  assert.equal(parsed.ok, false)
  assert.match(parsed.ok === false ? parsed.reason : '', /imza tutmuyor/)
})

test('govdesi kurcalanmis kupon reddedilir', async () => {
  const key = await deriveKey('1234', SALT)
  const text = await encode(key, makeAward('kocis', 100, 'az'))
  const [prefixAndPayload, sig] = [text.slice(0, text.lastIndexOf('.')), text.slice(text.lastIndexOf('.') + 1)]
  // Tutari 100 -> 900 yapmayi dene: payload'i cozup degistirip geri paketle.
  const payload = prefixAndPayload.slice('KP1.'.length)
  const json = JSON.parse(Buffer.from(payload, 'base64url').toString())
  json.a = 900_000
  const tampered = 'KP1.' + Buffer.from(JSON.stringify(json)).toString('base64url') + '.' + sig
  const parsed = await decode(key, tampered)
  assert.equal(parsed.ok, false)
})

test('suresi dolmus kupon reddedilir', async () => {
  const key = await deriveKey('1234', SALT)
  const body = makeAward('kocis', 5000, 'eski')
  body.d = Date.now() - COUPON_TTL_MS - 1000
  const parsed = await decode(key, await encode(key, body))
  assert.equal(parsed.ok, false)
  assert.match(parsed.ok === false ? parsed.reason : '', /süresi dolmuş/)
})

test('tarihi ileri atilmis kupon reddedilir', async () => {
  const key = await deriveKey('1234', SALT)
  const body = makeAward('kocis', 5000, 'gelecek')
  body.d = Date.now() + 3 * 24 * 60 * 60 * 1000
  const parsed = await decode(key, await encode(key, body))
  assert.equal(parsed.ok, false)
  assert.match(parsed.ok === false ? parsed.reason : '', /ileride/)
})

test('her kuponun kimligi benzersiz — tekrar kullanim tespiti buna dayaniyor', () => {
  const ids = new Set(Array.from({ length: 500 }, () => makeAward('kocis', 1, '').n))
  assert.equal(ids.size, 500)
})

test('onay kuponu talebin kimligini tasir', async () => {
  const key = await deriveKey('1234', SALT)
  const req = makeAward('kocis', 1, '')
  const parsed = await decode(key, await encode(key, makeApproval(req.n)))
  assert.ok(parsed.ok)
  assert.equal(parsed.body.t, 'ok')
  assert.equal(parsed.body.n, req.n)
})

test('eslestirme kodu imzasiz cozulur ve gizli anahtar tasimaz', async () => {
  const key = await deriveKey('1234', SALT)
  const payload = { t: 'pair', salt: SALT, check: await checkValue(key), role: 'kocis' }
  const text = encodePairing(payload)
  assert.deepEqual(decodePairing(text), payload)
  assert.ok(!text.includes(Buffer.from(key).toString('base64url')))
})

test('eslestirme kodu kupon yerine okutulursa anlamli hata verir', async () => {
  const key = await deriveKey('1234', SALT)
  const text = encodePairing({ t: 'pair', salt: SALT, check: await checkValue(key), role: 'kocis' })
  const parsed = await decode(key, text)
  assert.equal(parsed.ok, false)
  assert.match(parsed.ok === false ? parsed.reason : '', /eşleştirme kodu/)
})

test('eslestirme kodu tek karekoda sigacak kadar kisa', async () => {
  const key = await deriveKey('1234', SALT)
  const text = encodePairing({ t: 'pair', salt: SALT, check: await checkValue(key), role: 'kocis' })
  assert.ok(text.length < 200, `eşleştirme kodu ${text.length} karakter — QR yoğunlaşır`)
})
