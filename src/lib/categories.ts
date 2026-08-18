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
  Tag,
  ShoppingBag,
  Plane,
  Gift,
  Dumbbell,
  Baby,
  Wrench,
  Zap,
  Droplet,
  Wifi,
  Phone,
  PiggyBank,
  Wallet,
  Building2,
  Globe,
} from 'lucide-react'
import type { Category } from '@/types/finance'

export interface CategoryMeta {
  name: string
  color: string // tailwind text color hex
  bg: string // tailwind bg color class
  ring: string
  icon: LucideIcon
}

/**
 * Mapa de ícones Lucide disponíveis no formulário de categorias.
 * A chave (string) é o que guardamos no banco (categories.icon).
 */
export const ICON_MAP: Record<string, LucideIcon> = {
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
  Tag,
  ShoppingBag,
  Plane,
  Gift,
  Dumbbell,
  Baby,
  Wrench,
  Zap,
  Droplet,
  Wifi,
  Phone,
  PiggyBank,
  Wallet,
  Building2,
  Globe,
}

export const ICON_OPTIONS = Object.keys(ICON_MAP)

export function resolveIcon(name?: string): LucideIcon {
  if (name && ICON_MAP[name]) return ICON_MAP[name]
  return Tag
}

/**
 * Padrão de categorias do James Family Office.
 * O campo `name` corresponde aos valores aceitos pela coleção `transactions.category`
 * (estendido com as categorias dos cadastros — Veículo, Tecnologia, etc.).
 *
 * Servem como FALLBACK quando não há conexão com o banco ou a coleção
 * `categories` está vazia. A fonte canônica passou a ser o banco (Onda 5).
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

const FALLBACK_OTHERS = CATEGORY_META[CATEGORY_META.length - 1]

/** Resolve o meta de uma categoria pelo nome, usando o array estático (fallback). */
export function getCategoryMeta(name?: string): CategoryMeta {
  if (!name) return FALLBACK_OTHERS
  return CATEGORY_META.find((c) => c.name.toLowerCase() === name.toLowerCase()) || FALLBACK_OTHERS
}

/**
 * Converte uma categoria vinda do banco (coleção `categories`) em CategoryMeta.
 * Se faltar cor/ícone, herda do fallback estático (se o nome existir) ou usa
 * defaults sensatos.
 */
export function categoryToMeta(cat: Category): CategoryMeta {
  const fallback = getCategoryMeta(cat.name)
  const sameName = fallback.name === cat.name
  const color = cat.color || fallback.color || '#94A3B8'
  // Se a categoria do banco tem nome de um fallback, reusa o ícone do fallback
  // quando icon estiver vazio — fallback.icon é o próprio componente Lucide.
  const icon: LucideIcon =
    cat.icon && ICON_MAP[cat.icon] ? ICON_MAP[cat.icon] : sameName ? fallback.icon : Tag
  return {
    name: cat.name,
    color,
    bg: sameName ? fallback.bg : 'bg-slate-500/15',
    ring: sameName ? fallback.ring : 'ring-slate-500/30',
    icon,
  }
}

/**
 * Mescla categorias do banco com o fallback estático.
 * - Categorias do banco prevalecem (mesmo nome substitui o fallback).
 * - Categorias do fallback que não existem no banco são adicionadas no final,
 *   garantindo que a lista nunca fique vazia.
 * - Ordena: padrão primeiro (is_default), depois customizadas, alfabético.
 */
export function mergeCategories(dbCats: Category[]): CategoryMeta[] {
  const seen = new Set<string>()
  const merged: CategoryMeta[] = []

  const sortedDb = [...dbCats].sort((a, b) => {
    if (!!a.is_default !== !!b.is_default) return a.is_default ? -1 : 1
    return a.name.localeCompare(b.name, 'pt-BR')
  })

  for (const c of sortedDb) {
    const key = c.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(categoryToMeta(c))
  }

  // adiciona fallbacks que não vieram do banco
  for (const m of CATEGORY_META) {
    const key = m.name.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(m)
    }
  }

  return merged
}
