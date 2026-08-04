import { useEffect, useState } from 'react'
import { Award } from './screens/Award'
import { History } from './screens/History'
import { Lock } from './screens/Lock'
import { Rewards } from './screens/Rewards'
import { Scan } from './screens/Scan'
import { Settings } from './screens/Settings'
import { Setup } from './screens/Setup'
import { Wallet } from './screens/Wallet'
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

  // Rol temasi (renkler) belge kokunde: iki telefon bakista ayrilsin.
  // Kurulum bitmeden onceki temayi Setup ekrani yonetiyor.
  useEffect(() => {
    const role = state.identity?.role
    if (role) document.documentElement.dataset.role = role
  }, [state.identity?.role])

  if (!state.identity || !state.salt) return <Setup />
  if (!state.keyB64) return <Lock role={state.identity.role} />

  const identity = state.identity

  return (
    <div className="app">
      {tab === 'wallet' && <Wallet identity={identity} onGoTo={setTab} />}
      {tab === 'award' && <Award identity={identity} />}
      {tab === 'scan' && <Scan key={tab} identity={identity} />}
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
