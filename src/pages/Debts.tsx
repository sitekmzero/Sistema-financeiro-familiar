import React, { useState, useEffect, useMemo } from 'react'
import { financeService } from '@/services/financeService'
import { useRealtime } from '@/hooks/use-realtime'
import type { Debt, DebtPayment } from '@/types/finance'
import {
  CreditCard,
  PlusCircle,
  TrendingDown,
  Calendar,
  Sparkles,
  Zap,
  Clock,
  Percent,
  CheckCircle2,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

export default function Debts() {
  const { toast } = useToast()
  const [debts, setDebts] = useState<Debt[]>([])
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball')
  const [isLoading, setIsLoading] = useState(true)

  // New Debt Modal
  const [newDebtOpen, setNewDebtOpen] = useState(false)
  const [savingDebt, setSavingDebt] = useState(false)
  const [newDebtForm, setNewDebtForm] = useState({
    name: '',
    creditor: '',
    total_amount: '',
    remaining_amount: '',
    interest_rate: '',
    monthly_payment: '',
    due_date: '',
  })

  // Payment Modal
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payNote, setPayNote] = useState('')
  const [savingPay, setSavingPay] = useState(false)

  const loadData = async () => {
    try {
      const list = await financeService.getDebts()
      setDebts(list)
    } catch (err) {
      console.error('Failed to load debts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('debts', () => {
    financeService.getDebts().then(setDebts)
  })

  // Computed Strategy Sorting
  const sortedDebts = useMemo(() => {
    const active = debts.filter((d) => d.status !== 'paga')
    const paid = debts.filter((d) => d.status === 'paga')

    if (strategy === 'snowball') {
      // Smallest remaining balance first
      active.sort((a, b) => a.remaining_amount - b.remaining_amount)
    } else {
      // Highest interest rate first
      active.sort((a, b) => (b.interest_rate || 0) - (a.interest_rate || 0))
    }
    return [...active, ...paid]
  }, [debts, strategy])

  const totalRemaining = useMemo(() => {
    return debts.reduce((acc, d) => acc + (d.status !== 'paga' ? d.remaining_amount : 0), 0)
  }, [debts])

  const totalMonthlyPayment = useMemo(() => {
    return debts.reduce((acc, d) => acc + (d.status !== 'paga' ? d.monthly_payment || 0 : 0), 0)
  }, [debts])

  // Projected payoff estimate in months
  const projectedMonths =
    totalMonthlyPayment > 0 ? Math.ceil(totalRemaining / totalMonthlyPayment) : 0

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDebtForm.name || !newDebtForm.total_amount) {
      toast({ title: 'Preencha o nome e o valor total', variant: 'destructive' })
      return
    }

    setSavingDebt(true)
    try {
      const tot = parseFloat(newDebtForm.total_amount.replace(',', '.'))
      const rem = newDebtForm.remaining_amount
        ? parseFloat(newDebtForm.remaining_amount.replace(',', '.'))
        : tot
      await financeService.createDebt({
        name: newDebtForm.name,
        creditor: newDebtForm.creditor,
        total_amount: tot,
        remaining_amount: rem,
        interest_rate: parseFloat(newDebtForm.interest_rate.replace(',', '.')) || 0,
        monthly_payment: parseFloat(newDebtForm.monthly_payment.replace(',', '.')) || 0,
        due_date: newDebtForm.due_date ? `${newDebtForm.due_date} 00:00:00.000Z` : undefined,
        status: rem === 0 ? 'paga' : 'em_dia',
        strategy,
      })

      toast({ title: 'Dívida cadastrada com sucesso!' })
      setNewDebtOpen(false)
      setNewDebtForm({
        name: '',
        creditor: '',
        total_amount: '',
        remaining_amount: '',
        interest_rate: '',
        monthly_payment: '',
        due_date: '',
      })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao cadastrar', description: err.message, variant: 'destructive' })
    } finally {
      setSavingDebt(false)
    }
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDebt || !payAmount) return

    const amt = parseFloat(payAmount.replace(',', '.'))
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' })
      return
    }

    setSavingPay(true)
    try {
      await financeService.recordDebtPayment(
        selectedDebt.id,
        amt,
        `${payDate} 12:00:00.000Z`,
        payNote || undefined,
      )

      toast({
        title: 'Pagamento registrado com sucesso!',
        description: 'Dívida atualizada. Parabéns pelo foco e disciplina!',
      })
      setPayModalOpen(false)
      setSelectedDebt(null)
      setPayAmount('')
      setPayNote('')
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro no pagamento', description: err.message, variant: 'destructive' })
    } finally {
      setSavingPay(false)
    }
  }

  const handleDeleteDebt = async (id: string) => {
    if (!confirm('Deseja excluir esta dívida do registro?')) return
    try {
      await financeService.deleteDebt(id)
      toast({ title: 'Dívida removida' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* 1. Header Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Restante */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total a Quitar
          </span>
          <div className="text-2xl sm:text-3xl font-heading font-bold text-rose-400 mt-1">
            {formatCurrency(totalRemaining)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Soma de todas as pendências ativas</p>
        </div>

        {/* Pagamento Mensal */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Compromisso Mensal
          </span>
          <div className="text-2xl sm:text-3xl font-heading font-bold text-amber-400 mt-1">
            {formatCurrency(totalMonthlyPayment)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Total de parcelas mínimas mensais</p>
        </div>

        {/* Projeção de Quitação */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Projeção de Quitação
          </span>
          <div className="text-2xl sm:text-3xl font-heading font-bold text-emerald-400 mt-1">
            {projectedMonths > 0 ? `~${projectedMonths} meses` : 'Quitado!'}
          </div>
          <p className="text-xs text-slate-400 mt-1">Mantendo os pagamentos atuais programados</p>
        </div>
      </div>

      {/* 2. Strategy Selector Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#1E293B] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> Recomendação do James
          </div>
          <h3 className="font-heading font-bold text-lg text-slate-100">
            {strategy === 'snowball'
              ? 'Estratégia Bola de Neve (Recomendada): Foco no Menor Saldo'
              : 'Estratégia Avalanche: Foco na Maior Taxa de Juros'}
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            {strategy === 'snowball'
              ? 'Eliminar as dívidas menores primeiro gera vitórias emocionais rápidas, elevando sua vibração e liberando fluxo de caixa para as maiores.'
              : 'Atacar os maiores juros primeiro economiza o valor total pago em taxas financeiras ao longo do tempo.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              onClick={() => setStrategy('snowball')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                strategy === 'snowball'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bola de Neve
            </button>
            <button
              onClick={() => setStrategy('avalanche')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                strategy === 'avalanche'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Avalanche
            </button>
          </div>

          <Button
            onClick={() => setNewDebtOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-9"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" /> Adicionar Dívida
          </Button>
        </div>
      </div>

      {/* 3. Debts List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sortedDebts.map((debt, index) => {
          const paidPercent =
            debt.total_amount > 0
              ? Math.min(
                  100,
                  Math.round(
                    ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100,
                  ),
                )
              : 100
          const isPaid = debt.status === 'paga' || debt.remaining_amount <= 0

          return (
            <div
              key={debt.id}
              className={`bg-[#111827] border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-slate-700 ${
                isPaid ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-slate-800'
              }`}
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-400 font-mono">
                        #{index + 1}
                      </span>
                      <h4 className="font-heading font-bold text-base text-slate-100">
                        {debt.name}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-400">
                      {debt.creditor || 'Instituição Financeira'}
                    </span>
                  </div>

                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Paga
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" /> Em dia
                    </span>
                  )}
                </div>

                {/* Progress Bar & Balances */}
                <div className="space-y-2 my-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-[11px] text-slate-400">Saldo Restante</div>
                      <div className="text-xl font-heading font-bold text-slate-100">
                        {formatCurrency(debt.remaining_amount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Total Original</div>
                      <div className="text-xs font-mono text-slate-300">
                        {formatCurrency(debt.total_amount)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Progresso de amortização</span>
                      <span className="font-bold text-emerald-400">{paidPercent}%</span>
                    </div>
                    <Progress
                      value={paidPercent}
                      className="h-2 bg-slate-800 [&>div]:bg-emerald-400"
                    />
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400">Taxa de Juros:</span>
                    <div className="font-semibold text-slate-200">
                      {debt.interest_rate || 0}% a.m.
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Parcela Mensal:</span>
                    <div className="font-semibold text-slate-200">
                      {formatCurrency(debt.monthly_payment || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleDeleteDebt(debt.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {!isPaid ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedDebt(debt)
                      setPayAmount(
                        debt.monthly_payment
                          ? debt.monthly_payment.toString()
                          : debt.remaining_amount.toString(),
                      )
                      setPayModalOpen(true)
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-8 px-4"
                  >
                    Registrar Pagamento
                  </Button>
                ) : (
                  <span className="text-xs text-emerald-400 font-medium">100% Finalizado</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal: Nova Dívida */}
      <Dialog open={newDebtOpen} onOpenChange={setNewDebtOpen}>
        <DialogContent className="bg-[#111827] border-slate-800 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-100">
              Cadastrar Nova Dívida
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateDebt} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Nome / Título da Dívida</Label>
              <Input
                required
                placeholder="Ex: Cartão Nubank, Financiamento Carro"
                value={newDebtForm.name}
                onChange={(e) => setNewDebtForm({ ...newDebtForm, name: e.target.value })}
                className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Credor / Banco</Label>
              <Input
                placeholder="Ex: Nubank, Santander, Banco do Brasil"
                value={newDebtForm.creditor}
                onChange={(e) => setNewDebtForm({ ...newDebtForm, creditor: e.target.value })}
                className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Valor Total Original (R$)</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={newDebtForm.total_amount}
                  onChange={(e) => setNewDebtForm({ ...newDebtForm, total_amount: e.target.value })}
                  className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Saldo Restante (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Se vazio, igual ao total"
                  value={newDebtForm.remaining_amount}
                  onChange={(e) =>
                    setNewDebtForm({ ...newDebtForm, remaining_amount: e.target.value })
                  }
                  className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Taxa de Juros (% a.m.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 2.5"
                  value={newDebtForm.interest_rate}
                  onChange={(e) =>
                    setNewDebtForm({ ...newDebtForm, interest_rate: e.target.value })
                  }
                  className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Parcela Mensal (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 350.00"
                  value={newDebtForm.monthly_payment}
                  onChange={(e) =>
                    setNewDebtForm({ ...newDebtForm, monthly_payment: e.target.value })
                  }
                  className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Próximo Vencimento</Label>
              <Input
                type="date"
                value={newDebtForm.due_date}
                onChange={(e) => setNewDebtForm({ ...newDebtForm, due_date: e.target.value })}
                className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setNewDebtOpen(false)}
                className="text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingDebt}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
              >
                {savingDebt ? 'Salvando...' : 'Salvar Dívida'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Registrar Pagamento */}
      {selectedDebt && (
        <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
          <DialogContent className="bg-[#111827] border-slate-800 text-slate-100 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold text-slate-100 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" /> Registrar Pagamento
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleRecordPayment} className="space-y-4 py-2">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="text-xs text-slate-400">Dívida:</div>
                <div className="text-base font-bold text-slate-100">{selectedDebt.name}</div>
                <div className="text-xs text-amber-400 font-mono mt-0.5">
                  Saldo Restante: {formatCurrency(selectedDebt.remaining_amount)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Valor Pago (R$)</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Data do Pagamento</Label>
                  <Input
                    required
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Observações (Opcional)</Label>
                <Input
                  placeholder="Ex: Parcela 04/12 adiantada"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPayModalOpen(false)}
                  className="text-slate-400"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={savingPay}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
                >
                  {savingPay ? 'Salvando...' : 'Confirmar Pagamento'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
