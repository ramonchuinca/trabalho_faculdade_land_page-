import { Baby, Bone, FlaskConical, Flower2, HeartPulse, ScanFace, Stethoscope, Syringe, type LucideIcon } from 'lucide-react'

// Mapa explícito (nome lucide em kebab-case vindo da API -> componente) para não importar o pacote inteiro.
const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  'heart-pulse': HeartPulse,
  'scan-face': ScanFace,
  baby: Baby,
  bone: Bone,
  'flower-2': Flower2,
  'flask-conical': FlaskConical,
  syringe: Syringe,
}

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Stethoscope
  return <Icon className={className} />
}
