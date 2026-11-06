import { Link, Outlet } from 'react-router'
import { ResetDataButton } from '@/features/users/components/ResetDataButton'

export function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/users" className="text-lg font-semibold">
            User Management
          </Link>
          <ResetDataButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
