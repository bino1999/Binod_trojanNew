import { useState, useCallback, useMemo } from 'react'
import { ToastContext, setToastFn, useToast } from '@/hooks/use-toast'
import {
  ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose,
} from '@/components/ui/toast'

function scheduleRemove(id, setToasts, duration) {
  const doRemove = () => setToasts((prev) => prev.filter((t) => t.id !== id))
  const doClose = () => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)))
    setTimeout(doRemove, 300)
  }
  setTimeout(doClose, duration)
}

export function ToastContextProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback(({ title, description, variant = 'default', duration = 4000 }) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, title, description, variant, open: true }])
    scheduleRemove(id, setToasts, duration)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)))
  }, [])

  setToastFn(toast)

  const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, open }) => (
        <Toast key={id} open={open} variant={variant}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
