import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export function Loading({ text = 'Carregando… (a API gratuita pode levar alguns segundos para acordar)' }: { text?: string }) {
  return (
    <p className="flex animate-fade-in items-center gap-2 px-4 py-10 text-muted" role="status">
      <Loader2 className="size-4 animate-spin text-brand-600" /> {text}
    </p>
  )
}

/** Esqueleto de cartões enquanto a lista carrega. */
export function CardSkeletons({ n = 4, className = 'h-40' }: { n?: number; className?: string }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => <div key={i} className={`skeleton ${className}`} />)}
    </>
  )
}

export function ErrorMsg({ children }: { children: ReactNode }) {
  return <p role="alert" className="animate-pop rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">{children}</p>
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex animate-fade-up flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function Avatar({ name, photoUrl, size = 'size-14' }: { name: string; photoUrl?: string; size?: string }) {
  const initials = name.replace(/^Dra?\.\s*/, '').split(' ').slice(0, 2).map((p) => p[0]).join('')
  return photoUrl
    ? <img src={photoUrl} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
    : <span aria-hidden className={`${size} flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-accent-500 font-bold text-white shadow-sm`}>{initials}</span>
}

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand-600 to-accent-600 px-5 py-2.5 font-semibold text-white shadow-glow transition hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0'
export const btnOutline =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 font-semibold transition hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50'
export const inputClass =
  'mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 outline-none transition focus:border-accent-500 focus:ring-4 focus:ring-accent-100'
