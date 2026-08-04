import { STAMPS_PER_CARD, STAMP_STEP } from '../config/rewards'
import { formatPoints } from '../lib/format'

interface Props {
  /** Kart, kazanilan toplam puana gore dolar (harcamayla geri silinmez). */
  totalEarned: number
}

/** Her 10.000 puanda bir kase basilan 10 haneli delikli kart. */
export function StampCard({ totalEarned }: Props) {
  const stampsTotal = Math.floor(totalEarned / STAMP_STEP)
  const filled = stampsTotal % STAMPS_PER_CARD
  const cardsDone = Math.floor(stampsTotal / STAMPS_PER_CARD)
  const complete = filled === 0 && cardsDone > 0
  const shown = complete ? STAMPS_PER_CARD : filled
  const toNext = STAMP_STEP - (totalEarned % STAMP_STEP)

  return (
    <div className="card">
      <div className="card__title">
        <h3>Pul Kartı</h3>
        <span className="muted tiny">
          {cardsDone > 0 ? `${cardsDone} kart tamamlandı · ` : ''}
          her {formatPoints(STAMP_STEP)} puanda 1 pul
        </span>
      </div>
      <div className="stampcard">
        {Array.from({ length: STAMPS_PER_CARD }, (_, i) => (
          <div
            key={i}
            className={`stampcard__slot${i < shown ? ' stampcard__slot--filled' : ''}`}
            aria-label={i < shown ? `${i + 1}. pul dolu` : `${i + 1}. pul boş`}
          >
            {i < shown ? '★' : ''}
          </div>
        ))}
      </div>
      <p className="muted tiny" style={{ marginTop: 10 }}>
        {complete
          ? '🎉 Kart doldu! Yeni kart bir sonraki pulla başlıyor.'
          : `Sonraki pula ${formatPoints(toNext)} puan kaldı.`}
      </p>
    </div>
  )
}
