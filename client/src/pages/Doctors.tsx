import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, type Doctor, type Service } from '../lib/api'
import { Avatar, ErrorMsg, Loading, PageHeader } from '../components/ui'

export default function Doctors() {
  const doctors = useQuery({ queryKey: ['doctors'], queryFn: () => api<Doctor[]>('/doctors') })
  const services = useQuery({ queryKey: ['services'], queryFn: () => api<Service[]>('/services') })

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title="Profissionais" subtitle="Conheça a equipe que cuida de você." />
      {doctors.isLoading && <Loading />}
      {doctors.isError && <ErrorMsg>Não foi possível carregar os profissionais.</ErrorMsg>}
      <div className="grid gap-4 md:grid-cols-2">
        {doctors.data?.map((d) => {
          // Agendar direto com o médico: se ele faz um só serviço, pula o passo de serviço.
          const own = services.data?.filter((s) => d.services.includes(s._id)) ?? []
          const target = own.length === 1 ? `/agendar?service=${own[0]._id}&doctor=${d._id}` : own.length ? `/agendar?service=${own[0]._id}` : '/agendar'
          return (
            <article key={d._id} className="flex gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <Avatar name={d.name} photoUrl={d.photoUrl} />
              <div className="flex-1">
                <h2 className="font-semibold">{d.name}</h2>
                <p className="text-sm text-brand-700">{d.specialty} · {d.crm}</p>
                <p className="mt-2 text-sm text-muted">{d.bio}</p>
                {own.length > 0 && <p className="mt-2 text-xs text-muted">{own.map((s) => s.name).join(' · ')}</p>}
                <Link to={target} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">Agendar →</Link>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
