import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { formatMemberNo } from '../lib/format'
import { ROLE_LABEL, type Role } from '../lib/types'

interface Props {
  role: Role
  memberNo: string
  since: number
}

/**
 * Ana ekranin tepesindeki uyelik karti. Uzerindeki Code128 barkod tamamen
 * dekoratif — market kartinin sovunu tamamliyor, kimse okutmuyor.
 */
export function MemberCard({ role, memberNo, since }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return
    JsBarcode(svgRef.current, memberNo, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      height: 54,
      width: 1.6,
      lineColor: '#2b2531',
      background: 'transparent',
    })
  }, [memberNo])

  const year = new Date(since).getFullYear()

  return (
    <div className="member-card">
      <div className="member-card__brand">
        <span aria-hidden="true">🏷️</span>
        <span>Puan Programı</span>
      </div>
      <div className="member-card__name">{ROLE_LABEL[role]}</div>
      <div className="member-card__sub">
        Üye No {formatMemberNo(memberNo)} · {year}'den beri üye
      </div>
      <div className="member-card__barcode">
        <svg ref={svgRef} aria-hidden="true" />
      </div>
    </div>
  )
}
