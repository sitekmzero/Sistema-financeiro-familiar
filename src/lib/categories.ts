import type { LucideIcon } from 'lucide-react'
import {
  UtensilsCrossed,
  Car,
  HeartPulse,
  Home,
  Repeat,
  Cpu,
  Briefcase,
  PartyPopper,
  GraduationCap,
  PawPrint,
  Shirt,
  Bus,
  Package,
  Landmark,
  ArrowLeftRight,
  Receipt,
  CreditCard,
  TrendingUp,
} from 'lucide-react'

export interface CategoryMeta {
  name: string
  color: string // tailwind text color hex
  bg: string // tailwind bg color class
  ring: string
  icon: LucideIcon
}

/**
 * Padrão de categorias do James Family Office.
 * O campo `name` corresponde aos valores aceitos pela coleção `transactions.category`
 * (estendido com as categorias dos cadastros — Veículo, Tecnologia, etc.).
 */
export const CATEGORY_META: CategoryMeta[] = [
  {
    name: 'Alimentação',
    color: '#FB923C',
    bg: 'bg-orange-500/15',
    ring: 'ring-orange-500/30',
    icon: UtensilsCrossed,
  },
  { name: 'Veículo', color: '#3B82F6', bg: 'bg-blue-500/15', ring: 'ring-blue-500/30', icon: Car },
  {
    name: 'Saúde',
    color: '#EF4444',
    bg: 'bg-rose-500/15',
    ring: 'ring-rose-500/30',
    icon: HeartPulse,
  },
  {
    name: 'Moradia',
    color: '#A16207',
    bg: 'bg-amber-700/15',
    ring: 'ring-amber-700/30',
    icon: Home,
  },
  {
    name: 'Assinaturas',
    color: '#A855F7',
    bg: 'bg-purple-500/15',
    ring: 'ring-purple-500/30',
    icon: Repeat,
  },
  {
    name: 'Tecnologia',
    color: '#06B6D4',
    bg: 'bg-cyan-500/15',
    ring: 'ring-cyan-500/30',
    icon: Cpu,
  },
  {
    name: 'Business',
    color: '#EAB308',
    bg: 'bg-yellow-500/15',
    ring: 'ring-yellow-500/30',
    icon: Briefcase,
  },
  {
    name: 'Lazer',
    color: '#EC4899',
    bg: 'bg-pink-500/15',
    ring: 'ring-pink-500/30',
    icon: PartyPopper,
  },
  {
    name: 'Educação',
    color: '#22C55E',
    bg: 'bg-green-500/15',
    ring: 'ring-green-500/30',
    icon: GraduationCap,
  },
  {
    name: 'Pet',
    color: '#F59E0B',
    bg: 'bg-amber-500/15',
    ring: 'ring-amber-500/30',
    icon: PawPrint,
  },
  {
    name: 'Vestuário',
    color: '#8B5CF6',
    bg: 'bg-violet-500/15',
    ring: 'ring-violet-500/30',
    icon: Shirt,
  },
  {
    name: 'Transporte',
    color: '#14B8A6',
    bg: 'bg-teal-500/15',
    ring: 'ring-teal-500/30',
    icon: Bus,
  },
  {
    name: 'Seguros',
    color: '#0EA5E9',
    bg: 'bg-sky-500/15',
    ring: 'ring-sky-500/30',
    icon: Package,
  },
  {
    name: 'Consórcio',
    color: '#6366F1',
    bg: 'bg-indigo-500/15',
    ring: 'ring-indigo-500/30',
    icon: Landmark,
  },
  {
    name: 'Transferência',
    color: '#8B5CF6',
    bg: 'bg-violet-500/15',
    ring: 'ring-violet-500/30',
    icon: ArrowLeftRight,
  },
  {
    name: 'Tarifas',
    color: '#F43F5E',
    bg: 'bg-rose-500/15',
    ring: 'ring-rose-500/30',
    icon: Receipt,
  },
  {
    name: 'Pagamento de Cartão',
    color: '#D946EF',
    bg: 'bg-fuchsia-500/15',
    ring: 'ring-fuchsia-500/30',
    icon: CreditCard,
  },
  {
    name: 'Investimento',
    color: '#059669',
    bg: 'bg-emerald-600/15',
    ring: 'ring-emerald-600/30',
    icon: TrendingUp,
  },
  {
    name: 'Renda',
    color: '#10B981',
    bg: 'bg-emerald-500/15',
    ring: 'ring-emerald-500/30',
    icon: Briefcase,
  },
  {
    name: 'Outros',
    color: '#94A3B8',
    bg: 'bg-slate-500/15',
    ring: 'ring-slate-500/30',
    icon: Package,
  },
]

export function getCategoryMeta(name?: string): CategoryMeta {
  if (!name) return CATEGORY_META[CATEGORY_META.length - 1]
  return (
    CATEGORY_META.find((c) => c.name.toLowerCase() === name.toLowerCase()) ||
    CATEGORY_META[CATEGORY_META.length - 1]
  )
}
