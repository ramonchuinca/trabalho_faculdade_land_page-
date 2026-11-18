import { Link } from 'react-router-dom'
import { btnPrimary } from '../components/ui'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-5xl font-bold text-brand-600">404</p>
      <h1 className="mt-3 text-xl font-semibold">Página não encontrada</h1>
      <Link to="/" className={`${btnPrimary} mt-6`}>Voltar ao início</Link>
    </div>
  )
}
