import { Outlet, createRootRoute } from '@tanstack/react-router'
import { AppSidebar } from '@/app/shell/app-sidebar'
import { Toaster } from '@/components/ui/sonner'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="flex min-h-svh">
      <AppSidebar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
