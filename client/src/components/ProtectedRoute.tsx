import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import type { Role } from '../lib/api'
import { Loading } from './ui'

// Exige sessão (e, se `roles` vier, um desses papéis). Guarda a rota de origem para voltar depois do login.
export default function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading text="Verificando sua sessão…" />
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === 'admin' ? '/painel' : '/'} replace />
  return <Outlet />
}
