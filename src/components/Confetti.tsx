import { useEffect, useMemo, useState } from 'react'

const COLORS = ['#f8a9c2', '#ffc7a6', '#8ea6f2', '#b9a6f5', '#9fe0c1', '#ffe08a']

/** Puan kazaninca dokulen kagitlar. 2.6 saniye sonra kendini kaldirir. */
export function Confetti({ onDone }: { onDone?: () => void }) {
  const [alive, setAlive] = useState(true)

  const pieces = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        key: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.6 + Math.random() * 1.1,
        color: COLORS[i % COLORS.length],
        rotate: Math.random() * 360,
      })),
    [],
  )

  useEffect(() => {
    const t = setTimeout(() => {
      setAlive(false)
      onDone?.()
    }, 2600)
    return () => clearTimeout(t)
  }, [onDone])

  if (!alive) return null

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <i
          key={p.key}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}
