import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export interface TooltipProps {
  /** The tooltip text. Nothing is shown while it is empty. */
  content: string | undefined
  /** Receives the id to pass as `aria-describedby` to the trigger. */
  children: (describedBy: string) => ReactNode
}

/**
 * A text tooltip for a focusable trigger. It opens on hover, keyboard focus and tap, and Escape
 * (or a press outside) dismisses it without moving focus.
 */
export function Tooltip({ content, children }: TooltipProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLSpanElement>(null)
  // Forget a hover or focus from before the content went away, so it does not reappear unasked.
  if (!content && open) setOpen(false)
  const visible = open && Boolean(content)

  useEffect(() => {
    if (!open) return
    // A tap on touch screens neither hovers nor always focuses, so a tap elsewhere closes it.
    function closeOnOutsidePress(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePress)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress)
  }, [open])

  return (
    <span
      ref={wrapper}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen(true)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      {children(id)}
      <span
        id={id}
        role="tooltip"
        hidden={!visible}
        className="absolute top-full right-0 z-10 mt-1 rounded-md bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow"
      >
        {content}
      </span>
    </span>
  )
}
