import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, type Service } from '../lib/api'
import { money } from '../lib/format'
import { ServiceIcon } from '../lib/icons'
import { CardSkeletons, ErrorMsg, PageHeader } from '../components/ui'

export default function Services() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['services'], queryFn: () => api<Service[]>('/services') })

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title="Serviços" subtitle="Escolha o atendimento e agende em poucos cliques." />
      {isError && <ErrorMsg>Não foi possível carregar os serviços.</ErrorMsg>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <CardSkeletons n={6} className="h-56" />}
        {data?.map((s, i) => (
          <article key={s._id} className="card-lift flex animate-fade-up flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
            <div className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-brand-50 to-accent-50 text-brand-600">
              <ServiceIcon name={s.icon} className="size-6" />
            </div>
            <h2 className="mt-4 font-semibold">{s.name}</h2>
            <p className="mt-1 flex-1 text-sm text-muted">{s.description}</p>
            <p className="mt-3 text-sm font-medium text-brand-700">{money(s.price)} · {s.durationMin} min</p>
            <Link to={`/agendar?service=${s._id}`} className="mt-4 rounded-lg bg-linear-to-r from-brand-50 to-accent-50 py-2 text-center text-sm font-semibold text-brand-700 transition hover:from-brand-100 hover:to-accent-100">
              Agendar
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}
