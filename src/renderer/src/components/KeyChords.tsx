import type { MusicalKey } from '@shared/types'
import { chordsInKey } from '@shared/music'

/** Chords that belong to `musicalKey`, primary ones (I-IV-V) highlighted. Shown under key pickers. */
export function KeyChords({
  musicalKey,
  compact,
  className = ''
}: {
  musicalKey: MusicalKey | null
  /** Smaller chips and a one-line hint, for the narrow column beside the chords. */
  compact?: boolean
  className?: string
}): React.JSX.Element | null {
  if (!musicalKey) return null
  const { chords, spelledAs, dominant } = chordsInKey(musicalKey)
  const strong = (text: string): React.JSX.Element => (
    <span className="font-mono font-bold text-foreground">{text}</span>
  )

  return (
    <div
      className={`flex flex-col rounded-lg border border-border bg-muted/40 ${
        compact ? 'gap-1.5 p-2' : 'gap-2 p-3'
      } ${className}`}
    >
      <p className="text-xs text-muted-foreground">
        คอร์ดในคีย์ {strong(musicalKey)}
        {spelledAs && ` (เขียนแบบ ${spelledAs} จะอ่านง่ายกว่า)`}
        <span className="ml-2 inline-flex items-center gap-1">
          · <span className="inline-block size-2.5 rounded-sm bg-primary" /> คอร์ดหลัก
        </span>
      </p>
      <ul className={`grid grid-cols-7 ${compact ? 'gap-1' : 'gap-1.5'}`}>
        {chords.map((c) => (
          <li
            key={c.degree}
            title={c.primary ? 'คอร์ดหลัก' : undefined}
            className={`flex min-w-0 flex-col items-center rounded-md border px-0.5 ${
              compact ? 'py-1' : 'py-1.5'
            } ${
              c.primary
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background'
            }`}
          >
            <span
              className={`${compact ? 'text-[9px]' : 'text-[10px]'} ${
                c.primary ? 'opacity-80' : 'text-muted-foreground'
              }`}
            >
              {c.degree}
            </span>
            <span
              className={`max-w-full truncate font-mono font-bold ${compact ? 'text-xs' : 'text-sm'}`}
            >
              {c.name}
            </span>
          </li>
        ))}
      </ul>
      {dominant &&
        (compact ? (
          <p className="text-xs text-muted-foreground">
            นิยมใช้ {strong(dominant)} / {strong(`${dominant}7`)} แทน v
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            คีย์ไมเนอร์นิยมใช้ {strong(dominant)} หรือ {strong(`${dominant}7`)} (V) แทนคอร์ด v
            ไมเนอร์ เพื่อให้ส่งกลับเข้าคอร์ด i ได้หนักแน่นขึ้น
          </p>
        ))}
    </div>
  )
}
