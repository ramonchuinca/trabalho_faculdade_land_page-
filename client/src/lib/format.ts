// Formatação para a UI. A clínica opera em UTC-3 (America/Sao_Paulo), independente do fuso do navegador.
const TZ = 'America/Sao_Paulo'

export const money = (v: number) =>
  v > 0 ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Gratuito'

export const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })

export const dateLongOf = (iso: string) => {
  const s = new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: TZ })
  return s.charAt(0).toUpperCase() + s.slice(1) // só a 1ª letra: "Quinta-feira, 19 de novembro"
}

export const dateTimeOf = (iso: string) => `${dateLongOf(iso)} às ${timeOf(iso)}`

/** Data (AAAA-MM-DD) de um instante, no fuso da clínica. */
export const clinicDate = (d: Date = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ })

/** Soma dias a uma data AAAA-MM-DD (aritmética em UTC, sem depender do fuso local). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Rótulo curto de um dia AAAA-MM-DD: { weekday: 'seg', day: '17' }. */
export function dayChip(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  return {
    weekday: dt.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', ''),
    day: String(d).padStart(2, '0'),
    month: dt.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', ''),
  }
}

// ---- Contato (telefone / WhatsApp) ----
/** Só dígitos; assume Brasil (+55) quando vier com DDD e sem código do país. */
export function phoneDigits(phone?: string | null): string {
  const d = (phone ?? '').replace(/\D/g, '')
  return d.length === 10 || d.length === 11 ? `55${d}` : d
}

/** (11) 98888-7777 — para exibir. */
export function phoneMask(phone?: string | null): string {
  const d = (phone ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return phone ?? ''
}

export const telLink = (phone?: string | null) => `tel:+${phoneDigits(phone)}`

/** Abre o WhatsApp (app ou web) já com a mensagem escrita. Não usa API paga: o atendente só clica em enviar. */
export const whatsappLink = (phone: string | null | undefined, text: string) =>
  `https://wa.me/${phoneDigits(phone)}?text=${encodeURIComponent(text)}`

/** Texto padrão de confirmação enviado pela recepção. */
export const confirmationText = (a: { patient: string; service: string; doctor: string; start: string }) =>
  `Olá, ${a.patient.split(' ')[0]}! Aqui é a recepção da Vitalis Clínica. Sua consulta de ${a.service} com ${a.doctor} está marcada para ${dateTimeOf(a.start)}. Você confirma o comparecimento? Responda SIM para confirmar.`
