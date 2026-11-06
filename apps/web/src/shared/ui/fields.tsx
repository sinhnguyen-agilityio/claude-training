import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'

interface FieldProps {
  label: string
  error?: string
  hint?: string
}

const controlClass =
  'mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 aria-invalid:border-red-600'

/** Label, control and messages wired together: `htmlFor`, `aria-describedby` and `aria-invalid`. */
function Field({
  label,
  error,
  hint,
  id,
  required,
  children,
}: FieldProps & {
  id: string
  required?: boolean
  children: (describedBy: string | undefined) => ReactNode
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-600">
            {' *'}
          </span>
        )}
      </label>
      {children(describedBy)}
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export type TextFieldProps = FieldProps & ComponentPropsWithRef<'input'>

export function TextField({
  label,
  error,
  hint,
  id,
  required,
  className = '',
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <Field label={label} error={error} hint={hint} id={fieldId} required={required}>
      {(describedBy) => (
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={`${controlClass} ${className}`}
          {...inputProps}
        />
      )}
    </Field>
  )
}

export interface SelectOption {
  value: string
  label: string
}

export type SelectFieldProps = FieldProps &
  ComponentPropsWithRef<'select'> & {
    options: readonly SelectOption[]
    /** Adds an empty first option with this text. */
    placeholder?: string
  }

export function SelectField({
  label,
  error,
  hint,
  id,
  required,
  options,
  placeholder,
  className = '',
  ...selectProps
}: SelectFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <Field label={label} error={error} hint={hint} id={fieldId} required={required}>
      {(describedBy) => (
        <select
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={`${controlClass} bg-white ${className}`}
          {...selectProps}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}
