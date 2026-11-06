import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { createQueryClient } from '@/app/queryClient'
import { routes } from '@/app/routes'
import { ToastProvider } from '@/shared/ui/ToastProvider'

// BASE_URL is Vite's `base` ('/' or e.g. '/claude-training/'); React Router wants no trailing slash.
const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
})

export function App() {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  )
}
