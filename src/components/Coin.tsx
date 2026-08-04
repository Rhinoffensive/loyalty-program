import type { Currency } from '../lib/types'

interface Props {
  currency: Currency
  size?: number
  /** Kazanma aninda ziplama animasyonu. */
  pop?: boolean
  /** Bosta hafif suzulme. */
  float?: boolean
}

const PALETTE: Record<Currency, { rim1: string; rim2: string; face1: string; face2: string; glyph: string }> = {
  kocis: { rim1: '#7d95ea', rim2: '#a894ef', face1: '#c3d0fb', face2: '#e6e2fd', glyph: '#4a4a86' },
  karicik: { rim1: '#f394b3', rim2: '#ffb894', face1: '#ffd3e0', face2: '#ffe6d4', glyph: '#8a4560' },
}

/** Kenar tirtiklari — gercek madeni para hissi icin. */
const TICKS = Array.from({ length: 32 }, (_, i) => (i * 360) / 32)

export function Coin({ currency, size = 64, pop = false, float = false }: Props) {
  const c = PALETTE[currency]
  const id = `coin-${currency}`
  const cls = ['coin', pop ? 'coin--pop' : '', float ? 'coin--float' : ''].filter(Boolean).join(' ')

  return (
    <svg
      className={cls}
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      role="img"
      aria-label={currency === 'kocis' ? 'Kociş puanı jetonu' : 'Karıcık puanı jetonu'}
    >
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.rim1} />
          <stop offset="100%" stopColor={c.rim2} />
        </linearGradient>
        <linearGradient id={`${id}-face`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={c.face2} />
          <stop offset="100%" stopColor={c.face1} />
        </linearGradient>
      </defs>

      {/* tirtikli kenar */}
      <g fill={`url(#${id}-rim)`}>
        {TICKS.map((deg) => (
          <rect key={deg} x={-2.6} y={-49} width={5.2} height={9} rx={2.2} transform={`rotate(${deg})`} />
        ))}
      </g>

      <circle r="45" fill={`url(#${id}-rim)`} />
      <circle r="37" fill={`url(#${id}-face)`} />
      <circle r="37" fill="none" stroke={c.glyph} strokeOpacity="0.22" strokeWidth="1.6" strokeDasharray="3 5" />

      {/* kabartma parlaklik */}
      <ellipse cx="-13" cy="-17" rx="15" ry="9" fill="#fff" opacity="0.5" transform="rotate(-28)" />

      {currency === 'kocis' ? (
        // birbirine kivrilan uclariyla biyik
        <g fill={c.glyph} transform="translate(0,-2)">
          <path
            d="M0 4
               C-4 -2 -10 -8 -18 -9
               C-26 -10 -31 -3 -27 3
               C-25 6 -21 6 -20 3
               C-19 0 -16 -1 -12 1
               C-7 3 -3 6 0 10
               C3 6 7 3 12 1
               C16 -1 19 0 20 3
               C21 6 25 6 27 3
               C31 -3 26 -10 18 -9
               C10 -8 4 -2 0 4 Z"
          />
          <circle cy="19" r="3" opacity="0.5" />
        </g>
      ) : (
        // fiyonk
        <g fill={c.glyph}>
          <path d="M-4 0 L-24 -12 C-28 -14, -30 -8, -29 -3 C-28 3, -27 9, -23 11 L-4 2 Z" />
          <path d="M4 0 L24 -12 C28 -14, 30 -8, 29 -3 C28 3, 27 9, 23 11 L4 2 Z" />
          <circle r="5.5" />
          <circle cy="14" r="3" opacity="0.55" />
        </g>
      )}
    </svg>
  )
}
