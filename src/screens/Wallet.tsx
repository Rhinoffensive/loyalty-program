import { Coin } from '../components/Coin'
import { MemberCard } from '../components/MemberCard'
import { StampCard } from '../components/StampCard'
import { formatPoints, formatWhen } from '../lib/format'
import { backupOverdue, reservedPoints, useAppState } from '../lib/store'
import { CURRENCY_LABEL, heldCurrency, issuedCurrency, type Identity } from '../lib/types'

interface Props {
  identity: Identity
  onGoTo: (tab: 'award' | 'rewards' | 'history' | 'settings') => void
}

export function Wallet({ identity, onGoTo }: Props) {
  const state = useAppState()
  const held = heldCurrency(identity.role)
  const issued = issuedCurrency(identity.role)
  const balance = state.balances[held]
  const reserved = reservedPoints()
  const totalEarned = state.ledger
    .filter((e) => e.kind === 'award' && e.dir === 'in')
    .reduce((sum, e) => sum + e.amount, 0)
  const recent = state.ledger.slice(0, 5)

  return (
    <div className="screen">
      <MemberCard role={identity.role} memberNo={identity.memberNo} since={identity.since} />

      {backupOverdue() && (
        <button type="button" className="note" style={{ textAlign: 'left' }} onClick={() => onGoTo('settings')}>
          💾 Uzun süredir yedek almadınız. Telefon değişirse puanlar kaybolur —{' '}
          <strong>Ayarlar’dan yedek alın.</strong>
        </button>
      )}

      <div className="card">
        <div className="balance">
          <Coin currency={held} size={76} float />
          <div>
            <div className="balance__value">{formatPoints(balance)}</div>
            <div className="balance__label">{CURRENCY_LABEL[held]}</div>
          </div>
        </div>
        {reserved > 0 && (
          <p className="muted tiny" style={{ marginTop: 12 }}>
            Bunun {formatPoints(reserved)} puanı onay bekleyen ödül için ayrıldı · harcanabilir{' '}
            <strong>{formatPoints(balance - reserved)}</strong>
          </p>
        )}
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn--primary" onClick={() => onGoTo('award')}>
          🎁 Puan Ver
        </button>
        <button type="button" className="btn" onClick={() => onGoTo('rewards')}>
          🏆 Ödüller
        </button>
      </div>

      <p className="muted tiny center">
        Siz {CURRENCY_LABEL[issued]} verirsiniz, cüzdanınızda {CURRENCY_LABEL[held]} birikir.
      </p>

      <StampCard totalEarned={totalEarned} />

      <div className="card">
        <div className="card__title">
          <h3>Son hareketler</h3>
          {state.ledger.length > 0 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onGoTo('history')}>
              Tümü ({state.ledger.length})
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="muted tiny">
            Henüz hareket yok. Eşinize bir şey rica edip “Puan Ver” ile ilk kuponu kesin. 💌
          </p>
        ) : (
          <div className="list">
            {recent.map((e) => (
              <div className="list__item" key={e.id}>
                <div className="list__icon" aria-hidden="true">
                  {e.kind === 'redeem' ? '🏆' : e.dir === 'in' ? '🎁' : '📤'}
                </div>
                <div className="list__main">
                  <strong>{e.note || (e.kind === 'redeem' ? 'Ödül' : 'Puan')}</strong>
                  <span className="muted tiny">{formatWhen(e.ts)}</span>
                </div>
                <div className={`list__amount list__amount--${e.dir}`}>
                  {e.dir === 'in' && e.kind === 'award' ? '+' : e.dir === 'out' && e.kind === 'redeem' ? '−' : ''}
                  {formatPoints(e.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
