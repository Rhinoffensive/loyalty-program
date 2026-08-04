import { useCallback, useEffect, useState } from 'react'
import { Award } from './screens/Award'
import { History } from './screens/History'
import { Lock } from './screens/Lock'
import { Rewards } from './screens/Rewards'
import { Scan } from './screens/Scan'
import { Settings } from './screens/Settings'
import { Setup } from './screens/Setup'
import { Wallet } from './screens/Wallet'
import { clearIncomingCode, isPairingCode, readIncomingCode } from './lib/link'
import { useAppState } from './lib/store'

export type Tab = 'wallet' | 'award' | 'scan' | 'rewards' | 'history' | 'settings'

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'wallet', icon: '💳', label: 'Cüzdan' },
  { key: 'award', icon: '🎁', label: 'Puan Ver' },
  { key: 'scan', icon: '📷', label: 'Tara' },
  { key: 'rewards', icon: '🏆', label: 'Ödüller' },
  { key: 'settings', icon: '⚙️', label: 'Ayarlar' },
]

export function App() {
  const state = useAppState()
  const [tab, setTab] = useState<Tab>('wallet')
  // Kamera uygulamasindan gelen baglantidaki kupon. Adresten ancak islendikten
  // sonra siliniyor; cihaz kilitliyse once PIN sorulup sonra devam ediliyor.
  const [incoming, setIncoming] = useState<string | null>(readIncomingCode)

  const consumeIncoming = useCallback(() => {
    clearIncomingCode()
    setIncoming(null)
  }, [])

  // Uygulama zaten acikken gelen baglanti sadece adresi degistirir.
  useEffect(() => {
    const onHashChange = () => {
      const code = readIncomingCode()
      if (code) setIncoming(code)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Eslestirme kodu kurulum ekranina ait; Tara'ya goturulmemeli, yoksa
  // eslestirme biter bitmez bos bir kamera ekranina dusuluyor.
  const incomingCoupon = incoming && !isPairingCode(incoming) ? incoming : null

  // Kupon bekliyorsa dogrudan Tara ekranina gec.
  useEffect(() => {
    if (incomingCoupon && state.identity && state.keyB64) setTab('scan')
  }, [incomingCoupon, state.identity, state.keyB64])

  // Zaten kurulu bir telefonda eslestirme baglantisinin isi yok — sessizce sil.
  useEffect(() => {
    if (incoming && isPairingCode(incoming) && state.identity) consumeIncoming()
  }, [incoming, state.identity, consumeIncoming])

  // Rol temasi (renkler) belge kokunde: iki telefon bakista ayrilsin.
  // Kurulum bitmeden onceki temayi Setup ekrani yonetiyor.
  useEffect(() => {
    const role = state.identity?.role
    if (role) document.documentElement.dataset.role = role
  }, [state.identity?.role])

  if (!state.identity || !state.salt) {
    return <Setup incomingCode={incoming} onCodeUsed={consumeIncoming} />
  }
  if (!state.keyB64) return <Lock role={state.identity.role} pendingCoupon={incomingCoupon !== null} />

  const identity = state.identity

  return (
    <div className="app">
      {tab === 'wallet' && <Wallet identity={identity} onGoTo={setTab} />}
      {tab === 'award' && <Award identity={identity} />}
      {tab === 'scan' && (
        <Scan key={tab} identity={identity} incomingCode={incomingCoupon} onCodeUsed={consumeIncoming} />
      )}
      {tab === 'rewards' && <Rewards identity={identity} />}
      {tab === 'history' && <History identity={identity} />}
      {tab === 'settings' && <Settings identity={identity} />}

      <nav className="tabbar">
        <div className="tabbar__inner">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`tab${tab === t.key ? ' tab--active' : ''}`}
              aria-current={tab === t.key ? 'page' : undefined}
              onClick={() => setTab(t.key)}
            >
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
              {t.key === 'rewards' && state.pending.length > 0 && (
                <span className="tab__badge">{state.pending.length}</span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
