import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { TOAST_DURATION_MS, ToastContext, type ToastTone } from '@/shared/ui/useToast'

interface Toast {
  id: number
  message: string
  tone: ToastTone
}

const toneClasses: Record<ToastTone, string> = {
  success: 'bg-slate-900',
  error: 'bg-red-700',
  warning: 'bg-amber-700',
}

/** Renders toasts in a live region so screen readers announce them; each one dismisses itself. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = ++nextId.current
      setToasts((current) => [...current, { id, message, tone }])
      setTimeout(() => dismiss(id), TOAST_DURATION_MS)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext value={value}>
      {children}
      <div
        role="status"
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-md px-4 py-3 text-sm text-white shadow-lg ${toneClasses[toast.tone]}`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="rounded px-1 text-white/80 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
