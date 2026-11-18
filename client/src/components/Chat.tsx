import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Send, X } from 'lucide-react'
import { api, type ChatMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { timeOf } from '../lib/format'
import { ErrorMsg } from './ui'

const POLL_MS = 4000

/** Lista de mensagens + campo de envio. `me` diz de que lado ficam as bolhas "minhas". */
export function ChatThread({
  messages, me, onSend, sending, error, empty,
}: {
  messages: ChatMessage[]
  me: 'patient' | 'staff'
  onSend: (text: string) => Promise<unknown> | void
  sending?: boolean
  error?: string
  empty?: string
}) {
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const lastId = messages.at(-1)?._id

  // Rola para a última mensagem quando chega algo novo.
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [lastId])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const t = text.trim()
    if (!t || sending) return
    setText('')
    try { await onSend(t) } catch { setText(t) } // devolve o texto ao campo se falhar
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
        {messages.length === 0 && <p className="mx-auto max-w-xs py-6 text-center text-sm text-muted">{empty}</p>}
        {messages.map((m) => {
          const mine = m.from === me
          return (
            <div key={m._id} className={`flex animate-pop ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                mine ? 'rounded-br-md bg-linear-to-br from-brand-600 to-accent-600 text-white' : 'rounded-bl-md border border-line bg-surface'}`}>
                <p className="whitespace-pre-wrap wrap-break-word">{m.text}</p>
                <p className={`mt-1 text-right text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>{timeOf(m.createdAt)}</p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
      {error && <div className="px-4 pb-2"><ErrorMsg>{error}</ErrorMsg></div>}
      <form onSubmit={submit} className="flex items-end gap-2 border-t border-line bg-surface p-3">
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={1000} placeholder="Escreva sua mensagem…"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
          className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-100"
          aria-label="Mensagem"
        />
        <button disabled={!text.trim() || sending} aria-label="Enviar"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand-600 to-accent-600 text-white transition hover:brightness-110 disabled:opacity-40">
          <Send className="size-4" />
        </button>
      </form>
    </div>
  )
}

/** Balão flutuante do paciente: conversa com a recepção. Só aparece para pacientes logados. */
export default function ChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const isPatient = user?.role === 'patient'

  const unread = useQuery({
    queryKey: ['chat', 'unread'],
    queryFn: () => api<{ count: number }>('/chat/unread'),
    enabled: isPatient && !open,
    refetchInterval: 8000,
  })
  const thread = useQuery({
    queryKey: ['chat', 'thread'],
    queryFn: () => api<ChatMessage[]>('/chat'),
    enabled: isPatient && open,
    refetchInterval: POLL_MS,
  })
  const send = useMutation({
    mutationFn: (text: string) => api<ChatMessage>('/chat', { method: 'POST', body: JSON.stringify({ text }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat', 'thread'] }),
  })

  // Ao abrir, a leitura é feita pelo GET /chat; zera o contador do balão.
  useEffect(() => { if (open) qc.setQueryData(['chat', 'unread'], { count: 0 }) }, [open, qc])

  if (!isPatient) return null
  const count = unread.data?.count ?? 0

  return (
    <div className="fixed right-4 bottom-4 z-30 sm:right-6 sm:bottom-6">
      {open && (
        <section aria-label="Chat com a recepção"
          className="glass absolute right-0 bottom-16 flex h-[min(32rem,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-sm animate-pop flex-col overflow-hidden rounded-3xl border border-white/60 shadow-glow">
          <header className="flex items-center justify-between bg-linear-to-r from-brand-600 to-accent-600 px-4 py-3 text-white">
            <div>
              <p className="font-semibold">Recepção Vitalis</p>
              <p className="text-xs text-white/80">Tire dúvidas e confirme seu agendamento</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fechar chat" className="rounded-lg p-1 hover:bg-white/15"><X className="size-5" /></button>
          </header>
          <div className="min-h-0 flex-1 bg-canvas/70">
            <ChatThread
              messages={thread.data ?? []} me="patient"
              onSend={(t) => send.mutateAsync(t)} sending={send.isPending}
              error={send.isError ? (send.error as Error).message : thread.isError ? 'Não foi possível carregar a conversa.' : undefined}
              empty="Olá! Escreva sua dúvida e a recepção responde por aqui. Em caso de emergência, ligue 192 (SAMU)."
            />
          </div>
        </section>
      )}
      <button onClick={() => setOpen((o) => !o)} aria-label={open ? 'Fechar chat' : 'Abrir chat com a recepção'} aria-expanded={open}
        className={`relative flex size-14 items-center justify-center rounded-full bg-linear-to-br from-brand-600 to-accent-600 text-white shadow-glow transition hover:scale-105 ${!open && count > 0 ? 'animate-pulse-ring' : ''}`}>
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!open && count > 0 && (
          <span className="absolute -top-1 -right-1 flex size-5 animate-pop items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold ring-2 ring-white">{count > 9 ? '9+' : count}</span>
        )}
      </button>
    </div>
  )
}
