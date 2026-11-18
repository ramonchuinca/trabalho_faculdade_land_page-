import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BadgeCheck, CalendarCheck, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { api, type Service } from '../lib/api'
import { money } from '../lib/format'
import { ServiceIcon } from '../lib/icons'
import { CardSkeletons, ErrorMsg } from '../components/ui'

const STEPS = [
  { icon: Sparkles, title: 'Escolha o serviço', text: 'Do check-up à especialidade, tudo em um só lugar.' },
  { icon: CalendarCheck, title: 'Reserve um horário livre', text: 'Veja a agenda do médico e marque em poucos cliques.' },
  { icon: BadgeCheck, title: 'Receba a confirmação', text: 'A recepção confirma com você por telefone ou WhatsApp.' },
]

export default function Home() {
  const { data: services, isLoading, isError } = useQuery({
    queryKey: ['services'],
    queryFn: () => api<Service[]>('/services'),
  })

  return (
    <>
      <section className="relative overflow-hidden">
        {/* Manchas de gradiente flutuantes ao fundo do hero. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 size-96 animate-float rounded-full bg-brand-500/25 blur-3xl" />
          <div className="absolute top-10 -right-24 size-[28rem] animate-float-slow rounded-full bg-accent-500/25 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-sm font-medium text-brand-700 backdrop-blur">
              <ShieldCheck className="size-4" /> Atendimento com hora marcada
            </span>
            <h1 className="mt-5 animate-fade-up text-4xl font-extrabold tracking-tight [animation-delay:80ms] sm:text-6xl">
              Cuide da sua saúde <span className="text-gradient">sem filas</span> e sem complicação.
            </h1>
            <p className="mt-5 max-w-xl animate-fade-up text-lg text-muted [animation-delay:160ms]">
              Veja os serviços da Vitalis, escolha seu médico, reserve o melhor horário e receba a confirmação direto da nossa recepção.
            </p>
            <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:240ms]">
              <Link to="/agendar" className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-brand-600 to-accent-600 px-6 py-3 font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:brightness-110">
                <CalendarCheck className="size-5" /> Agendar consulta
              </Link>
              <Link to="/servicos" className="group inline-flex items-center gap-2 rounded-xl border border-line bg-white/80 px-6 py-3 font-semibold backdrop-blur transition hover:border-brand-500 hover:bg-white">
                Ver serviços <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Cartão decorativo: simula a confirmação chegando. */}
          <div aria-hidden className="relative hidden animate-fade-up justify-center [animation-delay:200ms] lg:flex">
            <div className="glass w-80 animate-float rounded-3xl border border-white/70 p-5 shadow-glow">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-accent-500 text-white"><ServiceIcon name="heart-pulse" className="size-6" /></span>
                <div><p className="font-semibold">Cardiologia</p><p className="text-sm text-muted">Dr. Rafael Monteiro</p></div>
              </div>
              <p className="mt-4 rounded-xl bg-white/80 px-3 py-2 text-sm">Quarta, 10:00</p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"><BadgeCheck className="size-4" /> Confirmada pela recepção</p>
            </div>
            <div className="glass absolute -bottom-6 -left-2 flex animate-float-slow items-center gap-2 rounded-2xl border border-white/70 px-4 py-3 text-sm shadow-soft">
              <MessageCircle className="size-5 text-accent-600" /> “Posso trocar o horário?”
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="glass card-lift animate-fade-up rounded-2xl border border-white/70 p-5" style={{ animationDelay: `${i * 100}ms` }}>
              <span className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-accent-500 text-white"><s.icon className="size-5" /></span>
              <p className="mt-3 font-semibold"><span className="text-gradient">{i + 1}.</span> {s.title}</p>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold sm:text-3xl">Nossos serviços</h2>
        <p className="mt-1 text-muted">Do check-up à especialidade, tudo em um só lugar.</p>

        {isError && <div className="mt-8"><ErrorMsg>Não foi possível carregar os serviços. Verifique se a API está rodando.</ErrorMsg></div>}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading && <CardSkeletons n={4} />}
          {services?.map((s, i) => (
            <Link key={s._id} to={`/agendar?service=${s._id}`} className="card-lift animate-fade-up rounded-2xl border border-line bg-surface p-5 shadow-sm" style={{ animationDelay: `${Math.min(i, 7) * 60}ms` }}>
              <div className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-brand-50 to-accent-50 text-brand-600">
                <ServiceIcon name={s.icon} className="size-6" />
              </div>
              <h3 className="mt-4 font-semibold">{s.name}</h3>
              <p className="mt-1 line-clamp-3 text-sm text-muted">{s.description}</p>
              <p className="mt-3 text-sm font-medium text-brand-700">{money(s.price)} · {s.durationMin} min</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
