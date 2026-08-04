import type { Reward } from '../lib/types'

/**
 * Baslangic odul katalogu. Ayarlar > Odul Katalogu'ndan duzenlenebilir,
 * "Katalogu Paylas" QR'i ile karsi cihaza aktarilir.
 */
export const DEFAULT_REWARDS: Reward[] = [
  { id: 'r-cay', title: 'Yatağa çay servisi', emoji: '🍵', cost: 2_500, who: 'both' },
  { id: 'r-bulasik', title: 'Bir günlük bulaşık muafiyeti', emoji: '🧽', cost: 5_000, who: 'both' },
  { id: 'r-film', title: 'Film seçimi bu akşam bende', emoji: '🍿', cost: 7_500, who: 'both' },
  { id: 'r-kahvalti', title: 'Yatakta kahvaltı', emoji: '🥐', cost: 12_000, who: 'both' },
  { id: 'r-masaj', title: '20 dakika masaj', emoji: '💆', cost: 25_000, who: 'both' },
  { id: 'r-uyku', title: 'Hafta sonu geç uyuma hakkı', emoji: '😴', cost: 30_000, who: 'both' },
  { id: 'r-yemek', title: 'Dışarıda yemek, hesap karşı tarafta', emoji: '🍝', cost: 50_000, who: 'both' },
  { id: 'r-joker', title: 'Sınırsız joker: ne istersen', emoji: '🃏', cost: 100_000, who: 'both' },
]

/** Puan Ver ekranindaki hazir tutar butonlari. */
export const QUICK_AMOUNTS = [500, 1_000, 5_000, 25_000]

/** Her N puanda bir pul kartina kase basilir. */
export const STAMP_STEP = 10_000
export const STAMPS_PER_CARD = 10
