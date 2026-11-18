import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, type Service } from '../lib/api'
import { money } from '../lib/format'
import { ServiceIcon } from '../lib/icons'
import { ErrorMsg, Loading, PageHeader } from '../components/ui'

export default function Services() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['services'], queryFn: () => api<Service[]>('/services') })

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title="Serviços" subtitle="Escolha o atendimento e agende em poucos cliques." />
      {isLoading && <Loading />}
      {isError && <ErrorMsg>Não foi possível carregar os serviços.</ErrorMsg>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((s) => (
          <article key={s._id} className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ServiceIcon name={s.icon} className="size-6" />
            </div>
            <h2 className="mt-4 font-semibold">{s.name}</h2>
            <p className="mt-1 flex-1 text-sm text-muted">{s.description}</p>
            <p className="mt-3 text-sm font-medium text-brand-700">{money(s.price)} · {s.durationMin} min</p>
            <Link to={`/agendar?service=${s._id}`} className="mt-4 rounded-lg bg-brand-50 py-2 text-center text-sm font-semibold text-brand-700 hover:bg-brand-100">
              Agendar
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}
