import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { financeService } from '@/services/financeService'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getVibrationalInsight,
  getVibrationalPhrase,
  getRandomGratitudeResponse,
} from '@/lib/vibrational'
import type { Transaction, Debt, BankAccount, GratitudeJournalEntry } from '@/types/finance'
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowRight,
  ChevronRight,
  Wallet,
  CheckCircle2,
  Quote,
  Heart,
  Flower2,
  AlertTriangle,
  Calculator,
  UserCheck,
  Shield,
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

// Categorias de gasto consideradas "alinhadas" (essenciais / investimento em si).
const ALIGNED_CATEGORIES = new Set(['Saúde', 'Educação', 'Moradia', 'Renda', 'Alimentação'])

// Cores vibrantes para as bolhas de categoria (paleta emerald/gold/teal).
const BUBBLE_COLORS = [
  'bg-emerald-500/80',
  'bg-amber-500/80',
  'bg-teal-500/80',
  'bg-yellow-500/80',
  'bg-emerald-400/80',
  'bg-amber-400/80',
  'bg-teal-400/80',
  'bg-lime-500/80',
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Gratidão
  const [gratitudeOpen, setGratitudeOpen] = useState(false)
  const [gratitudeEntry, setGratitudeEntry] = useState('')
  const [gratitudeStreak, setGratitudeStreak] = useState(0)
  const [gratitudeLoading, setGratitudeLoading] = useState(false)

  // Bolha de categoria expandida
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // Insight do dia (roda a cada acesso)
  const insight = useMemo(() => getVibrationalInsight(), [])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return 0
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const loadData = async () => {
    try {
      const [txList, debtList, accList, gratitudeList] = await Promise.all([
        financeService.getTransactions(200),
        financeService.getDebts(),
        financeService.getAccounts(),
        financeService.getGratitudeEntries(200).catch(() => [] as GratitudeJournalEntry[]),
      ])
      setTransactions(txList)
      setDebts(debtList)
      setAccounts(accList)
      // streak de dias consecutivos com gratidão
      setGratitudeStreak(computeStreak(gratitudeList))
    } catch (err) {
      console.error('Failed loading dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('transactions', () => {
    financeService.getTransactions(200).then(setTransactions)
  })
  useRealtime('debts', () => {
    financeService.getDebts().then(setDebts)
  })
  useRealtime('bank_accounts', () => {
    financeService.getAccounts().then(setAccounts)
  })
  useRealtime('gratitude_journal', () => {
    financeService
      .getGratitudeEntries(200)
      .then((l) => setGratitudeStreak(computeStreak(l)))
      .catch(() => {})
  })

  // ---- Saldo real: soma dos saldos das contas bancárias ----
  const totalAccountBalance = useMemo(
    () => accounts.reduce((acc, a) => acc + (a.balance || 0), 0),
    [accounts],
  )

  // ---- Transações do mês atual ----
  const currentMonthTx = useMemo(() => {
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return transactions.filter((t) => t.date && t.date.startsWith(ym))
  }, [transactions])

  const monthExpenses = useMemo(
    () => currentMonthTx.filter((t) => t.type === 'expense'),
    [currentMonthTx],
  )

  const { totalIncome, totalExpense } = useMemo(() => {
    let inc = 0
    let exp = 0
    currentMonthTx.forEach((t) => {
      if (t.type === 'income') inc += t.amount
      else exp += t.amount
    })
    return { totalIncome: inc, totalExpense: exp }
  }, [currentMonthTx])

  // ---- Termômetro Vibracional: % de gastos alinhados ----
  const alignedVsImpulse = useMemo(() => {
    const aligned = monthExpenses
      .filter((t) => ALIGNED_CATEGORIES.has(t.category))
      .reduce((acc, t) => acc + t.amount, 0)
    const impulse = monthExpenses
      .filter((t) => !ALIGNED_CATEGORIES.has(t.category))
      .reduce((acc, t) => acc + t.amount, 0)
    const total = aligned + impulse
    const alignedPct = total > 0 ? Math.round((aligned / total) * 100) : 100
    const impulsePct = total > 0 ? 100 - alignedPct : 0
    return { aligned, impulse, total, alignedPct, impulsePct }
  }, [monthExpenses])

  const vibrationScore = alignedVsImpulse.alignedPct
  const vibrationPhrase = getVibrationalPhrase(vibrationScore)
  const vibrationColor =
    vibrationScore >= 70
      ? 'text-emerald-300'
      : vibrationScore >= 40
        ? 'text-amber-300'
        : 'text-rose-300'
  const vibrationRingColor =
    vibrationScore >= 70 ? '#34d399' : vibrationScore >= 40 ? '#fbbf24' : '#fb7185'

  // ---- Pró-labore: parcelas fixas + média cartões (3 meses) ----
  const proLaboreCalc = useMemo(() => {
    const structuralDebts = debts.filter((d) => d.status !== 'paga' && d.monthly_payment)
    const fixedDebts = structuralDebts.reduce((acc, d) => acc + (d.monthly_payment || 0), 0)

    // média mensal de gastos em cartões de crédito dos últimos 3 meses
    const now = new Date()
    const months: string[] = []
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    const cardAccountIds = new Set(
      accounts
        .filter(
          (a) => a.name?.toLowerCase().startsWith('cartão') || a.account_type === 'credit_card',
        )
        .map((a) => a.id),
    )
    let cardSum = 0
    let monthsWithData = 0
    for (const ym of months) {
      const monthCard = transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.date?.startsWith(ym) &&
            ((t.account && cardAccountIds.has(t.account)) ||
              (t.card_id && cardAccountIds.has(t.card_id))),
        )
        .reduce((acc, t) => acc + t.amount, 0)
      if (monthCard > 0) monthsWithData++
      cardSum += monthCard
    }
    const cardEstimate = monthsWithData > 0 ? cardSum / monthsWithData : 0
    const c6Negative = accounts.find((a) => a.bank_name === 'C6 Bank' && a.balance < 0)
    const c6Coverage = c6Negative ? Math.abs(c6Negative.balance) : 0
    const totalRequired = fixedDebts + cardEstimate + c6Coverage
    return { fixedDebts, cardEstimate, c6Coverage, totalRequired }
  }, [debts, transactions, accounts])

  // ---- Dívidas estruturais a vencer ----
  const structuralDebts = useMemo(
    () =>
      debts
        .filter((d) => d.status !== 'paga' && d.remaining_amount > 0)
        .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime())
        .slice(0, 3),
    [debts],
  )

  // ---- Bolhas de categoria do mês ----
  const categoryBubbles = useMemo(() => {
    const map: Record<string, number> = {}
    monthExpenses.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1
    return Object.entries(map)
      .map(([name, amount], idx) => ({
        name,
        amount,
        percent: Math.round((amount / total) * 100),
        color: BUBBLE_COLORS[idx % BUBBLE_COLORS.length],
        txs: monthExpenses.filter((t) => t.category === name),
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [monthExpenses])

  // ---- Dia sem impulso (estimativa) ----
  const daysWithoutImpulse = useMemo(() => {
    const impulseTx = monthExpenses
      .filter((t) => !ALIGNED_CATEGORIES.has(t.category))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    if (impulseTx.length === 0) {
      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return Math.max(
        0,
        Math.floor((now.getTime() - firstOfMonth.getTime()) / (1000 * 60 * 60 * 24)),
      )
    }
    const lastImpulse = new Date(impulseTx[0].date)
    return Math.max(0, Math.floor((Date.now() - lastImpulse.getTime()) / (1000 * 60 * 60 * 24)))
  }, [monthExpenses])

  const handleSaveGratitude = async () => {
    if (!gratitudeEntry.trim()) return
    setGratitudeLoading(true)
    try {
      await financeService.createGratitudeEntry(gratitudeEntry.trim())
      toast({
        title: 'Gratidão registrada ✨',
        description: getRandomGratitudeResponse(),
      })
      setGratitudeOpen(false)
      setGratitudeEntry('')
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setGratitudeLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  // arco do termômetro (semicircular via SVG)
  const arcRadius = 70
  const arcCircumference = Math.PI * arcRadius // semicirculo
  const arcOffset = arcCircumference * (1 - vibrationScore / 100)

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* 1. HERO — Termômetro Vibracional Financeiro */}
      <div className="bg-gradient-to-br from-emerald-950/70 via-teal-950/40 to-amber-950/30 border border-emerald-500/30 rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Controle de Gastos & Consciência Financeira
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-slate-100">
              Termômetro Vibracional Financeiro
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Abraham Hicks & Bachar · Alinhamento com Abundância
            </p>
          </div>
          <Button
            onClick={() => navigate('/chat')}
            className="bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 text-slate-950 font-bold hover:brightness-110 shadow-lg shadow-emerald-500/20 self-start sm:self-auto text-xs sm:text-sm"
          >
            Orientação do James <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative">
          {/* Indicador semicircular */}
          <div className="flex flex-col items-center justify-center md:col-span-1">
            <svg width="180" height="110" viewBox="0 0 180 110">
              <path
                d="M 20 100 A 70 70 0 0 1 160 100"
                fill="none"
                stroke="#1e293b"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M 20 100 A 70 70 0 0 1 160 100"
                fill="none"
                stroke={vibrationRingColor}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={arcCircumference}
                strokeDashoffset={arcOffset}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className={`text-3xl font-heading font-bold -mt-6 ${vibrationColor}`}>
              {vibrationScore}%
            </div>
            <div className={`text-xs font-semibold mt-1 ${vibrationColor}`}>{vibrationPhrase}</div>
          </div>

          {/* Gastos Alinhados vs. Impulso */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <Flower2 className="w-4 h-4 text-emerald-400" />
              Gastos Alinhados vs. Impulso
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-300 font-semibold">Alinhados (essenciais)</span>
                  <span className="text-slate-300 font-mono">
                    {formatCurrency(alignedVsImpulse.aligned)} · {alignedVsImpulse.alignedPct}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                    style={{ width: `${alignedVsImpulse.alignedPct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-300 font-semibold">Impulso</span>
                  <span className="text-slate-300 font-mono">
                    {formatCurrency(alignedVsImpulse.impulse)} · {alignedVsImpulse.impulsePct}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-400 transition-all"
                    style={{ width: `${alignedVsImpulse.impulsePct}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              "Aja com integridade, sem apego ao resultado." — Bachar (Princípio 14)
            </p>
          </div>
        </div>

        {/* Insight Vibracional do Dia */}
        <div className="mt-5 pt-4 border-t border-emerald-500/20 bg-emerald-950/40 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                Insight Vibracional do Dia · James
              </div>
              <p className="text-sm text-slate-200 italic leading-relaxed">"{insight.text}"</p>
              <div className="text-[11px] text-slate-400 mt-1">
                — {insight.author} · Princípio {insight.principle}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Saldo Real + Pró-labore + Dívidas Estruturais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Saldo Total Real */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Saldo Total Real
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-heading font-bold ${totalAccountBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
          >
            {totalAccountBalance >= 0 ? '+' : ''}
            {formatCurrency(totalAccountBalance)}
          </div>
          <div className="mt-3 space-y-1.5">
            {accounts
              .filter(
                (a) =>
                  a.account_type !== 'credit_card' && !a.name?.toLowerCase().startsWith('cartão'),
              )
              .slice(0, 3)
              .map((a) => (
                <div key={a.id} className="flex justify-between text-[11px]">
                  <span className="text-slate-400">{a.bank_name || a.name}</span>
                  <span
                    className={`font-mono ${a.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                  >
                    {formatCurrency(a.balance)}
                  </span>
                </div>
              ))}
          </div>
          <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Dados reais das contas
            bancárias
          </p>
        </div>

        {/* Motor de Pró-labore */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-[#111827] to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base sm:text-lg text-slate-100 flex items-center gap-2">
                  Motor de Pró-labore
                  <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Retirada Mínima Necessária
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Você e Luiz precisam retirar pelo menos este valor este mês
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 my-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400 font-medium">1. Parcelas Fixas</div>
              <div className="text-lg font-heading font-bold text-rose-400 mt-1">
                {formatCurrency(proLaboreCalc.fixedDebts)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Caixa + Porto A + Porto B</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400 font-medium">2. Média Cartões (3m)</div>
              <div className="text-lg font-heading font-bold text-amber-400 mt-1">
                +{formatCurrency(proLaboreCalc.cardEstimate)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Média faturas cartões</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400 font-medium">3. Cobertura C6</div>
              <div className="text-lg font-heading font-bold text-amber-400 mt-1">
                +{formatCurrency(proLaboreCalc.c6Coverage)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Saldo negativo C6 (prioridade)</div>
            </div>
            <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3.5">
              <div className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider">
                Retirada Mínima
              </div>
              <div className="text-xl font-heading font-bold text-emerald-400 mt-1">
                {formatCurrency(proLaboreCalc.totalRequired)}
              </div>
              <div className="text-[10px] text-emerald-300/80 mt-1">Aporte de Pró-labore</div>
            </div>
          </div>

          <div className="text-xs text-slate-400 border-t border-slate-800/80 pt-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              O saldo negativo do C6 é prioridade de cobertura.
            </span>
          </div>
        </div>
      </div>

      {/* 3. Receitas / Despesas / Gratidão */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Receitas do Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-bold text-emerald-400">
            +{formatCurrency(totalIncome)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Pró-labore e receitas do mês atual</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Despesas do Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-bold text-rose-400">
            -{formatCurrency(totalExpense)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {daysWithoutImpulse} dias sem compras por impulso
          </p>
        </div>

        {/* Botão de Gratidão Financeira */}
        <button
          onClick={() => setGratitudeOpen(true)}
          className="bg-gradient-to-br from-rose-950/40 via-[#111827] to-amber-950/30 border border-rose-500/30 rounded-2xl p-5 text-left hover:border-rose-400/50 transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
              Gratidão Financeira
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-300 flex items-center justify-center group-hover:scale-110 transition">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-heading font-bold text-amber-300">
            {gratitudeStreak > 0 ? `${gratitudeStreak} dias seguidos ✨` : 'Pratique hoje'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {gratitudeStreak > 0
              ? `Você pratica gratidão há ${gratitudeStreak} dias consecutivos`
              : 'Pelo que você é grato financeiramente hoje?'}
          </p>
        </button>
      </div>

      {/* 4. Para Onde Seu Dinheiro Está Indo? (bolhas) + Dívidas Estruturais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bolhas de categoria */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-slate-100">
                Para Onde Seu Dinheiro Está Indo?
              </h3>
              <p className="text-xs text-slate-400">Bolhas proporcionais · mês atual</p>
            </div>
          </div>

          {categoryBubbles.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              Nenhum gasto registrado neste mês ainda. Importe um extrato do C6 para começar. ✨
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 justify-center py-4">
                {categoryBubbles.map((cat) => {
                  const size = Math.max(48, Math.min(140, 48 + cat.percent * 1.4))
                  return (
                    <button
                      key={cat.name}
                      onClick={() =>
                        setExpandedCategory(expandedCategory === cat.name ? null : cat.name)
                      }
                      className={`${cat.color} rounded-full flex flex-col items-center justify-center text-slate-950 font-bold shadow-lg hover:scale-105 transition relative`}
                      style={{ width: `${size}px`, height: `${size}px` }}
                      title={`${cat.name} · ${formatCurrency(cat.amount)}`}
                    >
                      <span className="text-[10px] sm:text-xs leading-tight text-center px-1">
                        {cat.name}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-mono">{cat.percent}%</span>
                    </button>
                  )
                })}
              </div>

              {expandedCategory && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="text-xs font-bold text-slate-200 mb-2">
                    {expandedCategory} — transações do mês
                  </div>
                  <div className="divide-y divide-slate-800/80 max-h-48 overflow-y-auto">
                    {categoryBubbles
                      .find((c) => c.name === expandedCategory)
                      ?.txs.map((tx) => (
                        <div key={tx.id} className="py-2 flex items-center justify-between text-xs">
                          <span className="text-slate-300">{tx.description}</span>
                          <span className="font-mono text-rose-400">
                            -{formatCurrency(tx.amount)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Dívidas Estruturais a Vencer */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-base sm:text-lg text-slate-100 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-400" /> Dívidas Estruturais
                </h3>
                <p className="text-xs text-slate-400">Caixa + 2 Consórcios Porto</p>
              </div>
              <Link
                to="/dividas"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {structuralDebts.map((debt) => {
                const days = getDaysDiff(debt.due_date)
                return (
                  <div
                    key={debt.id}
                    className="p-3 bg-[#1E293B]/60 border border-slate-800 rounded-xl"
                  >
                    <div className="text-sm font-semibold text-slate-100">{debt.name}</div>
                    <div className="flex justify-between mt-1 text-xs">
                      <span className="text-slate-400">
                        Parcela: {formatCurrency(debt.monthly_payment || 0)}
                      </span>
                      <span
                        className={`font-mono ${days <= 10 ? 'text-rose-400' : 'text-amber-400'}`}
                      >
                        {days > 0 ? `${days}d` : 'hoje'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Saldo: {formatCurrency(debt.remaining_amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Últimas transações + dica de gratidão */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-slate-100">
                Últimas Transações
              </h3>
              <p className="text-xs text-slate-400">Atividades mais recentes</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/transacoes')}
              className="text-xs border-slate-700 text-slate-300 hover:text-white"
            >
              Ver Extrato <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              Nenhuma transação registrada. O dashboard agora mostra apenas dados reais — aguardando
              importação do extrato do C6 Bank.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {transactions.slice(0, 6).map((tx) => (
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
          )}
        </div>

        {/* Dica final — Perfis & Previdência */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-bold text-base text-slate-100 mb-1 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Perfis Familiares
            </h3>
            <p className="text-xs text-slate-400 mb-4">Adriana · Luiz · Gabriel</p>
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex justify-between">
                <span>Adriana Araújo (Admin)</span>
                <span className="text-[10px]">Visão Total</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs flex justify-between">
                <span>Luiz Fernando</span>
                <span className="text-[10px] text-slate-400">Cônjuge</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex justify-between">
                <span>Gabriel Araújo</span>
                <span className="text-[10px]">Filho(a)</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
              <Shield className="w-4 h-4" /> Previdência Social (INSS)
            </div>
            <p className="text-[11px] text-slate-300">
              Aposentadoria Social da Adriana catalogada como ativo complementar.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Gratidão */}
      <Dialog open={gratitudeOpen} onOpenChange={setGratitudeOpen}>
        <DialogContent className="bg-[#111827] border-slate-800 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-100 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-400" /> Gratidão Financeira
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-300">Pelo que você é grato financeiramente hoje?</p>
            <Textarea
              value={gratitudeEntry}
              onChange={(e) => setGratitudeEntry(e.target.value)}
              placeholder="Ex: Consegui pagar a fatura do C6 integral"
              className="bg-[#1E293B] border-slate-700 text-slate-100 min-h-[100px]"
            />
            <p className="text-[11px] text-amber-300 italic">
              "A gratidão é o atalho mais rápido para a abundância." — Abraham Hicks
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setGratitudeOpen(false)}
              className="text-slate-400"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveGratitude}
              disabled={gratitudeLoading || !gratitudeEntry.trim()}
              className="bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-bold"
            >
              {gratitudeLoading ? 'Salvando...' : 'Registrar Gratidão ✨'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Calcula a sequência (streak) de dias consecutivos com entrada de gratidão.
function computeStreak(entries: GratitudeJournalEntry[]): number {
  if (!entries.length) return 0
  const days = new Set(
    entries.map((e) => new Date(e.created_at || e.created).toISOString().split('T')[0]),
  )
  let streak = 0
  const cursor = new Date()
  // permite que "hoje" ainda não tenha entrada — conta a partir de ontem se hoje vazio
  let missedToday = false
  const todayStr = cursor.toISOString().split('T')[0]
  if (!days.has(todayStr)) {
    missedToday = true
    cursor.setDate(cursor.getDate() - 1)
  }
  for (;;) {
    const key = cursor.toISOString().split('T')[0]
    if (days.has(key)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  // se hoje não tem entrada mas ontem tem, o streak ainda é válido
  if (missedToday && streak === 0) return 0
  return streak
}
