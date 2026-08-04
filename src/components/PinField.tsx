interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  onEnter?: () => void
}

export const PIN_MIN = 4
export const PIN_MAX = 6

export function isValidPin(pin: string): boolean {
  return pin.length >= PIN_MIN && pin.length <= PIN_MAX
}

export function PinField({ label, value, onChange, autoFocus, onEnter }: Props) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        className="input pin-input"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        // iOS'ta rakam klavyesi acilsin
        pattern="[0-9]*"
        maxLength={PIN_MAX}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, PIN_MAX))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnter?.()
        }}
      />
    </div>
  )
}
