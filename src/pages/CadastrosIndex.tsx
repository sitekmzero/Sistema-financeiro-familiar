import { Link } from 'react-router-dom'
import { Building, CreditCard, TrendingUp, Tags, Users, Target, Building2 } from 'lucide-react'

const cards = [
  {
    title: 'Fornecedores',
    description: 'Gerencie contatos e aliases',
    icon: Building2,
    to: '/cadastros/fornecedores',
    color: 'text-sky-400',
    bg: 'bg-sky-500/15',
    ring: 'ring-sky-500/30',
  },
  {
    title: 'Categorias',
    description: 'Organize transações por tipo',
    icon: Tags,
    to: '/cadastros/categorias',
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    ring: 'ring-purple-500/30',
  },
  {
    title: 'Membros',
    description: 'Pessoas da família',
    icon: Users,
    to: '/cadastros/membros',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    ring: 'ring-emerald-500/30',
  },
  {
    title: 'Orçamentos',
    description: 'Metas e limites por categoria',
    icon: Target,
    to: '/cadastros/orcamentos',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    ring: 'ring-amber-500/30',
  },
  {
    title: 'Bancos',
    description: 'Instituições financeiras',
    icon: Building,
    to: '/cadastros/bancos',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
    ring: 'ring-cyan-500/30',
  },
  {
    title: 'Contas & Cartões',
    description: 'Contas correntes, poupanças e cartões',
    icon: CreditCard,
    to: '/cadastros/contas',
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/15',
    ring: 'ring-fuchsia-500/30',
  },
  {
    title: 'Fontes de Renda',
    description: 'Pró-labore, comissões e renda extra',
    icon: TrendingUp,
    to: '/cadastros/fontes-renda',
    color: 'text-green-400',
    bg: 'bg-green-500/15',
    ring: 'ring-green-500/30',
  },
]

export default function CadastrosIndex() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-100">Cadastros</h1>
        <p className="text-sm text-slate-400 mt-1">
          Base de dados do James Family Office — tudo que estrutura suas finanças.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.title}
              to={c.to}
              className={`group rounded-2xl border border-slate-800 ${c.bg} ${c.ring} ring-1 p-5 hover:scale-[1.02] hover:border-slate-700 transition-all`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-12 h-12 rounded-xl ${c.bg} ring-1 ${c.ring} flex items-center justify-center ${c.color}`}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-base font-heading font-semibold text-slate-100 mt-4">
                {c.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{c.description}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
