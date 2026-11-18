import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export function Loading({ text = 'Carregando… (a API gratuita pode levar alguns segundos para acordar)' }: { text?: string }) {
  return (
    <p className="flex items-center gap-2 px-4 py-10 text-muted" role="status">
      <Loader2 className="size-4 animate-spin" /> {text}
    </p>
  )
}

export function ErrorMsg({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
    </div>
  )
}

export function Avatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  const initials = name.replace(/^Dra?\.\s*/, '').split(' ').slice(0, 2).map((p) => p[0]).join('')
  return photoUrl
    ? <img src={photoUrl} alt="" className="size-14 shrink-0 rounded-full object-cover" />
    : <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">{initials}</span>
}

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50'
export const btnOutline =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 font-semibold hover:bg-canvas disabled:opacity-50'
export const inputClass =
  'mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100'
