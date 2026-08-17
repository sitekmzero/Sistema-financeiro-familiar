import React, { useState, useEffect } from 'react'
import { financeService } from '@/services/financeService'
import { useRealtime } from '@/hooks/use-realtime'
import type { WeeklyReport } from '@/types/finance'
import {
  FileBarChart,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Calendar,
  Quote,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  DollarSign,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Reports() {
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadReports = async () => {
    try {
      const list = await financeService.getWeeklyReports()
      setReports(list)
      if (list.length > 0 && !expandedId) {
        setExpandedId(list[0].id)
      }
    } catch (err) {
      console.error('Failed to load weekly reports:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  useRealtime('weekly_reports', () => {
    financeService.getWeeklyReports().then(setReports)
  })

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return 'Semana Vigente'
    const s = new Date(start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    const e = new Date(end).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    return `Semana de ${s} a ${e}`
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-100 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-emerald-400" /> Relatórios Semanais & Insights do
            James
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Acompanhe o balanço semanal da sua família e receba dicas estratégicas dos mentores.
          </p>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="text-center py-16 bg-[#111827] border border-slate-800 rounded-2xl">
            <FileBarChart className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-slate-300">
              Nenhum relatório semanal gerado ainda
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              O James gera relatórios automáticos toda semana com base nas suas transações e nas
              orientações de Abraham Hicks e Bachar.
            </p>
          </div>
        ) : (
          reports.map((report) => {
            const isExpanded = expandedId === report.id
            const isPositive = report.net >= 0

            return (
              <div
                key={report.id}
                className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden transition-all"
              >
                {/* Header Card (Clickable to toggle) */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isPositive
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-base text-slate-100">
                        {formatDateRange(report.week_start, report.week_end)}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{report.insight}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-400">Saldo Líquido</div>
                      <div
                        className={`text-base font-heading font-bold font-mono ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(report.net)}
                      </div>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 bg-slate-900/60 border-t border-slate-800 space-y-6 animate-fade-in-up">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-[#111827] border border-slate-800 rounded-xl">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase">
                          Receitas da Semana
                        </span>
                        <div className="text-xl font-heading font-bold text-emerald-400 mt-1">
                          +{formatCurrency(report.total_income)}
                        </div>
                      </div>

                      <div className="p-4 bg-[#111827] border border-slate-800 rounded-xl">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase">
                          Despesas da Semana
                        </span>
                        <div className="text-xl font-heading font-bold text-rose-400 mt-1">
                          −{formatCurrency(report.total_expense)}
                        </div>
                      </div>

                      <div className="p-4 bg-[#111827] border border-slate-800 rounded-xl">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase">
                          Economia Gerada
                        </span>
                        <div
                          className={`text-xl font-heading font-bold mt-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}
                        >
                          {isPositive ? '+' : ''}
                          {formatCurrency(report.net)}
                        </div>
                      </div>
                    </div>

                    {/* Insight Card */}
                    <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                          Diagnóstico Semanal do James
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 mt-1 leading-relaxed">
                          {report.insight}
                        </p>
                      </div>
                    </div>

                    {/* Dica dos Mentores Section */}
                    {report.tip && (
                      <div className="p-5 bg-gradient-to-br from-amber-950/30 via-[#111827] to-[#1E293B] border border-amber-500/30 rounded-xl relative overflow-hidden">
                        <Quote className="w-16 h-16 text-amber-500/10 absolute -bottom-2 -right-2 rotate-12 pointer-events-none" />
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                          <Sparkles className="w-4 h-4" /> Dica dos Mentores & Alinhamento
                        </div>
                        <div className="text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed italic">
                          {report.tip}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
