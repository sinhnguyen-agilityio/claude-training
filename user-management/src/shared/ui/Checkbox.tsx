import { useEffect, useRef, type ComponentPropsWithRef } from 'react'

interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> {
  /** The accessible name. Rendered as `aria-label`, because checkboxes in a table have no visible text. */
  label: string
  indeterminate?: boolean
}

/** A labelled checkbox that can show the mixed state (e.g. "some rows selected"). */
export function Checkbox({
  label,
  indeterminate = false,
  className = '',
  ...props
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)

  // `indeterminate` is a DOM property with no HTML attribute, so it has to be set imperatively.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      className={`size-4 rounded border-slate-300 accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}
