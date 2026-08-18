import React, { useState, useEffect, useMemo } from 'react'
import { financeService } from '@/services/financeService'
import { getCategoryMeta } from '@/lib/categories'
import type { Budget, Transaction } from '@/types/finance'
import { Wallet, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export default function Orcamentos() {
  const { toast } = useToast()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [form, setForm] = useState<Partial<Budget>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = async () => {
    try {
      const [bs, tx] = await Promise.all([
        financeService.getBudgets(),
        financeService.getAllTransactions(),
      ])
      setBudgets(bs)
      setTransactions(tx)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    budgets.forEach((b) => b.month && set.add(b.month))
    set.add(monthKey(new Date()))
    return Array.from(set).sort().reverse()
  }, [budgets])

  const filteredBudgets = useMemo(() => {
    if (monthFilter === 'all') return budgets
    return budgets.filter((b) => b.month === monthFilter)
  }, [budgets, monthFilter])

  // Calculate spent per category for the selected month
  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    const targetMonth = monthFilter === 'all' ? monthKey(new Date()) : monthFilter
    transactions
      .filter((t) => t.type === 'expense' && monthKey(new Date(t.date)) === targetMonth)
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount
      })
    return map
  }, [transactions, monthFilter])

  const openNew = () => {
    setEditing(null)
    setForm({ category: 'Alimentação', month: monthKey(new Date()), alert_threshold: 80 })
    setSheetOpen(true)
  }
  const openEdit = (b: Budget) => {
    setEditing(b)
    setForm({ ...b })
    setSheetOpen(true)
  }

  const save = async () => {
    if (!form.category || !form.monthly_limit) {
      toast({ title: 'Categoria e limite são obrigatórios', variant: 'destructive' })
      return
    }
    try {
      if (editing) await financeService.updateBudget(editing.id, form)
      else await financeService.createBudget(form)
      setSheetOpen(false)
      await load()
      toast({ title: editing ? 'Orçamento atualizado' : 'Orçamento criado' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    }
  }

  const remove = async () => {
    if (!deleteId) return
    try {
      await financeService.deleteBudget(deleteId)
      setDeleteId(null)
      await load()
      toast({ title: 'Orçamento excluído' })
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

  const progressColor = (pct: number, threshold?: number) => {
    if (pct >= 100) return 'bg-rose-500'
    if (pct >= (threshold || 80)) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-6 h-6 text-amber-400" />
          <div>
            <h2 className="text-xl font-heading font-bold text-slate-100">Orçamentos</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Limites mensais por categoria com alertas automáticos.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-40 bg-[#111827] border-slate-700 text-slate-100">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
              <SelectItem value="all">Todos os meses</SelectItem>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-slate-950">
            <Plus className="w-4 h-4 mr-1.5" /> Novo Orçamento
          </Button>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Categoria</TableHead>
              <TableHead className="text-slate-400">Limite Mensal</TableHead>
              <TableHead className="text-slate-400">Gasto Atual</TableHead>
              <TableHead className="text-slate-400 w-48">% Utilizado</TableHead>
              <TableHead className="text-right text-slate-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filteredBudgets.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-8 text-sm">
                  Nenhum orçamento encontrado.
                </TableCell>
              </TableRow>
            )}
            {filteredBudgets.map((b) => {
              const spent = spentByCategory[b.category] || 0
              const pct = b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0
              const meta = getCategoryMeta(b.category)
              return (
                <TableRow key={b.id} className="border-slate-800/60">
                  <TableCell className="text-sm">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: meta.color }}
                      />
                      <span className="text-slate-100 font-medium">{b.category}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-200">
                    {fmtCurrency(b.monthly_limit)}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-300">
                    {fmtCurrency(spent)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min(pct, 100)}
                        className="h-2 flex-1"
                        indicatorColorClass={progressColor(pct, b.alert_threshold)}
                      />
                      <span
                        className={`text-[11px] font-mono w-12 text-right ${pct >= 100 ? 'text-rose-400' : pct >= (b.alert_threshold || 80) ? 'text-amber-400' : 'text-emerald-400'}`}
                      >
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-emerald-400"
                        onClick={() => openEdit(b)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-rose-400"
                        onClick={() => setDeleteId(b.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Sheet form */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="bg-[#111827] border-slate-800 text-slate-100 overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-slate-100">
              {editing ? 'Editar Orçamento' : 'Novo Orçamento'}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Categoria *</Label>
              <Select
                value={form.category || 'Alimentação'}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                  <SelectValue placeholder="ex: Alimentação" />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                  {[
                    'Alimentação',
                    'Transporte',
                    'Moradia',
                    'Saúde',
                    'Lazer',
                    'Educação',
                    'Assinaturas',
                    'Renda',
                    'Outros',
                    'Consórcio',
                    'Transferência',
                    'Tarifas',
                    'Pagamento de Cartão',
                    'Investimento',
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Limite Mensal (R$) *</Label>
              <Input
                type="number"
                value={form.monthly_limit ?? ''}
                onChange={(e) => setForm({ ...form, monthly_limit: Number(e.target.value) })}
                className="bg-[#0B1120] border-slate-700 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Mês (YYYY-MM)</Label>
              <Input
                value={form.month || ''}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
                placeholder={monthKey(new Date())}
                className="bg-[#0B1120] border-slate-700 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Alerta (%)</Label>
              <Input
                type="number"
                value={form.alert_threshold ?? 80}
                onChange={(e) => setForm({ ...form, alert_threshold: Number(e.target.value) })}
                className="bg-[#0B1120] border-slate-700 text-slate-100"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setSheetOpen(false)}
                className="text-slate-300"
              >
                Cancelar
              </Button>
              <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700 text-slate-950">
                Salvar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-[#111827] border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-200">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
