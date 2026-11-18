// Cliente HTTP da API. Em dev usa o proxy do Vite (/api); em produção, VITE_API_URL (Render).
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')
export const TOKEN_KEY = 'vitalis_token'
/** Disparado quando a API recusa o token da sessão atual (expirado, revogado ou de outra conta). */
export const SESSION_EXPIRED_EVENT = 'vitalis:session-expired'

// A sessão fica em sessionStorage: é POR ABA. Com localStorage todas as abas do navegador dividiam o mesmo token
// e a última conta logada vencia (ao recarregar, a aba do paciente virava admin). Assim cada aba tem a sua conta
// e o reload mantém a sessão da própria aba. Custo: fechar a aba encerra a sessão.
const store = (() => {
  try { return window.sessionStorage } catch { return null }
})()
// Remove o token da versão antiga (localStorage) para ele não ficar esquecido no navegador.
try { window.localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }

export const tokenStore = {
  get: () => store?.getItem(TOKEN_KEY) ?? null,
  set: (t: string) => store?.setItem(TOKEN_KEY, t),
  clear: () => store?.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get()
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  const body = await res.json().catch(() => ({}))
  // 401 com token enviado = sessão inválida: limpa e avisa o app, em vez de ficar repetindo requisições (polling).
  if (res.status === 401 && token) {
    tokenStore.clear()
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
  }
  if (!res.ok) throw new ApiError(res.status, body.message ?? 'Erro inesperado')
  return body as T
}

// ---- Tipos espelhando as respostas da API ----
export type Role = 'patient' | 'doctor' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  cpf: string | null
  phone: string | null
}

export interface Service {
  _id: string
  name: string
  slug: string
  description: string
  icon: string
  durationMin: number
  price: number
}

export interface Doctor {
  _id: string
  name: string
  crm: string
  specialty: string
  bio: string
  photoUrl: string
  services: string[]
  slotMinutes: number
}

export type ConfirmChannel = 'phone' | 'whatsapp' | 'chat' | 'other'

export interface PatientContact {
  _id: string
  name: string
  phone?: string | null
  email?: string
}

export interface Appointment {
  _id: string
  start: string
  end: string
  status: 'scheduled' | 'cancelled' | 'completed'
  /** Preenchido quando a recepção confirmou (o status continua "scheduled"). */
  confirmedAt: string | null
  confirmChannel: ConfirmChannel | null
  /** Remarcações feitas pela recepção (horário anterior + quando). */
  reschedules?: { from: string; at: string }[]
  notes?: string
  doctor: Pick<Doctor, '_id' | 'name' | 'specialty' | 'photoUrl'>
  service: Pick<Service, '_id' | 'name' | 'price' | 'durationMin' | 'icon'>
  /** Só vem populado para o admin; para o paciente é apenas o id. */
  patient?: PatientContact | string
}

export interface ChatMessage {
  _id: string
  from: 'patient' | 'staff'
  text: string
  createdAt: string
}

export interface InboxItem {
  patient: PatientContact
  last: { text: string; from: 'patient' | 'staff'; createdAt: string }
  unread: number
}
