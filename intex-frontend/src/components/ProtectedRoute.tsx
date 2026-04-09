import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../state/useAuth'
import type { ReactNode } from 'react'

type ProtectedRouteProps = {
  requiredRole?: string
  allowedRoles?: string[]
  children?: ReactNode
}

export function ProtectedRoute({ requiredRole, allowedRoles, children }: ProtectedRouteProps) {
  const { token, hasRole } = useAuth()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  const roleAllowed =
    (requiredRole ? hasRole(requiredRole) : true) &&
    (allowedRoles?.length ? allowedRoles.some((r) => hasRole(r)) : true)

  if (!roleAllowed) {
    if (hasRole('Donor')) {
      return <Navigate to="/admin" replace />
    }
    return <Navigate to="/impact" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
