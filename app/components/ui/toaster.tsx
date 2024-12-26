import { lazy, Suspense } from "react"
import { useToast } from "~/hooks/use-toast"

const Toast = lazy(() => import("~/components/ui/toast").then(mod => ({ default: mod.Toast })))
const ToastClose = lazy(() => import("~/components/ui/toast").then(mod => ({ default: mod.ToastClose })))
const ToastDescription = lazy(() => import("~/components/ui/toast").then(mod => ({ default: mod.ToastDescription })))
const ToastProvider = lazy(() => import("~/components/ui/toast").then(mod => ({ default: mod.ToastProvider })))
const ToastTitle = lazy(() => import("~/components/ui/toast").then(mod => ({ default: mod.ToastTitle })))
const ToastViewport = lazy(() => import("~/components/ui/toast").then(mod => ({ default: mod.ToastViewport })))

export function Toaster() {
  const { toasts } = useToast()

  return (
    <Suspense fallback={null}>
      <ToastProvider>
        {toasts.map(function ({ id, title, description, action, ...props }) {
          return (
            <Toast key={id} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose />
            </Toast>
          )
        })}
        <ToastViewport />
      </ToastProvider>
    </Suspense>
  )
}