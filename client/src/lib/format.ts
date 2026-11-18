// Formatação para a UI. A clínica opera em UTC-3 (America/Sao_Paulo), independente do fuso do navegador.
const TZ = 'America/Sao_Paulo'

export const money = (v: number) =>
  v > 0 ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Gratuito'

export const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })

export const dateLongOf = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: TZ })

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
