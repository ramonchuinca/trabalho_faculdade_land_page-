import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, CalendarX, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { api, type Appointment } from '../lib/api'
import { dateTimeOf, money } from '../lib/format'
import { ServiceIcon } from '../lib/icons'
import { btnPrimary, ErrorMsg, Loading, PageHeader } from '../components/ui'

const CHANNEL: Record<string, string> = { phone: 'telefone', whatsapp: 'WhatsApp', chat: 'chat', other: 'a recepção' }

// 'Agendada' só vira 'Confirmada' depois que a recepção fala com o paciente.
function statusOf(a: Appointment) {
  if (a.status === 'cancelled') return { label: 'Cancelada', cls: 'bg-slate-100 text-slate-500', icon: XCircle }
  if (a.status === 'completed') return { label: 'Concluída', cls: 'bg-sky-100 text-sky-700', icon: CheckCircle2 }
  if (a.confirmedAt) return { label: 'Confirmada', cls: 'bg-emerald-100 text-emerald-700', icon: BadgeCheck }
  return { label: 'Aguardando confirmação', cls: 'bg-amber-100 text-amber-800', icon: Clock }
}

export default function MyAppointments() {
  const qc = useQueryClient()
  const booked = (useLocation().state as { booked?: boolean } | null)?.booked

  const { data, isLoading, isError } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api<Appointment[]>('/appointments'),
  })

  const cancel = useMutation({
    mutationFn: (id: string) => api(`/appointments/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['slots'] })
    },
  })

  const now = Date.now()
  // A API devolve por start decrescente; próximas consultas ficam em ordem cronológica.
  const upcoming = data?.filter((a) => a.status === 'scheduled' && new Date(a.start).getTime() > now).reverse() ?? []
  const past = data?.filter((a) => !upcoming.includes(a)) ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="Minhas consultas" />

      {booked && (
        <div role="status" className="mb-6 animate-pop rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-teal-50 p-4 text-emerald-900">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5" /> Consulta agendada com sucesso!</p>
          <p className="mt-1 text-sm text-emerald-800/80">Agora é com a gente: a recepção vai entrar em contato por telefone ou WhatsApp para <strong>confirmar</strong> seu horário. Você também pode tirar dúvidas pelo chat no canto da tela.</p>
        </div>
      )}
      {isLoading && <Loading />}
      {isError && <ErrorMsg>Não foi possível carregar suas consultas.</ErrorMsg>}
      {cancel.isError && <div className="mb-4"><ErrorMsg>{(cancel.error as Error).message}</ErrorMsg></div>}

      {data && data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <CalendarX className="mx-auto size-10 text-muted" />
          <p className="mt-3 text-muted">Você ainda não tem consultas.</p>
          <Link to="/agendar" className={`${btnPrimary} mt-4`}>Agendar agora</Link>
        </div>
      )}

      {upcoming.length > 0 && <Section title="Próximas" items={upcoming} onCancel={(id) => {
        if (confirm('Cancelar esta consulta?')) cancel.mutate(id)
      }} pendingId={cancel.isPending ? cancel.variables : undefined} />}
      {past.length > 0 && <Section title="Histórico" items={past} />}
    </div>
  )
}

function Section({ title, items, onCancel, pendingId }: { title: string; items: Appointment[]; onCancel?: (id: string) => void; pendingId?: string }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <ul className="space-y-3">
        {items.map((a) => {
          const st = statusOf(a)
          return (
            <li key={a._id} className="card-lift flex animate-fade-up items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <ServiceIcon name={a.service.icon} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.service.name}</p>
                <p className="text-sm text-muted">{a.doctor.name} · {money(a.service.price)}</p>
                <p className="mt-1 text-sm">{dateTimeOf(a.start)}</p>
                {a.status === 'scheduled' && !!a.reschedules?.length && <p className="mt-0.5 text-xs text-accent-700">Horário alterado pela recepção (era {dateTimeOf(a.reschedules.at(-1)!.from)})</p>}
                {a.status === 'scheduled' && a.confirmedAt && <p className="mt-0.5 text-xs text-emerald-700">Confirmada pela recepção via {CHANNEL[a.confirmChannel ?? 'other']}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}><st.icon className="size-3.5" />{st.label}</span>
                {onCancel && a.status === 'scheduled' && (
                  <button onClick={() => onCancel(a._id)} disabled={pendingId === a._id} className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50">
                    {pendingId === a._id ? 'Cancelando…' : 'Cancelar'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
