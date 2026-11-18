import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, HeartPulse, LayoutDashboard, LogOut, MessageCircle, User as UserIcon } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import ChatWidget from './Chat'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative text-sm font-medium transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:rounded-full after:bg-linear-to-r after:from-brand-600 after:to-accent-600 after:transition-all ${
    isActive ? 'text-brand-700 after:w-full' : 'text-muted after:w-0 hover:text-ink hover:after:w-full'}`

export default function Layout() {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { pathname } = useLocation()

  // Selo de mensagens novas para a recepção.
  const unread = useQuery({
    queryKey: ['chat', 'unread'],
    queryFn: () => api<{ count: number }>('/chat/unread'),
    enabled: isAdmin,
    refetchInterval: 8000,
  })

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="glass sticky top-0 z-20 border-b border-white/60 shadow-[0_1px_0_0_rgb(15_23_42/0.05)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to={isAdmin ? '/painel' : '/'} className="group flex items-center gap-2 text-lg font-bold">
            <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-accent-600 text-white shadow-glow transition group-hover:rotate-6 group-hover:scale-105">
              <HeartPulse className="size-5" />
            </span>
            <span className="text-gradient">Vitalis</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {isAdmin ? (
              <>
                <NavLink to="/painel" end className={navClass}>Agendamentos</NavLink>
                <NavLink to="/painel/mensagens" className={navClass}>
                  <span className="inline-flex items-center gap-1.5">
                    Mensagens
                    {!!unread.data?.count && <span className="flex size-5 animate-pop items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white">{unread.data.count > 9 ? '9+' : unread.data.count}</span>}
                  </span>
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/servicos" className={navClass}>Serviços</NavLink>
                <NavLink to="/profissionais" className={navClass}>Profissionais</NavLink>
                {user && <NavLink to="/minhas-consultas" className={navClass}>Minhas consultas</NavLink>}
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden items-center gap-1 text-sm text-muted sm:flex">
                  <UserIcon className="size-4" /> {user.name.split(' ')[0]}
                  {isAdmin && <span className="ml-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-700">Recepção</span>}
                </span>
                <button onClick={logout} aria-label="Sair" className="rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink">
                  <LogOut className="size-5" />
                </button>
              </>
            ) : (
              <Link to="/entrar" className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-ink">Entrar</Link>
            )}
            {isAdmin ? (
              <Link to="/painel/mensagens" aria-label="Mensagens" className="rounded-xl bg-accent-50 p-2.5 text-accent-700 md:hidden"><MessageCircle className="size-5" /></Link>
            ) : (
              <Link
                to="/agendar"
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:brightness-110"
              >
                <CalendarDays className="size-4" /> Agendar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* key = rota: a página nova entra com a animação de fade-up. */}
      <main key={pathname.split('/')[1]} className="flex-1 animate-fade-in">
        <Outlet />
      </main>

      <footer className="border-t border-line/70 bg-surface/60 py-8 text-center text-sm text-muted backdrop-blur">
        <p className="inline-flex items-center gap-1.5"><LayoutDashboard className="size-4 text-brand-600" /> © {new Date().getFullYear()} Vitalis Clínica — projeto de portfólio com dados fictícios.</p>
      </footer>

      <ChatWidget />
    </div>
  )
}
