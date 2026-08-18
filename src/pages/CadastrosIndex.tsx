import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { financeService } from '@/services/financeService'
import { CATEGORY_META } from '@/lib/categories'
import { Settings, Truck, Tag, Users, Wallet, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Counts {
  suppliers: number
  categories: number
  members: number
  budgets: number
}

export default function CadastrosIndex() {
  const [counts, setCounts] = useState<Counts>({
    suppliers: 0,
    categories: CATEGORY_META.length,
    members: 0,
    budgets: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [suppliers, members, budgets] = await Promise.all([
          financeService.getSuppliers(),
          financeService.getFamilyMembers(),
          financeService.getBudgets(),
        ])
        setCounts({
          suppliers: suppliers.length,
          categories: CATEGORY_META.length,
          members: members.length,
          budgets: budgets.length,
        })
      } catch (err) {
        console.error('Failed to load cadastros counts:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const cards = [
    {
      to: '/cadastros/fornecedores',
      title: 'Fornecedores',
      desc: 'Cadastro de fornecedores recorrentes da família',
      count: counts.suppliers,
      icon: Truck,
      color: 'from-blue-500/20 to-blue-700/10 border-blue-500/30 text-blue-400',
    },
    {
      to: '/cadastros/categorias',
      title: 'Categorias',
      desc: 'Categorias padrão e customizadas de gastos',
      count: counts.categories,
      icon: Tag,
      color: 'from-purple-500/20 to-purple-700/10 border-purple-500/30 text-purple-400',
    },
    {
      to: '/cadastros/membros',
      title: 'Membros da Família',
      desc: 'Titular, cônjuge e dependentes',
      count: counts.members,
      icon: Users,
      color: 'from-emerald-500/20 to-emerald-700/10 border-emerald-500/30 text-emerald-400',
    },
    {
      to: '/cadastros/orcamentos',
      title: 'Orçamentos',
      desc: 'Limites mensais por categoria',
      count: counts.budgets,
      icon: Wallet,
      color: 'from-amber-500/20 to-amber-700/10 border-amber-500/30 text-amber-400',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-emerald-400" />
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-100">Cadastros</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Base organizada de fornecedores, categorias, membros e orçamentos — integrada ao James.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.to}
              to={c.to}
              className={`group bg-gradient-to-br ${c.color} border rounded-2xl p-5 hover:ring-2 hover:ring-emerald-500/40 transition-all`}
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-slate-900/60 flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-heading font-bold text-slate-100">
                    {isLoading ? '—' : c.count}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                    registros
                  </div>
                </div>
              </div>
              <h3 className="text-base font-heading font-semibold text-slate-100 mt-4">
                {c.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{c.desc}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 px-0 text-emerald-400 hover:bg-transparent hover:text-emerald-300"
              >
                Acessar <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
