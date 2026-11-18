import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarCheck, ShieldCheck } from 'lucide-react'
import { api, type Service } from '../lib/api'
import { money } from '../lib/format'
import { ServiceIcon } from '../lib/icons'

export default function Home() {
  const { data: services, isLoading, isError } = useQuery({
    queryKey: ['services'],
    queryFn: () => api<Service[]>('/services'),
  })

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-canvas">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700">
            <ShieldCheck className="size-4" /> Atendimento com hora marcada
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Cuide da sua saúde sem sair de casa para marcar.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Veja os serviços da Vitalis, escolha seu médico e reserve o melhor horário em poucos cliques.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/agendar" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white shadow hover:bg-brand-700">
              <CalendarCheck className="size-5" /> Agendar consulta
            </Link>
            <Link to="/servicos" className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-6 py-3 font-semibold hover:bg-canvas">
              Ver serviços <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold">Nossos serviços</h2>
        <p className="mt-1 text-muted">Do check-up à especialidade, tudo em um só lugar.</p>

        {isLoading && <p className="mt-8 text-muted">Carregando serviços… (a API gratuita pode levar alguns segundos para acordar)</p>}
        {isError && <p className="mt-8 text-red-600">Não foi possível carregar os serviços. Verifique se a API está rodando.</p>}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services?.map((s) => (
            <article key={s._id} className="rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <ServiceIcon name={s.icon} className="size-6" />
              </div>
              <h3 className="mt-4 font-semibold">{s.name}</h3>
              <p className="mt-1 line-clamp-3 text-sm text-muted">{s.description}</p>
              <p className="mt-3 text-sm font-medium text-brand-700">{money(s.price)} · {s.durationMin} min</p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
