import { Navigate, type RouteObject } from 'react-router'
import { RootLayout } from '@/app/RootLayout'
import { UsersListPage } from '@/features/users/pages/UsersListPage'
import { NotFoundPage } from '@/shared/pages/NotFoundPage'

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/users" replace /> },
      { path: 'users', element: <UsersListPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
