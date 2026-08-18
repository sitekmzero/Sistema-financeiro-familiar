import React from 'react'
import { CATEGORY_META } from '@/lib/categories'
import { Tag, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export default function Categorias() {
  const { toast } = useToast()

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Tag className="w-6 h-6 text-purple-400" />
          <div>
            <h2 className="text-xl font-heading font-bold text-slate-100">Categorias</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Categorias padrão do James Family Office — use cores e ícones para organizar seus
              gastos.
            </p>
          </div>
        </div>
        <Button
          onClick={() =>
            toast({
              title: 'Em breve',
              description: 'A criação de categorias customizadas será liberada na próxima versão.',
            })
          }
          className="bg-emerald-600 hover:bg-emerald-700 text-slate-950"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nova Categoria
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {CATEGORY_META.map((cat) => {
          const Icon = cat.icon
          return (
            <div
              key={cat.name}
              className={`rounded-2xl border p-5 ${cat.bg} ${cat.ring} ring-1 hover:scale-[1.02] transition-transform cursor-default`}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${cat.color}22`, color: cat.color }}
              >
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-heading font-semibold text-slate-100">{cat.name}</h3>
              <div className="mt-2 flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  cor padrão
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
