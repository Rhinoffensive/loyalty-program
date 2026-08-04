import { useState } from 'react'
import { formatPoints, formatWhen } from '../lib/format'
import { useAppState } from '../lib/store'
import { CURRENCY_SHORT, ROLE_LABEL, otherRole, type Identity } from '../lib/types'

type Filter = 'all' | 'in' | 'out' | 'redeem'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Hepsi' },
  { key: 'in', label: 'Kazandıklarım' },
  { key: 'out', label: 'Verdiklerim' },
  { key: 'redeem', label: 'Ödüller' },
]

export function History({ identity }: { identity: Identity }) {
  const state = useAppState()
  const [filter, setFilter] = useState<Filter>('all')
  const other = ROLE_LABEL[otherRole(identity.role)]

  const items = state.ledger.filter((e) => {
    if (filter === 'all') return true
    if (filter === 'redeem') return e.kind === 'redeem'
    return e.kind === 'award' && e.dir === filter
  })

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1>Geçmiş</h1>
          <p>{state.ledger.length} hareket</p>
        </div>
      </div>

      <div className="chip-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`chip${filter === f.key ? ' chip--on' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        {items.length === 0 ? (
          <p className="muted tiny center">Bu filtrede hareket yok.</p>
        ) : (
          <div className="list">
            {items.map((e) => {
              const isRedeem = e.kind === 'redeem'
              const label = isRedeem
                ? e.dir === 'out'
                  ? 'Ödül aldınız'
                  : `${other} ödül aldı`
                : e.dir === 'in'
                  ? `${other} verdi`
                  : `${other}’a verdiniz`
              return (
                <div className="list__item" key={e.id}>
                  <div className="list__icon" aria-hidden="true">
                    {isRedeem ? '🏆' : e.dir === 'in' ? '🎁' : '📤'}
                  </div>
                  <div className="list__main">
                    <strong>{e.note || label}</strong>
                    <span className="muted tiny">
                      {label} · {formatWhen(e.ts)}
                    </span>
                  </div>
                  <div className={`list__amount list__amount--${e.dir}`}>
                    {!isRedeem && e.dir === 'in' ? '+' : isRedeem && e.dir === 'out' ? '−' : ''}
                    {formatPoints(e.amount)}
                    <span className="muted tiny"> {CURRENCY_SHORT[e.currency]}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="muted tiny center">
        Kayıtlar yalnızca bu telefonda tutulur; her iki telefonun geçmişi kendi gördüğü işlemlerden oluşur.
      </p>
    </div>
  )
}
