import { Link, NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, HeartPulse, LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '../lib/auth'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${isActive ? 'text-brand-700' : 'text-muted hover:text-ink'}`

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
            <HeartPulse className="size-6" /> Vitalis
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/servicos" className={navClass}>Serviços</NavLink>
            <NavLink to="/profissionais" className={navClass}>Profissionais</NavLink>
            {user && <NavLink to="/minhas-consultas" className={navClass}>Minhas consultas</NavLink>}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden items-center gap-1 text-sm text-muted sm:flex">
                  <UserIcon className="size-4" /> {user.name.split(' ')[0]}
                </span>
                <button onClick={logout} aria-label="Sair" className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink">
                  <LogOut className="size-5" />
                </button>
              </>
            ) : (
              <Link to="/entrar" className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-ink">Entrar</Link>
            )}
            <Link
              to="/agendar"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              <CalendarDays className="size-4" /> Agendar
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface py-8 text-center text-sm text-muted">
        © {new Date().getFullYear()} Vitalis Clínica — projeto de portfólio com dados fictícios.
      </footer>
    </div>
  )
}
