import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'warning'

export interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void
}

export const TOAST_DURATION_MS = 4000

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
