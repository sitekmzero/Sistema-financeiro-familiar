import { TrendingUp, Hammer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function FontesRenda() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-emerald-400" />
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-100">Fontes de Renda</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pró-labore, comissões e renda extra da família.
          </p>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
          <div className="relative w-20 h-20 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center">
            <Hammer className="w-10 h-10 text-emerald-400" />
          </div>
        </div>
        <h3 className="text-lg font-heading font-semibold text-slate-100 mt-6">
          Em desenvolvimento
        </h3>
        <p className="text-sm text-slate-400 mt-2 max-w-md">
          Esta tela está sendo construída e logo permitirá cadastrar e acompanhar todas as fontes de
          renda da família — pró-labore, comissões, aluguéis, dividendos e renda extra.
        </p>
        <Badge className="mt-4 bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
          Próxima onda
        </Badge>
      </div>
    </div>
  )
}
