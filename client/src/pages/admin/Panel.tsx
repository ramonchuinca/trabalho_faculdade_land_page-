import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, CalendarCheck2, CalendarClock, CalendarSync, CheckCheck, Clock, MessageCircle, Phone, Search, X } from 'lucide-react'
import { api, type Appointment, type ConfirmChannel, type PatientContact } from '../../lib/api'
import { clinicDate, confirmationText, dateTimeOf, money, phoneMask, telLink, whatsappLink } from '../../lib/format'
import { ServiceIcon } from '../../lib/icons'
import { CardSkeletons, ErrorMsg, PageHeader } from '../../components/ui'
import RescheduleDialog from './RescheduleDialog'

type Tab = 'pending' | 'confirmed' | 'history' | 'all'

const isLive = (a: Appointment) => a.status === 'scheduled'
const isPending = (a: Appointment) => isLive(a) && !a.confirmedAt
const patientOf = (a: Appointment) => (typeof a.patient === 'object' ? a.patient : ({ _id: String(a.patient), name: 'Paciente' } as PatientContact))

const CHANNELS: { id: ConfirmChannel; label: string }[] = [
  { id: 'phone', label: 'Telefone' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'chat', label: 'Chat' },
]
const CHANNEL_LABEL: Record<string, string> = { phone: 'telefone', whatsapp: 'WhatsApp', chat: 'chat', other: 'outro canal' }

export default function Panel() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('pending')
  const [q, setQ] = useState('')
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api<Appointment[]>('/appointments'),
    refetchInterval: 15_000, // novos agendamentos aparecem sozinhos
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['appointments'] })
    qc.invalidateQueries({ queryKey: ['slots'] })
  }
  const confirm = useMutation({
    mutationFn: (v: { id: string; channel: ConfirmChannel }) =>
      api(`/appointments/${v.id}/confirm`, { method: 'PATCH', body: JSON.stringify({ channel: v.channel }) }),
    onSuccess: refresh,
  })
  const cancel = useMutation({ mutationFn: (id: string) => api(`/appointments/${id}/cancel`, { method: 'PATCH' }), onSuccess: refresh })
  const complete = useMutation({ mutationFn: (id: string) => api(`/appointments/${id}/complete`, { method: 'PATCH' }), onSuccess: refresh })

  const all = useMemo(() => data ?? [], [data])
  const today = clinicDate()
  const stats = {
    pending: all.filter(isPending).length,
    confirmed: all.filter((a) => isLive(a) && a.confirmedAt).length,
    today: all.filter((a) => isLive(a) && clinicDate(new Date(a.start)) === today).length,
  }

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    const byTab = all.filter((a) =>
      tab === 'pending' ? isPending(a) : tab === 'confirmed' ? isLive(a) && a.confirmedAt : tab === 'history' ? !isLive(a) : true)
    const filtered = term ? byTab.filter((a) => patientOf(a).name.toLowerCase().includes(term)) : byTab
    // Em aberto: mais próximas primeiro. Histórico: mais recentes primeiro.
    const asc = tab !== 'history' && tab !== 'all'
    return [...filtered].sort((a, b) => (asc ? 1 : -1) * (new Date(a.start).getTime() - new Date(b.start).getTime()))
  }, [all, tab, q])

  const err = (confirm.error ?? cancel.error ?? complete.error) as Error | null
  const busyId = (confirm.isPending && confirm.variables?.id) || (cancel.isPending && cancel.variables) || (complete.isPending && complete.variables) || ''

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title="Painel da recepção" subtitle="Confirme os agendamentos falando com o paciente por telefone, WhatsApp ou chat.">
        <Link to="/painel/mensagens" className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold transition hover:border-brand-500 hover:bg-brand-50">
          <MessageCircle className="size-4" /> Mensagens
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Clock} label="Aguardando confirmação" value={stats.pending} tone="amber" delay={0} />
        <Stat icon={BadgeCheck} label="Confirmadas" value={stats.confirmed} tone="emerald" delay={80} />
        <Stat icon={CalendarClock} label="Consultas hoje" value={stats.today} tone="brand" delay={160} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="glass inline-flex rounded-xl border border-line p-1 text-sm font-medium">
          {([['pending', 'Pendentes'], ['confirmed', 'Confirmadas'], ['history', 'Histórico'], ['all', 'Todas']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`rounded-lg px-3.5 py-1.5 transition ${tab === id ? 'bg-linear-to-r from-brand-600 to-accent-600 text-white shadow' : 'text-muted hover:text-ink'}`}>
              {label}{id === 'pending' && stats.pending > 0 && <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 text-xs font-bold text-amber-950">{stats.pending}</span>}
            </button>
          ))}
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar paciente…" aria-label="Buscar paciente"
            className="w-56 rounded-xl border border-line bg-surface py-2 pr-3 pl-9 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-100" />
        </label>
      </div>

      {err && <div className="mt-4"><ErrorMsg>{err.message}</ErrorMsg></div>}
      {isError && <div className="mt-4"><ErrorMsg>Não foi possível carregar os agendamentos.</ErrorMsg></div>}

      <div className="mt-5 space-y-3">
        {isLoading && <CardSkeletons n={3} className="h-28" />}
        {data && list.length === 0 && (
          <div className="animate-fade-in rounded-2xl border border-dashed border-line bg-surface/70 p-12 text-center text-muted">
            <CalendarCheck2 className="mx-auto size-10 text-brand-500" />
            <p className="mt-3">{tab === 'pending' ? 'Tudo em dia! Nenhum agendamento aguardando confirmação.' : 'Nada por aqui.'}</p>
          </div>
        )}
        {list.map((a, i) => (
          <Row key={a._id} a={a} index={i} busy={busyId === a._id}
            onConfirm={(channel) => confirm.mutate({ id: a._id, channel })}
            onCancel={() => { if (confirm_('Cancelar esta consulta? O horário volta a ficar livre.')) cancel.mutate(a._id) }}
            onComplete={() => complete.mutate(a._id)} onReschedule={() => setRescheduling(a)} />
        ))}
      </div>

      {rescheduling && <RescheduleDialog appt={rescheduling} onClose={() => setRescheduling(null)} />}
    </div>
  )
}

const confirm_ = (m: string) => window.confirm(m)

const TONES = {
  amber: 'from-amber-400 to-orange-400',
  emerald: 'from-emerald-400 to-teal-500',
  brand: 'from-brand-500 to-accent-500',
} as const

function Stat({ icon: Icon, label, value, tone, delay }: { icon: typeof Clock; label: string; value: number; tone: keyof typeof TONES; delay: number }) {
  return (
    <div className="glass animate-fade-up flex items-center gap-4 rounded-2xl border border-white/70 p-5 shadow-soft" style={{ animationDelay: `${delay}ms` }}>
      <span className={`flex size-12 items-center justify-center rounded-2xl bg-linear-to-br ${TONES[tone]} text-white shadow`}><Icon className="size-6" /></span>
      <div>
        <p className="text-3xl leading-none font-bold">{value}</p>
        <p className="mt-1 text-sm text-muted">{label}</p>
      </div>
    </div>
  )
}

function Row({ a, index, busy, onConfirm, onCancel, onComplete, onReschedule }: {
  a: Appointment; index: number; busy: boolean
  onConfirm: (c: ConfirmChannel) => void; onCancel: () => void; onComplete: () => void; onReschedule: () => void
}) {
  const [choosing, setChoosing] = useState(false)
  const p = patientOf(a)
  const pending = isPending(a)
  const msg = confirmationText({ patient: p.name, service: a.service.name, doctor: a.doctor.name, start: a.start })

  const badge = a.status === 'cancelled' ? ['Cancelada', 'bg-slate-100 text-slate-500']
    : a.status === 'completed' ? ['Concluída', 'bg-sky-100 text-sky-700']
    : a.confirmedAt ? [`Confirmada · ${CHANNEL_LABEL[a.confirmChannel ?? 'other']}`, 'bg-emerald-100 text-emerald-700']
    : ['Aguardando confirmação', 'bg-amber-100 text-amber-800']

  const act = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50'
  return (
    <article className={`card-lift animate-fade-up rounded-2xl border bg-surface p-4 shadow-sm sm:p-5 ${pending ? 'border-amber-200' : 'border-line'}`} style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><ServiceIcon name={a.service.icon} className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{p.name}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge[1]}`}>{badge[0]}</span>
            {!!a.reschedules?.length && <span className="rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-medium text-accent-700">Reagendada{a.reschedules.length > 1 ? ` ${a.reschedules.length}x` : ''}</span>}
          </div>
          <p className="text-sm text-muted">{a.service.name} · {a.doctor.name} · {money(a.service.price)}</p>
          <p className="mt-1 text-sm font-medium">{dateTimeOf(a.start)}</p>
          <p className="mt-1 text-sm text-muted">{p.phone ? phoneMask(p.phone) : 'Sem telefone cadastrado'}{p.email ? ` · ${p.email}` : ''}</p>
          {a.notes && <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-sm text-muted">“{a.notes}”</p>}
        </div>
      </div>

      {isLive(a) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {p.phone && <a href={telLink(p.phone)} className={`${act} bg-slate-100 hover:bg-slate-200`}><Phone className="size-4" /> Ligar</a>}
          {p.phone && (
            <a href={whatsappLink(p.phone, msg)} target="_blank" rel="noopener noreferrer" className={`${act} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          )}
          <Link to={`/painel/mensagens?patient=${p._id}`} className={`${act} bg-accent-50 text-accent-700 hover:bg-accent-100`}><MessageCircle className="size-4" /> Chat</Link>

          <span className="ml-auto flex flex-wrap items-center gap-2">
            {pending && !choosing && (
              <button disabled={busy} onClick={() => setChoosing(true)} className={`${act} bg-linear-to-r from-brand-600 to-accent-600 text-white shadow-glow hover:brightness-110`}>
                <CheckCheck className="size-4" /> Confirmar
              </button>
            )}
            {pending && choosing && (
              <span className="flex animate-pop items-center gap-1 rounded-xl bg-canvas p-1 text-sm">
                <span className="px-2 text-muted">Confirmado por:</span>
                {CHANNELS.map((c) => (
                  <button key={c.id} disabled={busy} onClick={() => onConfirm(c.id)} className="rounded-lg bg-white px-2.5 py-1 font-medium shadow-sm ring-1 ring-line transition hover:bg-brand-50 hover:ring-brand-500">{c.label}</button>
                ))}
                <button onClick={() => setChoosing(false)} aria-label="Voltar" className="rounded-lg p-1 text-muted hover:bg-white"><X className="size-4" /></button>
              </span>
            )}
            {!pending && <button disabled={busy} onClick={onComplete} className={`${act} bg-sky-50 text-sky-700 hover:bg-sky-100`}><CheckCheck className="size-4" /> Marcar concluída</button>}
            <button disabled={busy} onClick={onReschedule} className={`${act} bg-slate-100 hover:bg-slate-200`}><CalendarSync className="size-4" /> Reagendar</button>
            <button disabled={busy} onClick={onCancel} className={`${act} text-red-600 hover:bg-red-50`}>Cancelar</button>
          </span>
        </div>
      )}
    </article>
  )
}
