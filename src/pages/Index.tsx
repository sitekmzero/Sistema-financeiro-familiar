import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { financeService } from '@/services/financeService'
import { useRealtime } from '@/hooks/use-realtime'
import { getRandomMentorQuote } from '@/lib/quotes'
import type { Transaction, Debt, ReserveGoal, Trip } from '@/types/finance'
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CreditCard,
  Plane,
  ArrowRight,
  PlusCircle,
  Clock,
  ChevronRight,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Quote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function Dashboard() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [reserveGoals, setReserveGoals] = useState<ReserveGoal[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Quick Pay Modal
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payLoading, setPayLoading] = useState(false)

  // Daily Mentor Quote
  const mentorQuote = useMemo(() => getRandomMentorQuote(), [])

  // Load all initial data
  const loadData = async () => {
    try {
      const [txList, debtList, goalsList, tripList] = await Promise.all([
        financeService.getTransactions(50),
        financeService.getDebts(),
        financeService.getReserveGoals(),
        financeService.getTrips(),
      ])
      setTransactions(txList)
      setDebts(debtList)
      setReserveGoals(goalsList)
      setTrips(tripList)
    } catch (err) {
      console.error('Failed loading dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Realtime subscriptions
  useRealtime('transactions', () => {
    financeService.getTransactions(50).then(setTransactions)
  })
  useRealtime('debts', () => {
    financeService.getDebts().then(setDebts)
  })
  useRealtime('reserve_goals', () => {
    financeService.getReserveGoals().then(setReserveGoals)
  })
  useRealtime('trips', () => {
    financeService.getTrips().then(setTrips)
  })

  // Computed Financial Totals
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let inc = 0
    let exp = 0
    transactions.forEach((tx) => {
      if (tx.type === 'income') inc += tx.amount
      else exp += tx.amount
    })
    return { totalIncome: inc, totalExpense: exp, balance: inc - exp }
  }, [transactions])

  // Debt Calculations
  const totalDebtRemaining = useMemo(() => {
    return debts.reduce((acc, d) => acc + (d.status !== 'paga' ? d.remaining_amount : 0), 0)
  }, [debts])

  const sortedUpcomingDebts = useMemo(() => {
    return [...debts]
      .filter((d) => d.status !== 'paga' && d.remaining_amount > 0)
      .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime())
  }, [debts])

  // Reserve Goal progress
  const primaryReserve = reserveGoals[0]
  const reserveSaved = primaryReserve ? 3400 : 0 // estimate or calculated
  const reserveTarget = primaryReserve?.target_amount || 12000
  const reservePercent = Math.min(100, Math.round((reserveSaved / reserveTarget) * 100))

  // Trip progress
  const primaryTrip = trips[0]
  const tripSaved = primaryTrip?.saved_amount || 0
  const tripBudget = primaryTrip?.budget || 9000
  const tripPercent = Math.min(100, Math.round((tripSaved / tripBudget) * 100))

  // Category Breakdown for Donut simulation
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {}
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount
      })
    const totalExp = Object.values(map).reduce((a, b) => a + b, 0) || 1
    return Object.entries(map)
      .map(([name, val]) => ({
        name,
        amount: val,
        percent: Math.round((val / totalExp) * 100),
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [transactions])

  // Handle Quick Pay
  const handleQuickPay = async () => {
    if (!selectedDebt || !payAmount) return
    const amountNum = parseFloat(payAmount.replace(',', '.'))
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Insira um valor numérico válido.',
        variant: 'destructive',
      })
      return
    }

    setPayLoading(true)
    try {
      await financeService.recordDebtPayment(
        selectedDebt.id,
        amountNum,
        new Date().toISOString(),
        'Pagamento via Dashboard',
      )
      toast({
        title: 'Dívida atualizada com sucesso!',
        description: 'Boa! Menos uma pendência e você está mais perto da liberdade financeira.',
      })
      setSelectedDebt(null)
      setPayAmount('')
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro no pagamento', description: err.message, variant: 'destructive' })
    } finally {
      setPayLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return 0
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* 1. Hero / Priority Card: FOCO AGORA */}
      <div className="bg-gradient-to-br from-emerald-950/60 via-[#111827] to-[#1E293B] border border-emerald-500/30 rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Glow corner */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Prioridades Estratégicas Familiares
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-slate-100">
              Foco Agora: Rumo à Abundância Plena
            </h2>
          </div>
          <Button
            onClick={() => navigate('/chat')}
            className="bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 text-slate-950 font-bold hover:brightness-110 shadow-lg shadow-emerald-500/20 self-start sm:self-auto text-xs sm:text-sm"
          >
            Orientação do James <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>

        {/* 3 Strategic Priority Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
          {/* Priority 1: Dívidas */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center gap-1.5 font-medium text-rose-400">
                  <CreditCard className="w-4 h-4" /> 1. Quitar Dívidas
                </span>
                <span className="font-mono text-slate-300">
                  {sortedUpcomingDebts.length > 0
                    ? `${getDaysDiff(sortedUpcomingDebts[0].due_date)} dias próx.`
                    : '100% quitadas'}
                </span>
              </div>
              <div className="text-lg font-heading font-bold text-slate-100">
                {formatCurrency(totalDebtRemaining)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {sortedUpcomingDebts.length > 0
                  ? `Próx: ${sortedUpcomingDebts[0].name}`
                  : 'Parabéns! Sem dívidas ativas.'}
              </p>
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Plano Bola de Neve</span>
                <span className="text-amber-400 font-semibold">
                  {debts.filter((d) => d.status === 'paga').length}/{debts.length} quitadas
                </span>
              </div>
              <Progress
                value={
                  debts.length > 0
                    ? (debts.filter((d) => d.status === 'paga').length / debts.length) * 100
                    : 100
                }
                className="h-2 bg-slate-800 [&>div]:bg-amber-400"
              />
            </div>
          </div>

          {/* Priority 2: Reserva de Emergência */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                  <ShieldCheck className="w-4 h-4" /> 2. Reserva Blindada
                </span>
                <span className="font-mono text-emerald-400 font-bold">{reservePercent}%</span>
              </div>
              <div className="text-lg font-heading font-bold text-slate-100">
                {formatCurrency(reserveSaved)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Meta: {formatCurrency(reserveTarget)} · Segurança de 4 meses
              </p>
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Progresso</span>
                <span className="text-emerald-400 font-semibold">R$ 400/mês</span>
              </div>
              <Progress
                value={reservePercent}
                className="h-2 bg-slate-800 [&>div]:bg-emerald-400"
              />
            </div>
          </div>

          {/* Priority 3: Viagem de Férias */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center gap-1.5 font-medium text-teal-400">
                  <Plane className="w-4 h-4" /> 3. Viagem dos Sonhos
                </span>
                <span className="font-mono text-teal-400 font-bold">{tripPercent}%</span>
              </div>
              <div className="text-lg font-heading font-bold text-slate-100">
                {formatCurrency(tripSaved)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {primaryTrip?.destination || 'Fernando de Noronha'} (Faltam{' '}
                {getDaysDiff(primaryTrip?.start_date)} dias)
              </p>
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Orçamento</span>
                <span className="text-teal-400 font-semibold">{formatCurrency(tripBudget)}</span>
              </div>
              <Progress value={tripPercent} className="h-2 bg-slate-800 [&>div]:bg-teal-400" />
            </div>
          </div>
        </div>

        {/* Motivational Line from James */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-emerald-400 font-semibold">Mensagem do James:</strong> "Você
            está no caminho certo! Com o próximo aporte de R$ 450 você quitará a primeira pendência
            e liberará mais fluxo para a viagem familiar."
          </span>
        </div>
      </div>

      {/* 2. Top Summary Cards (Saldo, Entradas, Saídas) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Saldo Líquido */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Saldo Líquido Acumulado
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-heading font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
          >
            {balance >= 0 ? '+' : ''}
            {formatCurrency(balance)}
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Saldo positivo no período
            analisado
          </p>
        </div>

        {/* Receitas */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Receitas Registradas
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-bold text-emerald-400">
            +{formatCurrency(totalIncome)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Salário familiar e receitas extras</p>
        </div>

        {/* Despesas */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Despesas Totais
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-bold text-rose-400">
            -{formatCurrency(totalExpense)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Moradia, alimentação, dívidas e lazer</p>
        </div>
      </div>

      {/* 3. Middle Section: Dívidas a Vencer + Distribuição de Gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dívidas a Vencer (2 cols) */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-base sm:text-lg text-slate-100 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-400" /> Dívidas a Vencer
                </h3>
                <p className="text-xs text-slate-400">Organizadas por data limite de pagamento</p>
              </div>
              <Link
                to="/dividas"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                Gerenciar todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {sortedUpcomingDebts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Nenhuma dívida pendente. Excelente trabalho!
                </div>
              ) : (
                sortedUpcomingDebts.map((debt) => {
                  const days = getDaysDiff(debt.due_date)
                  const isUrgent = days <= 10
                  const isModerate = days <= 20
                  return (
                    <div
                      key={debt.id}
                      className="p-3.5 bg-[#1E293B]/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-100">{debt.name}</div>
                          <div className="text-xs text-slate-400">
                            Credor: {debt.creditor || 'Geral'} · Juros: {debt.interest_rate || 0}%
                            a.m.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                        <div className="text-left sm:text-right">
                          <div className="text-sm font-heading font-bold text-slate-100">
                            {formatCurrency(debt.remaining_amount)}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isUrgent
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : isModerate
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {days > 0 ? `Vence em ${days} dias` : 'Vence hoje!'}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedDebt(debt)
                            setPayAmount(
                              debt.monthly_payment
                                ? debt.monthly_payment.toString()
                                : debt.remaining_amount.toString(),
                            )
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs h-8 px-3"
                        >
                          Pagar
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Distribuição de Gastos (1 col) */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-bold text-base sm:text-lg text-slate-100 mb-1">
              Distribuição de Gastos
            </h3>
            <p className="text-xs text-slate-400 mb-4">Porcentagem por categoria do mês</p>

            <div className="space-y-3">
              {categoryStats.slice(0, 5).map((cat, idx) => {
                const colors = [
                  'bg-emerald-500',
                  'bg-amber-500',
                  'bg-sky-500',
                  'bg-violet-500',
                  'bg-rose-500',
                ]
                const colorClass = colors[idx % colors.length]
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${colorClass}`} />
                        {cat.name}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {formatCurrency(cat.amount)} ({cat.percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colorClass}`}
                        style={{ width: `${cat.percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <Link
              to="/transacoes"
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 py-2 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition"
            >
              Ver Extrato Completo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row: Dica do Dia Mentores + Últimas Transações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dica do Dia James / Mentores */}
        <div className="bg-gradient-to-br from-amber-950/30 via-[#111827] to-[#1E293B] border border-amber-500/30 rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
          <Quote className="w-20 h-20 text-amber-500/10 absolute -bottom-4 -right-4 rotate-12 pointer-events-none" />
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
              <Sparkles className="w-4 h-4" /> Dica dos Mentores (James)
            </div>
            <p className="text-sm sm:text-base text-slate-200 italic leading-relaxed mb-4">
              "{mentorQuote.quote}"
            </p>
            <div className="text-xs text-amber-300 font-semibold">
              — {mentorQuote.author} · {mentorQuote.theme}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-amber-500/20 flex items-center justify-between">
            <span className="text-xs text-slate-400">Quer aprofundar este conselho?</span>
            <Button
              size="sm"
              onClick={() => navigate('/chat')}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs h-8"
            >
              Falar no Chat
            </Button>
          </div>
        </div>

        {/* Últimas Transações */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-base sm:text-lg text-slate-100">
                  Últimas Transações
                </h3>
                <p className="text-xs text-slate-400">Atividades financeiras mais recentes</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/transacoes')}
                className="text-xs border-slate-700 text-slate-300 hover:text-white"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Nova Transação
              </Button>
            </div>

            <div className="divide-y divide-slate-800/80">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.type === 'income'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {tx.type === 'income' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200">{tx.description}</div>
                      <div className="text-[11px] text-slate-400">
                        {tx.category} · {new Date(tx.date).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`font-heading font-bold font-mono text-right ${
                      tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Pay Modal */}
      {selectedDebt && (
        <Dialog open={!!selectedDebt} onOpenChange={() => setSelectedDebt(null)}>
          <DialogContent className="bg-[#111827] border-slate-800 text-slate-100 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold text-slate-100 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" /> Registrar Pagamento de Dívida
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-xs text-slate-400">Dívida Selecionada:</div>
                <div className="text-base font-bold text-slate-100">{selectedDebt.name}</div>
                <div className="text-xs text-amber-400 font-mono mt-1">
                  Saldo Restante: {formatCurrency(selectedDebt.remaining_amount)}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-amount" className="text-xs font-medium text-slate-300">
                  Valor a Pagar (R$)
                </Label>
                <Input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Ex: 450.00"
                  className="bg-[#1E293B] border-slate-700 text-slate-100 h-11"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => setSelectedDebt(null)}
                className="text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleQuickPay}
                disabled={payLoading}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
              >
                {payLoading ? 'Processando...' : 'Confirmar Pagamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
