import { Loader2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

const BUTTON_VARIANTS = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  outline: 'border border-border hover:bg-muted',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  danger: 'text-primary hover:bg-primary/10'
} as const

export function Button({
  variant = 'primary',
  loading,
  className = '',
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANTS
  loading?: boolean
}): React.JSX.Element {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 ${BUTTON_VARIANTS[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </button>
  )
}

const CONTROL =
  'w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none'

export function Input({
  className = '',
  ...props
}: React.ComponentProps<'input'>): React.JSX.Element {
  return <input className={`${CONTROL} h-9 ${className}`} {...props} />
}

export function Select({
  className = '',
  ...props
}: React.ComponentProps<'select'>): React.JSX.Element {
  return <select className={`${CONTROL} h-9 ${className}`} {...props} />
}

export function Textarea({
  className = '',
  ...props
}: React.ComponentProps<'textarea'>): React.JSX.Element {
  return <textarea className={`${CONTROL} py-2 ${className}`} {...props} />
}

export function Field({
  label,
  className = '',
  children
}: {
  label: string
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

/** Native <dialog>: Esc, focus trap and backdrop come from Chromium. */
export function Dialog({
  open,
  onClose,
  title,
  children
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(720px,calc(100%-2rem))] rounded-lg border border-border bg-card p-0 text-foreground shadow-2xl"
    >
      {open && (
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="ปิด"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
        </div>
      )}
    </dialog>
  )
}

const BADGE_TONES = {
  neutral: 'border-border text-muted-foreground',
  primary: 'border-primary/50 text-primary',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
} as const
export type BadgeTone = keyof typeof BADGE_TONES

export function Badge({
  tone = 'neutral',
  className = '',
  children
}: {
  tone?: BadgeTone
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  children
}: {
  icon: React.ReactNode
  title: string
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
      <span className="[&_svg]:size-8">{icon}</span>
      <p className="text-sm">{title}</p>
      {children}
    </div>
  )
}

/** Left list pane; when closed it is gone entirely (the toggle lives in the app header). */
export function SidePane({
  open,
  label,
  className = '',
  children
}: {
  open: boolean
  label: string
  /** Width when open, e.g. `w-[380px]`. */
  className?: string
  children: React.ReactNode
}): React.JSX.Element | null {
  if (!open) return null
  return (
    <aside
      aria-label={label}
      className={`flex shrink-0 flex-col border-r border-border ${className}`}
    >
      {children}
    </aside>
  )
}
