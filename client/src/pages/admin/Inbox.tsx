import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MessageCircleOff, Phone } from 'lucide-react'
import { api, type ChatMessage, type InboxItem, type PatientContact } from '../../lib/api'
import { phoneMask, telLink, whatsappLink } from '../../lib/format'
import { ChatThread } from '../../components/Chat'
import { Avatar, CardSkeletons, PageHeader } from '../../components/ui'

export default function Inbox() {
  const [params, setParams] = useSearchParams()
  const selected = params.get('patient')
  const qc = useQueryClient()

  const inbox = useQuery({ queryKey: ['chat', 'inbox'], queryFn: () => api<InboxItem[]>('/chat/inbox'), refetchInterval: 6000 })

  const thread = useQuery({
    queryKey: ['chat', 'inbox', selected],
    queryFn: () => api<{ patient: PatientContact; messages: ChatMessage[] }>(`/chat/inbox/${selected}`),
    enabled: !!selected,
    refetchInterval: 4000,
  })
  const send = useMutation({
    mutationFn: (text: string) => api(`/chat/inbox/${selected}`, { method: 'POST', body: JSON.stringify({ text }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'inbox'] })
      qc.invalidateQueries({ queryKey: ['chat', 'unread'] })
    },
  })

  const open = (id: string) => setParams({ patient: id })
  const p = thread.data?.patient

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title="Mensagens" subtitle="Conversas com pacientes.">
        <Link to="/painel" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="size-4" /> Voltar ao painel</Link>
      </PageHeader>

      <div className="glass grid h-[calc(100dvh-16rem)] min-h-[28rem] animate-fade-up overflow-hidden rounded-3xl border border-white/70 shadow-soft md:grid-cols-[20rem_1fr]">
        {/* Lista de conversas: no celular some quando há uma conversa aberta. */}
        <aside className={`min-h-0 overflow-y-auto border-r border-line bg-surface/60 ${selected ? 'hidden md:block' : ''}`}>
          {inbox.isLoading && <div className="space-y-2 p-3"><CardSkeletons n={4} className="h-16" /></div>}
          {inbox.data?.length === 0 && <p className="p-6 text-center text-sm text-muted">Nenhuma conversa ainda. Quando um paciente escrever, ela aparece aqui.</p>}
          {inbox.data?.map((c) => (
            <button key={c.patient._id} onClick={() => open(c.patient._id)}
              className={`flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition hover:bg-brand-50 ${selected === c.patient._id ? 'bg-brand-50' : ''}`}>
              <Avatar name={c.patient.name} size="size-10" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">{c.patient.name}</span>
                  {c.unread > 0 && <span className="flex size-5 shrink-0 animate-pop items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white">{c.unread}</span>}
                </span>
                <span className="block truncate text-sm text-muted">{c.last.from === 'staff' ? 'Você: ' : ''}{c.last.text}</span>
              </span>
            </button>
          ))}
        </aside>

        <section className={`flex min-h-0 flex-col ${selected ? '' : 'hidden md:flex'}`}>
          {!selected && (
            <div className="m-auto p-8 text-center text-muted">
              <MessageCircleOff className="mx-auto size-10 text-brand-500" />
              <p className="mt-3">Selecione uma conversa à esquerda.</p>
            </div>
          )}
          {selected && (
            <>
              <header className="flex items-center gap-3 border-b border-line bg-surface/70 px-4 py-3">
                <button onClick={() => setParams({})} aria-label="Voltar às conversas" className="rounded-lg p-1 hover:bg-canvas md:hidden"><ArrowLeft className="size-5" /></button>
                <Avatar name={p?.name ?? '…'} size="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p?.name ?? 'Carregando…'}</p>
                  {p?.phone && <p className="text-xs text-muted">{phoneMask(p.phone)}</p>}
                </div>
                {p?.phone && (
                  <>
                    <a href={telLink(p.phone)} aria-label="Ligar" className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink"><Phone className="size-5" /></a>
                    <a href={whatsappLink(p.phone, `Olá, ${p.name.split(' ')[0]}! Aqui é a recepção da Vitalis Clínica.`)} target="_blank" rel="noopener noreferrer"
                      className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100">WhatsApp</a>
                  </>
                )}
              </header>
              <div className="min-h-0 flex-1 bg-canvas/60">
                <ChatThread messages={thread.data?.messages ?? []} me="staff" onSend={(t) => send.mutateAsync(t)} sending={send.isPending}
                  error={send.isError ? (send.error as Error).message : thread.isError ? 'Paciente não encontrado.' : undefined}
                  empty="Sem mensagens. Escreva para iniciar a conversa." />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
