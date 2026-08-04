import { useEffect, useRef, useState } from 'react'
import { QrView } from '../components/QrView'
import { Sheet } from '../components/Sheet'
import { encode, encodePairing, makeCatalog } from '../lib/coupon'
import { formatPoints, formatWhen } from '../lib/format'
import { BUILD_STAMP, checkForUpdate } from '../lib/update'
import {
  exportBackup,
  getKey,
  importBackup,
  lock,
  pairingPayload,
  resetDevice,
  setRewards,
  useAppState,
} from '../lib/store'
import { CURRENCY_LABEL, ROLE_LABEL, heldCurrency, issuedCurrency, type Identity, type Reward, type Role } from '../lib/types'

type Panel = 'pair' | 'catalog' | 'share-catalog' | 'reset' | null

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function Settings({ identity }: { identity: Identity }) {
  const state = useAppState()
  const [panel, setPanel] = useState<Panel>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  const runUpdateCheck = async () => {
    setMessage('Güncelleme aranıyor…')
    const result = await checkForUpdate()
    setMessage(
      result === 'guncelleniyor'
        ? 'Yeni sürüm indiriliyor. Birkaç saniye içinde uygulama kendini yenileyecek.'
        : result === 'guncel'
          ? 'Zaten en güncel sürümdesiniz.'
          : 'Güncelleme denetlenemedi. Uygulamayı tamamen kapatıp yeniden açmayı deneyin.',
    )
  }

  const requestPersist = async () => {
    const ok = await navigator.storage?.persist?.()
    setPersisted(ok ?? null)
    setMessage(
      ok
        ? 'Kalıcı depolama açıldı. Tarayıcı artık verinizi kendiliğinden silmeyecek.'
        : 'Tarayıcı kalıcı depolamayı vermedi. Uygulamayı ana ekrana eklerseniz genelde verilir.',
    )
  }

  const download = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `puan-yedek-${identity.role}-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Yedek indirildi. Bu dosyayı bulut sürücünüzde saklayın.')
  }

  const restore = async (file: File) => {
    const text = await file.text()
    setMessage(
      importBackup(text)
        ? 'Yedek geri yüklendi.'
        : 'Bu dosya okunamadı. Bu uygulamanın yedek dosyasını seçtiğinizden emin olun.',
    )
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1>Ayarlar</h1>
          <p>
            {ROLE_LABEL[identity.role]} · Üye No {identity.memberNo}
          </p>
        </div>
      </div>

      {message && <div className="note note--good">{message}</div>}

      <div className="card stack">
        <h3>Eşleştirme</h3>
        <p className="muted tiny">
          Eşinizin telefonu programa ilk kez katılıyorsa bu karekodu okutsun. İçinde PIN veya gizli anahtar
          <strong> yok</strong> — sadece iki telefonun aynı PIN’den aynı anahtarı üretmesini sağlayan bilgi var.
        </p>
        <button type="button" className="btn btn--block" onClick={() => setPanel('pair')}>
          🔗 Eşleştirme Kodu’nu göster
        </button>
      </div>

      <div className="card stack">
        <h3>Ödül Kataloğu</h3>
        <p className="muted tiny">{state.rewards.length} ödül tanımlı.</p>
        <button type="button" className="btn btn--block" onClick={() => setPanel('catalog')}>
          ✏️ Kataloğu düzenle
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={() => setPanel('share-catalog')}>
          📤 Kataloğu eşimle eşitle
        </button>
      </div>

      <div className="card stack">
        <h3>Yedek</h3>
        <p className="muted tiny">
          Puanlar yalnızca bu telefonda duruyor. Telefon değişirse ya da tarayıcı verisi silinirse yedek olmadan
          geri gelmez.
          {state.lastBackup
            ? ` Son yedek: ${formatWhen(state.lastBackup)}.`
            : ' Henüz hiç yedek almadınız.'}
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn--primary btn--sm" onClick={download}>
            💾 Yedek al
          </button>
          <button type="button" className="btn btn--sm" onClick={() => fileRef.current?.click()}>
            📂 Yedeği yükle
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void restore(f)
            e.target.value = ''
          }}
        />
      </div>

      <div className="card stack">
        <h3>Bu cihaz</h3>
        {!isStandalone() && (
          <div className="note">
            📱 Uygulamayı <strong>ana ekrana ekleyin</strong>. Hem uygulama gibi açılır, hem de tarayıcının
            veriyi kendiliğinden silme ihtimali ortadan kalkar.
            <br />
            <span className="tiny">
              iPhone: Paylaş → “Ana Ekrana Ekle”. Android: menü → “Uygulamayı yükle”.
            </span>
          </div>
        )}
        <div className="row">
          <span className="muted tiny">
            Kalıcı depolama:{' '}
            {persisted === null ? 'bilinmiyor' : persisted ? 'açık ✓' : 'kapalı'}
          </span>
          <span className="spacer" />
          {persisted !== true && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void requestPersist()}>
              Aç
            </button>
          )}
        </div>
        <div className="row">
          <span className="muted tiny">
            Sürüm: <strong>{BUILD_STAMP}</strong>
          </span>
          <span className="spacer" />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void runUpdateCheck()}>
            Güncelle
          </button>
        </div>
        <p className="muted tiny">
          İki telefonda bu sürüm aynı olmalı. Farklıysa eski kalan telefonda “Güncelle”ye basın; yeni sürüm
          inince uygulama kendini yenileyecek.
        </p>
        <button type="button" className="btn btn--ghost btn--block" onClick={lock}>
          🔒 Kilitle (PIN’i tekrar sor)
        </button>
        <button type="button" className="btn btn--danger btn--block" onClick={() => setPanel('reset')}>
          🗑️ Cihazı sıfırla
        </button>
      </div>

      <div className="card stack">
        <h3>Nasıl çalışıyor?</h3>
        <p className="muted tiny">
          Siz <strong>{CURRENCY_LABEL[issuedCurrency(identity.role)]}</strong> verirsiniz, cüzdanınızda{' '}
          <strong>{CURRENCY_LABEL[heldCurrency(identity.role)]}</strong> birikir. Her kupon, ortak PIN’den
          türetilen gizli anahtarla imzalanır; imzası tutmayan kupon kabul edilmez ve aynı kupon iki kez
          kullanılamaz. Sunucu yok, hesap yok, kimse verinizi görmüyor.
        </p>
      </div>

      {panel === 'pair' && <PairPanel onClose={() => setPanel(null)} />}
      {panel === 'catalog' && (
        <CatalogEditor rewards={state.rewards} onClose={() => setPanel(null)} />
      )}
      {panel === 'share-catalog' && (
        <ShareCatalog rewards={state.rewards} onClose={() => setPanel(null)} />
      )}
      {panel === 'reset' && (
        <Sheet title="Cihazı sıfırla" onClose={() => setPanel(null)}>
          <div className="note note--bad">
            Bu telefondaki tüm puanlar, geçmiş ve eşleştirme silinecek. Yedeğiniz yoksa geri dönüşü yok.
          </div>
          <button type="button" className="btn btn--danger btn--block" onClick={resetDevice}>
            Evet, her şeyi sil
          </button>
          <button type="button" className="btn btn--block" onClick={() => setPanel(null)}>
            Vazgeç
          </button>
        </Sheet>
      )}
    </div>
  )
}

function PairPanel({ onClose }: { onClose: () => void }) {
  const payload = pairingPayload()
  return (
    <Sheet title="Eşleştirme Kodu" onClose={onClose}>
      {payload ? (
        <>
          <QrView value={encodePairing(payload)} shareTitle="Puan programı eşleştirme kodu" />
          <div className="note">
            📷 Eşiniz bunu telefonun <strong>normal kamerasıyla</strong> okutsun: çıkan bağlantıya dokununca
            uygulama açılır ve doğrudan PIN adımına gider. (İsterse uygulamayı açıp “Eşimin telefonuyla
            eşleştir” de diyebilir.) Bu kod gizli anahtar taşımaz; asıl doğrulama PIN ile yapılır.
          </div>
        </>
      ) : (
        <p className="muted">Eşleştirme kodu üretilemedi.</p>
      )}
    </Sheet>
  )
}

function ShareCatalog({ rewards, onClose }: { rewards: Reward[]; onClose: () => void }) {
  const [coupon, setCoupon] = useState<string | null>(null)

  useEffect(() => {
    const key = getKey()
    if (!key) return
    let alive = true
    void encode(key, makeCatalog(rewards)).then((t) => {
      if (alive) setCoupon(t)
    })
    return () => {
      alive = false
    }
  }, [rewards])

  return (
    <Sheet title="Kataloğu eşitle" onClose={onClose}>
      {coupon ? <QrView value={coupon} shareTitle="Ödül kataloğu" /> : <p className="muted">Hazırlanıyor…</p>}
      <div className="note">
        Eşiniz bunu “Tara” ile okutunca kendi kataloğu <strong>bununla değişir</strong>. Onda olup sizde
        olmayan ödüller silinir.
      </div>
    </Sheet>
  )
}

function CatalogEditor({ rewards, onClose }: { rewards: Reward[]; onClose: () => void }) {
  const [draft, setDraft] = useState<Reward[]>(() => rewards.map((r) => ({ ...r })))

  const patch = (id: string, changes: Partial<Reward>) =>
    setDraft((d) => d.map((r) => (r.id === id ? { ...r, ...changes } : r)))

  const add = () =>
    setDraft((d) => [
      ...d,
      { id: `r-${Date.now().toString(36)}`, title: '', emoji: '🎁', cost: 5_000, who: 'both' },
    ])

  const save = () => {
    const clean = draft
      .map((r) => ({ ...r, title: r.title.trim(), cost: Math.max(1, Math.round(r.cost)) }))
      .filter((r) => r.title.length > 0)
    setRewards(clean)
    onClose()
  }

  return (
    <Sheet title="Ödül Kataloğu" onClose={onClose}>
      <div className="stack">
        {draft.map((r) => (
          <div className="card card--tight stack" key={r.id}>
            <div className="row">
              <input
                className="input"
                style={{ width: 64, textAlign: 'center', flex: 'none' }}
                value={r.emoji}
                maxLength={4}
                aria-label="Emoji"
                onChange={(e) => patch(r.id, { emoji: e.target.value })}
              />
              <input
                className="input"
                placeholder="Ödülün adı"
                value={r.title}
                maxLength={60}
                onChange={(e) => patch(r.id, { title: e.target.value })}
              />
            </div>
            <div className="row">
              <input
                className="input"
                inputMode="numeric"
                value={r.cost}
                aria-label="Puan"
                onChange={(e) => patch(r.id, { cost: Number(e.target.value.replace(/\D/g, '')) || 0 })}
              />
              <select
                className="input"
                value={r.who}
                aria-label="Kim talep edebilir"
                onChange={(e) => patch(r.id, { who: e.target.value as Role | 'both' })}
              >
                <option value="both">İkisi de</option>
                <option value="kocis">Sadece Kociş</option>
                <option value="karicik">Sadece Karıcık</option>
              </select>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                style={{ flex: 'none' }}
                aria-label="Sil"
                onClick={() => setDraft((d) => d.filter((x) => x.id !== r.id))}
              >
                Sil
              </button>
            </div>
            <span className="muted tiny">{formatPoints(r.cost)} puan</span>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn--ghost btn--block" onClick={add}>
        + Ödül ekle
      </button>
      <button type="button" className="btn btn--primary btn--block" onClick={save}>
        Kaydet
      </button>
      <p className="muted tiny center">
        Kaydettikten sonra “Kataloğu eşimle eşitle” ile karşı tarafa da gönderin.
      </p>
    </Sheet>
  )
}
