import { Navigate, type RouteObject } from 'react-router'
import { RootLayout } from '@/app/RootLayout'
import { CreateUserPage } from '@/features/users/pages/CreateUserPage'
import { EditUserPage } from '@/features/users/pages/EditUserPage'
import { UserDetailPage } from '@/features/users/pages/UserDetailPage'
import { UsersListPage } from '@/features/users/pages/UsersListPage'
import { NotFoundPage } from '@/shared/pages/NotFoundPage'

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/users" replace /> },
      { path: 'users', element: <UsersListPage /> },
      { path: 'users/new', element: <CreateUserPage /> },
      { path: 'users/:id', element: <UserDetailPage /> },
      { path: 'users/:id/edit', element: <EditUserPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
