// Cliente HTTP da API. Em dev usa o proxy do Vite (/api); em produção, VITE_API_URL (Render).
const BASE = import.meta.env.VITE_API_URL ?? ''
const TOKEN_KEY = 'vitalis_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Modo demonstração sem backend: `VITE_MOCK=1 npm run dev`. Fora do dev, nunca é usado.
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK) {
    const { mockApi } = await import('./mock')
    try {
      return (await mockApi(path, init)) as T
    } catch (e) {
      const err = e as { status?: number; message: string }
      throw new ApiError(err.status ?? 500, err.message)
    }
  }
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

export interface Appointment {
  _id: string
  start: string
  end: string
  status: 'scheduled' | 'cancelled' | 'completed'
  doctor: Pick<Doctor, '_id' | 'name' | 'specialty' | 'photoUrl'>
  service: Pick<Service, '_id' | 'name' | 'price' | 'durationMin' | 'icon'>
}
