import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Loading } from './ui'

// Exige sessão. Guarda a rota de origem para voltar depois do login.
export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading text="Verificando sua sessão…" />
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}
