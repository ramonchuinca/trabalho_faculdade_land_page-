import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft } from 'lucide-react'
import { api, ApiError, type Appointment, type Doctor, type Service } from '../lib/api'
import { useAuth } from '../lib/auth'
import { addDays, clinicDate, dateTimeOf, dayChip, money, timeOf } from '../lib/format'
import { ServiceIcon } from '../lib/icons'
import { Avatar, btnOutline, btnPrimary, ErrorMsg, inputClass, Loading, PageHeader } from '../components/ui'

const DAYS_AHEAD = 14
const STEPS = ['Serviço', 'Profissional', 'Horário', 'Confirmar']

// Estado do wizard fica na URL: sobrevive ao login no meio do fluxo e ao F5.
export default function Book() {
  const [params, setParams] = useSearchParams()
  const serviceId = params.get('service')
  const doctorId = params.get('doctor')
  const date = params.get('date') ?? clinicDate()
  const start = params.get('start')

  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  const services = useQuery({ queryKey: ['services'], queryFn: () => api<Service[]>('/services') })
  const doctors = useQuery({ queryKey: ['doctors'], queryFn: () => api<Doctor[]>('/doctors') })

  const service = services.data?.find((s) => s._id === serviceId)
  const doctor = doctors.data?.find((d) => d._id === doctorId)

  const step = !service ? 0 : !doctor ? 1 : !start ? 2 : 3

  if (services.isLoading || doctors.isLoading) return <Loading />
  if (services.isError || doctors.isError) {
    return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorMsg>Não foi possível carregar os dados. Tente novamente em instantes.</ErrorMsg></div>
  }

  const back = () => {
    if (step === 3) set({ start: null })
    else if (step === 2) set({ doctor: null, date: null })
    else if (step === 1) set({ service: null })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="Agendar consulta" subtitle="Quatro passos rápidos para reservar seu horário." />

      <ol className="mb-8 flex items-center gap-2 text-sm" aria-label="Progresso">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2" aria-current={i === step ? 'step' : undefined}>
            <span className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
              i < step ? 'bg-brand-600 text-white' : i === step ? 'border-2 border-brand-600 text-brand-700' : 'border border-line text-muted'}`}>
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={`hidden sm:inline ${i === step ? 'font-semibold' : 'text-muted'}`}>{label}</span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-line sm:w-8" />}
          </li>
        ))}
      </ol>

      {step > 0 && (
        <button onClick={back} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ChevronLeft className="size-4" /> Voltar
        </button>
      )}

      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {services.data!.map((s) => (
            <button key={s._id} onClick={() => set({ service: s._id })}
              className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition hover:border-brand-500 hover:shadow-md">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><ServiceIcon name={s.icon} className="size-5" /></span>
              <span>
                <span className="block font-semibold">{s.name}</span>
                <span className="text-sm text-muted">{money(s.price)} · {s.durationMin} min</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && service && <DoctorStep service={service} doctors={doctors.data!} onPick={(id) => set({ doctor: id, date: clinicDate(), start: null })} />}

      {step === 2 && doctor && <SlotStep doctor={doctor} date={date} onDate={(d) => set({ date: d, start: null })} onPick={(iso) => set({ start: iso })} />}

      {step === 3 && service && doctor && start && <ConfirmStep service={service} doctor={doctor} start={start} onTaken={() => set({ start: null })} />}
    </div>
  )
}

function DoctorStep({ service, doctors, onPick }: { service: Service; doctors: Doctor[]; onPick: (id: string) => void }) {
  const list = doctors.filter((d) => d.services.includes(service._id))
  if (list.length === 0) return <p className="text-muted">Nenhum profissional disponível para {service.name} no momento.</p>
  return (
    <div className="space-y-3">
      <p className="text-muted">Quem vai atender você em <strong className="text-ink">{service.name}</strong>?</p>
      {list.map((d) => (
        <button key={d._id} onClick={() => onPick(d._id)}
          className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition hover:border-brand-500 hover:shadow-md">
          <Avatar name={d.name} photoUrl={d.photoUrl} />
          <span>
            <span className="block font-semibold">{d.name}</span>
            <span className="text-sm text-muted">{d.specialty} · {d.crm}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

function SlotStep({ doctor, date, onDate, onPick }: { doctor: Doctor; date: string; onDate: (d: string) => void; onPick: (iso: string) => void }) {
  const today = clinicDate()
  const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)), [today])

  const slots = useQuery({
    queryKey: ['slots', doctor._id, date],
    queryFn: () => api<{ date: string; slots: string[] }>(`/doctors/${doctor._id}/slots?date=${date}`),
    staleTime: 0, // disponibilidade muda a cada reserva
  })

  return (
    <div>
      <p className="mb-3 text-muted">Escolha o dia e o horário com <strong className="text-ink">{doctor.name}</strong>.</p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2" role="listbox" aria-label="Dias">
        {days.map((d) => {
          const c = dayChip(d)
          const active = d === date
          return (
            <button key={d} role="option" aria-selected={active} onClick={() => onDate(d)}
              className={`flex w-16 shrink-0 flex-col items-center rounded-xl border px-2 py-2 transition ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-surface hover:border-brand-500'}`}>
              <span className="text-xs uppercase">{c.weekday}</span>
              <span className="text-lg font-bold">{c.day}</span>
              <span className="text-xs opacity-80">{c.month}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        {slots.isLoading && <Loading text="Buscando horários…" />}
        {slots.isError && <ErrorMsg>Não foi possível carregar os horários.</ErrorMsg>}
        {slots.data && slots.data.slots.length === 0 && (
          <p className="rounded-xl bg-canvas p-4 text-muted">Sem horários livres neste dia. Tente outra data.</p>
        )}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {slots.data?.slots.map((iso) => (
            <button key={iso} onClick={() => onPick(iso)}
              className="rounded-lg border border-line bg-surface py-2 font-medium transition hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700">
              {timeOf(iso)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConfirmStep({ service, doctor, start, onTaken }: { service: Service; doctor: Doctor; start: string; onTaken: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [notes, setNotes] = useState('')

  const create = useMutation({
    mutationFn: () => api<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify({ doctorId: doctor._id, serviceId: service._id, start, notes: notes.trim() || undefined }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['slots'] })
      navigate('/minhas-consultas', { state: { booked: true } })
    },
    onError: (err) => {
      // 409/400: o horário deixou de estar disponível; volta para a escolha de horário.
      if (err instanceof ApiError && (err.status === 409 || err.status === 400)) {
        qc.invalidateQueries({ queryKey: ['slots'] })
        onTaken()
      }
    },
  })

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <h2 className="text-xl font-bold">Confirme os dados</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <Row label="Serviço" value={`${service.name} (${money(service.price)})`} />
        <Row label="Profissional" value={`${doctor.name} — ${doctor.specialty}`} />
        <Row label="Quando" value={<span className="capitalize">{dateTimeOf(start)}</span>} />
        <Row label="Duração" value={`${doctor.slotMinutes} min`} />
      </dl>

      <label className="mt-5 block text-sm font-medium">
        Observações (opcional)
        <textarea className={inputClass} rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Algo que o médico deva saber?" />
      </label>

      {create.isError && <div className="mt-4"><ErrorMsg>{(create.error as Error).message}</ErrorMsg></div>}

      <div className="mt-6">
        {user ? (
          <button className={`${btnPrimary} w-full`} disabled={create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Agendando…' : 'Confirmar agendamento'}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted">Para finalizar, entre na sua conta ou crie uma — seu horário fica salvo aqui.</p>
            <div className="flex gap-2">
              <Link to="/entrar" state={{ from: location.pathname + location.search }} className={`${btnPrimary} flex-1`}>Entrar</Link>
              <Link to="/cadastro" state={{ from: location.pathname + location.search }} className={`${btnOutline} flex-1`}>Criar conta</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-2 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}
