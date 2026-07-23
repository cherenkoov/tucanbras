'use client'

// Honeypot — off-screen; bots that fill it get a fake success upstream
// (the API returns {ok:true} with no side effects when the field is non-empty).
// The input's name is deliberately meaningless: browser autofill matches on
// name/id heuristics (a field literally named "website" can get profile-filled
// despite autoComplete="off", silently dropping a real visitor's lead), while
// naive bots fill every text input regardless of name. Shared by both lead
// forms so the anti-bot contract can't drift apart.
export default function HoneypotField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <input
      type="text"
      name="xtr_note"
      value={value}
      onChange={e => onChange(e.target.value)}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      className="absolute -left-[9999px] w-px h-px overflow-hidden"
    />
  )
}
