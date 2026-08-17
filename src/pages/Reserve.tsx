import React, { useState, useEffect, useMemo } from 'react'
import { financeService } from '@/services/financeService'
import { useRealtime } from '@/hooks/use-realtime'
import type { ReserveGoal, ReserveContribution } from '@/types/finance'
import {
  ShieldCheck,
  PlusCircle,
  TrendingUp,
  Calendar,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
  DollarSign,
  Quote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export default function Reserve() {
  const { toast } = useToast()
  const [goals, setGoals] = useState<ReserveGoal[]>([])
  const [contributions, setContributions] = useState<ReserveContribution[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal Aporte
  const [contribModalOpen, setContribModalOpen] = useState(false)
  const [contribAmount, setContribAmount] = useState('')
  const [contribDate, setContribDate] = useState(new Date().toISOString().split('T')[0])
  const [savingContrib, setSavingContrib] = useState(false)

  // Modal Edit Goal
  const [editGoalOpen, setEditGoalOpen] = useState(false)
  const [targetAmount, setTargetAmount] = useState('12000')
  const [monthlyContrib, setMonthlyContrib] = useState('400')
  const [savingGoal, setSavingGoal] = useState(false)

  const loadData = async () => {
    try {
      const [gList, cList] = await Promise.all([
        financeService.getReserveGoals(),
        financeService.getReserveContributions(),
      ])
      setGoals(gList)
      setContributions(cList)
    } catch (err) {
      console.error('Failed to load reserve data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('reserve_goals', () => {
    financeService.getReserveGoals().then(setGoals)
  })
  useRealtime('reserve_contributions', () => {
    financeService.getReserveContributions().then(setContributions)
  })

  const activeGoal = goals[0] || {
    id: 'default',
    title: 'Reserva de Emergência Familiar',
    target_amount: 12000,
    monthly_contribution: 400,
  }

  const totalSaved = useMemo(() => {
    return contributions.reduce((acc, c) => acc + c.amount, 0)
  }, [contributions])

  const target = activeGoal.target_amount || 12000
  const progressPercent = Math.min(100, Math.round((totalSaved / target) * 100))

  // Assume average monthly family expense is ~R$ 3.000 for "X meses cobertos"
  const monthlyEstimatedCost = 3000
  const monthsCovered = (totalSaved / monthlyEstimatedCost).toFixed(1)

  const handleSaveContrib = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(contribAmount.replace(',', '.'))
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' })
      return
    }

    setSavingContrib(true)
    try {
      if (activeGoal.id === 'default') {
        const created = await financeService.createReserveGoal({
          title: 'Reserva de Emergência Familiar',
          target_amount: 12000,
          monthly_contribution: 400,
        })
        await financeService.recordReserveContribution(
          created.id,
          amt,
          `${contribDate} 12:00:00.000Z`,
        )
      } else {
        await financeService.recordReserveContribution(
          activeGoal.id,
          amt,
          `${contribDate} 12:00:00.000Z`,
        )
      }

      toast({
        title: 'Aporte registrado com sucesso!',
        description: 'Sua segurança financeira e tranquilidade familiar deram mais um salto!',
      })
      setContribModalOpen(false)
      setContribAmount('')
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao registrar aporte', description: err.message, variant: 'destructive' })
    } finally {
      setSavingContrib(false)
    }
  }

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = parseFloat(targetAmount.replace(',', '.'))
    const m = parseFloat(monthlyContrib.replace(',', '.'))
    if (isNaN(t) || t <= 0) return

    setSavingGoal(true)
    try {
      if (activeGoal.id === 'default') {
        await financeService.createReserveGoal({
          title: 'Reserva de Emergência Familiar',
          target_amount: t,
          monthly_contribution: m || 400,
        })
      } else {
        await financeService.updateReserveGoal(activeGoal.id, {
          target_amount: t,
          monthly_contribution: m || 400,
        })
      }
      toast({ title: 'Meta atualizada com sucesso!' })
      setEditGoalOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar meta', description: err.message, variant: 'destructive' })
    } finally {
      setSavingGoal(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* 1. Hero Progress Ring & Summary */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Left: Info */}
        <div className="space-y-4 max-w-xl text-center lg:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Fundo de Proteção & Serenidade
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-100">
            {activeGoal.title || 'Reserva de Emergência Familiar'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            A reserva de emergência é a base da sua tranquilidade psicológica. Ela garante que
            nenhum imprevisto desestabilize sua família ou crie novas dívidas.
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
            <Button
              onClick={() => setContribModalOpen(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 text-xs sm:text-sm h-10 px-5"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" /> Registrar Aporte
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTargetAmount(target.toString())
                setMonthlyContrib((activeGoal.monthly_contribution || 400).toString())
                setEditGoalOpen(true)
              }}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs sm:text-sm h-10"
            >
              Editar Meta
            </Button>
          </div>
        </div>

        {/* Right: Circular Conic Progress Representation */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full flex items-center justify-center p-3 bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-amber-500/20 shadow-inner">
            <div className="w-full h-full rounded-full bg-[#0B1120] border-4 border-emerald-500/30 flex flex-col items-center justify-center text-center p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Acumulado
              </span>
              <span className="text-2xl sm:text-3xl font-heading font-bold text-emerald-400">
                {formatCurrency(totalSaved)}
              </span>
              <span className="text-xs text-amber-400 font-bold mt-1">
                {progressPercent}% da meta
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Meta: {formatCurrency(target)}
              </span>
            </div>
          </div>

          <div className="mt-3 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {monthsCovered} meses de custo essencial cobertos
            </span>
          </div>
        </div>
      </div>

      {/* 2. Motivational Card James + Leis Universais */}
      <div className="bg-gradient-to-br from-amber-950/20 via-[#111827] to-[#1E293B] border border-amber-500/25 rounded-2xl p-6 relative overflow-hidden">
        <Quote className="w-24 h-24 text-amber-500/10 absolute -bottom-6 -right-6 rotate-12 pointer-events-none" />
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" /> Alinhamento de Abundância com James
        </div>
        <p className="text-sm sm:text-base text-slate-200 italic leading-relaxed max-w-3xl">
          "A reserva não foi feita para você esperar que coisas ruins aconteçam, mas para ancorar no
          seu subconsciente um sentimento inabalável de segurança e fartura. O universo responde à
          sua vibração de paz interna — quando você não teme a falta, a prosperidade se multiplica
          com leveza."
        </p>
        <div className="text-xs text-amber-300 font-semibold mt-3">
          — James · Inspirado nos princípios de Abraham Hicks & Bachar
        </div>
      </div>

      {/* 3. History of Contributions */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading font-bold text-base sm:text-lg text-slate-100">
              Histórico de Aportes Realizados
            </h3>
            <p className="text-xs text-slate-400">
              Cada depósito fortalece o escudo financeiro familiar
            </p>
          </div>
        </div>

        {contributions.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            Nenhum aporte registrado ainda. Faça seu primeiro aporte para iniciar o escudo!
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {contributions.map((c) => (
              <div
                key={c.id}
                className="py-3.5 flex items-center justify-between text-xs sm:text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">
                      Aporte para Reserva de Emergência
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      {c.date
                        ? new Date(c.date).toLocaleDateString('pt-BR')
                        : 'Data não registrada'}
                    </div>
                  </div>
                </div>

                <div className="font-heading font-bold font-mono text-emerald-400">
                  +{formatCurrency(c.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Registrar Aporte */}
      <Dialog open={contribModalOpen} onOpenChange={setContribModalOpen}>
        <DialogContent className="bg-[#111827] border-slate-800 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Registrar Aporte na Reserva
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveContrib} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Valor do Aporte (R$)</Label>
              <Input
                required
                type="number"
                step="0.01"
                placeholder="Ex: 400.00"
                value={contribAmount}
                onChange={(e) => setContribAmount(e.target.value)}
                className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Data do Aporte</Label>
              <Input
                required
                type="date"
                value={contribDate}
                onChange={(e) => setContribDate(e.target.value)}
                className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setContribModalOpen(false)}
                className="text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingContrib}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
              >
                {savingContrib ? 'Salvando...' : 'Confirmar Aporte'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Meta */}
      <Dialog open={editGoalOpen} onOpenChange={setEditGoalOpen}>
        <DialogContent className="bg-[#111827] border-slate-800 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-100">
              Ajustar Meta da Reserva
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateGoal} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Valor Alvo Total (R$)</Label>
              <Input
                required
                type="number"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Contribuição Mensal Sugerida (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={monthlyContrib}
                onChange={(e) => setMonthlyContrib(e.target.value)}
                className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditGoalOpen(false)}
                className="text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingGoal}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
              >
                {savingGoal ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
