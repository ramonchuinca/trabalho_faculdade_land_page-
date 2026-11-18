import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, X } from 'lucide-react'
import { api, ApiError, type Appointment, type ConfirmChannel, type PatientContact } from '../../lib/api'
import { addDays, clinicDate, dateTimeOf, dayChip, timeOf } from '../../lib/format'
import { btnPrimary, ErrorMsg, Loading } from '../../components/ui'

const DAYS_AHEAD = 21
const CHANNELS: { id: ConfirmChannel | ''; label: string }[] = [
  { id: '', label: 'Ainda não combinei com o paciente' },
  { id: 'phone', label: 'Combinei por telefone' },
  { id: 'whatsapp', label: 'Combinei por WhatsApp' },
  { id: 'chat', label: 'Combinei pelo chat' },
]

/** Atendente escolhe outro horário livre do mesmo médico. O paciente é avisado no chat automaticamente. */
export default function RescheduleDialog({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const qc = useQueryClient()
  const today = clinicDate()
  const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)), [today])
  const [date, setDate] = useState(today)
  const [slot, setSlot] = useState<string | null>(null)
  const [channel, setChannel] = useState<ConfirmChannel | ''>('')
  const patient = typeof appt.patient === 'object' ? (appt.patient as PatientContact) : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const slots = useQuery({
    queryKey: ['slots', appt.doctor._id, date],
    queryFn: () => api<{ date: string; slots: string[] }>(`/doctors/${appt.doctor._id}/slots?date=${date}`),
    staleTime: 0,
  })

  const save = useMutation({
    mutationFn: () =>
      api(`/appointments/${appt._id}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({ start: slot, ...(channel ? { confirmChannel: channel } : {}) }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['slots'] })
      qc.invalidateQueries({ queryKey: ['chat'] })
      onClose()
    },
    onError: (e) => {
      // Horário tomado por outra pessoa: atualiza a lista e pede nova escolha.
      if (e instanceof ApiError && (e.status === 409 || e.status === 400)) {
        setSlot(null)
        qc.invalidateQueries({ queryKey: ['slots'] })
      }
    },
  })

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="resch-title"
        className="glass max-h-[92dvh] w-full max-w-2xl animate-pop overflow-y-auto rounded-t-3xl border border-white/70 p-6 shadow-glow sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="resch-title" className="flex items-center gap-2 text-xl font-bold"><CalendarClock className="size-5 text-accent-600" /> Reagendar consulta</h2>
            <p className="mt-1 text-sm text-muted">
              {patient?.name ?? 'Paciente'} · {appt.service.name} com {appt.doctor.name}
            </p>
            <p className="text-sm text-muted">Horário atual: <strong className="text-ink">{dateTimeOf(appt.start)}</strong></p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-muted hover:bg-canvas"><X className="size-5" /></button>
        </div>

        <p className="mt-5 mb-2 text-sm font-medium">Novo dia</p>
        <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2">
          {days.map((d) => {
            const c = dayChip(d)
            const active = d === date
            return (
              <button key={d} onClick={() => { setDate(d); setSlot(null) }} aria-pressed={active}
                className={`flex w-16 shrink-0 flex-col items-center rounded-xl border px-2 py-2 transition ${active ? 'border-transparent bg-linear-to-br from-brand-600 to-accent-600 text-white shadow-glow' : 'border-line bg-surface hover:border-brand-500'}`}>
                <span className="text-xs uppercase">{c.weekday}</span>
                <span className="text-lg font-bold">{c.day}</span>
                <span className="text-xs opacity-80">{c.month}</span>
              </button>
            )
          })}
        </div>

        <p className="mt-4 mb-2 text-sm font-medium">Novo horário</p>
        {slots.isLoading && <Loading text="Buscando horários…" />}
        {slots.isError && <ErrorMsg>Não foi possível carregar os horários.</ErrorMsg>}
        {slots.data?.slots.length === 0 && <p className="rounded-xl bg-canvas p-4 text-sm text-muted">Sem horários livres neste dia. Tente outra data.</p>}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {slots.data?.slots.map((iso) => (
            <button key={iso} onClick={() => setSlot(iso)} aria-pressed={slot === iso}
              className={`rounded-lg border py-2 font-medium transition ${slot === iso ? 'border-accent-600 bg-accent-50 text-accent-700 ring-2 ring-accent-100' : 'border-line bg-surface hover:border-brand-600 hover:bg-brand-50'}`}>
              {timeOf(iso)}
            </button>
          ))}
        </div>

        <label className="mt-5 block text-sm font-medium">
          Confirmação do novo horário
          <select value={channel} onChange={(e) => setChannel(e.target.value as ConfirmChannel | '')}
            className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-100">
            {CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <span className="mt-1 block text-xs font-normal text-muted">
            O paciente recebe um aviso no chat. {channel ? 'A consulta já fica confirmada.' : 'A consulta volta para “Aguardando confirmação”.'}
          </span>
        </label>

        {save.isError && <div className="mt-4"><ErrorMsg>{(save.error as Error).message}</ErrorMsg></div>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 font-medium text-muted hover:bg-canvas">Voltar</button>
          <button disabled={!slot || save.isPending} onClick={() => save.mutate()} className={btnPrimary}>
            {save.isPending ? 'Reagendando…' : slot ? `Reagendar para ${timeOf(slot)}` : 'Escolha um horário'}
          </button>
        </div>
      </div>
    </div>
  )
}
