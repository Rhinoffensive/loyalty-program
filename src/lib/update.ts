// Ana ekrana eklenmis bir PWA, service worker sayesinde cevrimdisi calisir —
// ama ayni sebeple yeni surumu gec fark edebilir. Burasi guncellemeyi
// kovalar: acilista, uygulama one geldiginde ve saatte bir kontrol eder.
// Yeni surum aktiflesince vite-plugin-pwa'nin autoUpdate modu sayfayi
// kendiliginden yeniler.

import { registerSW } from 'virtual:pwa-register'

const CHECK_INTERVAL_MS = 60 * 60 * 1000

let registration: ServiceWorkerRegistration | undefined

export const BUILD_STAMP = __BUILD_STAMP__

export function startUpdateWatch(): void {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, r) {
      registration = r
      if (!r) return
      const check = () => {
        if (!document.hidden) void r.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', check)
      window.addEventListener('focus', check)
      setInterval(check, CHECK_INTERVAL_MS)
      check()
    },
  })
}

export type UpdateResult = 'guncelleniyor' | 'guncel' | 'desteklenmiyor'

/** Ayarlar'daki "Güncellemeleri denetle" butonu. */
export async function checkForUpdate(): Promise<UpdateResult> {
  if (!registration) return 'desteklenmiyor'
  try {
    await registration.update()
  } catch {
    return 'desteklenmiyor'
  }
  return registration.installing || registration.waiting ? 'guncelleniyor' : 'guncel'
}
