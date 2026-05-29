import { createContext, useContext } from 'react'

export const ToastContext = createContext(null)

let _toast = null

export function setToastFn(fn) {
  _toast = fn
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastContextProvider')
  return ctx
}

export function toast(opts) {
  if (_toast) _toast(opts)
}
