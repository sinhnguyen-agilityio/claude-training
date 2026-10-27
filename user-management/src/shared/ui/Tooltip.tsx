import { useId, useState, type ReactNode } from 'react'

export interface TooltipProps {
  /** The tooltip text. Nothing is shown while it is empty. */
  content: string | undefined
  /** Receives the id to pass as `aria-describedby` to the trigger. */
  children: (describedBy: string) => ReactNode
}

/**
 * A text tooltip for a focusable trigger. It opens on hover and keyboard focus, and Escape
 * dismisses it without moving focus.
 */
export function Tooltip({ content, children }: TooltipProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const visible = open && Boolean(content)

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
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
