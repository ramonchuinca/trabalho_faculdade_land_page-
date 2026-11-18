import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { btnPrimary, ErrorMsg, inputClass } from '../components/ui'

type Mode = 'login' | 'register'

export default function Auth({ mode }: { mode: Mode }) {
  const { user, login, register } = useAuth()
  const location = useLocation()
  const explicitFrom = (location.state as { from?: string } | null)?.from

  const [form, setForm] = useState({ name: '', email: '', password: '', cpf: '', phone: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Quem tem rota de origem volta para ela; senão, cada papel cai na sua tela inicial.
  if (user) return <Navigate to={explicitFrom ?? (user.role === 'admin' ? '/painel' : '/minhas-consultas')} replace />

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value })),
  })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(form.email, form.password)
      else await register({ name: form.name, email: form.email, password: form.password, cpf: form.cpf || undefined, phone: form.phone })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const isLogin = mode === 'login'
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{isLogin ? 'Entrar' : 'Criar conta'}</h1>
      <p className="mt-1 text-muted">{isLogin ? 'Acesse para agendar e gerenciar suas consultas.' : 'Leva menos de um minuto.'}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-sm">
        {!isLogin && (
          <label className="block text-sm font-medium">Nome completo
            <input className={inputClass} required minLength={2} autoComplete="name" {...field('name')} />
          </label>
        )}
        <label className="block text-sm font-medium">E-mail
          <input className={inputClass} type="email" required autoComplete="email" {...field('email')} />
        </label>
        <label className="block text-sm font-medium">Senha
          <input className={inputClass} type="password" required minLength={isLogin ? 1 : 8} autoComplete={isLogin ? 'current-password' : 'new-password'} {...field('password')} />
          {!isLogin && <span className="text-xs font-normal text-muted">Mínimo de 8 caracteres.</span>}
        </label>
        {!isLogin && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">CPF <span className="font-normal text-muted">(opcional)</span>
              <input className={inputClass} inputMode="numeric" {...field('cpf')} />
            </label>
            <label className="block text-sm font-medium">Telefone / WhatsApp
              <input className={inputClass} type="tel" required autoComplete="tel" placeholder="(11) 91234-5678" pattern="[0-9()\s+\-]{10,20}" title="Informe o DDD e o número" {...field('phone')} />
              <span className="text-xs font-normal text-muted">A recepção confirma seu agendamento por aqui.</span>
            </label>
          </div>
        )}

        {error && <ErrorMsg>{error}</ErrorMsg>}

        <button className={`${btnPrimary} w-full`} disabled={busy}>
          {busy ? 'Aguarde…' : isLogin ? 'Entrar' : 'Criar conta'}
        </button>
      </form>

      {isLogin && (
        <div className="mt-4 rounded-2xl border border-dashed border-accent-100 bg-accent-50/60 p-4 text-sm">
          <p className="font-semibold text-accent-700">Contas de demonstração (senha: senha12345)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[['Paciente', 'paciente@vitalis.test'], ['Recepção', 'admin@vitalis.test']].map(([label, email]) => (
              <button key={email} type="button" onClick={() => setForm((f) => ({ ...f, email, password: 'senha12345' }))}
                className="rounded-lg bg-white px-3 py-1.5 font-medium shadow-sm ring-1 ring-line transition hover:ring-accent-500">
                Entrar como {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-sm text-muted">
        {isLogin ? 'Ainda não tem conta? ' : 'Já tem conta? '}
        <Link to={isLogin ? '/cadastro' : '/entrar'} state={location.state} className="font-semibold text-brand-700 hover:underline">
          {isLogin ? 'Cadastre-se' : 'Entrar'}
        </Link>
      </p>
    </div>
  )
}
