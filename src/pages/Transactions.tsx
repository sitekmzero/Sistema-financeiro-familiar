import React, { useState, useEffect, useMemo } from 'react'
import { financeService } from '@/services/financeService'
import { useRealtime } from '@/hooks/use-realtime'
import type { Transaction, BankAccount } from '@/types/finance'
import {
  PlusCircle,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Trash2,
  Calendar,
  FileText,
  DollarSign,
  Tag,
  CreditCard,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'

const CATEGORIES = [
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
] as const

export default function Transactions() {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Modal New/Edit
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<{
    description: string
    amount: string
    type: 'income' | 'expense'
    category: (typeof CATEGORIES)[number]
    date: string
    account: string
  }>({
    description: '',
    amount: '',
    type: 'expense',
    category: 'Alimentação',
    date: new Date().toISOString().split('T')[0],
    account: '',
  })

  const loadData = async () => {
    try {
      const [txs, accs] = await Promise.all([
        financeService.getTransactions(150),
        financeService.getAccounts(),
      ])
      setTransactions(txs)
      setAccounts(accs)
    } catch (err) {
      console.error('Failed to load transactions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('transactions', () => {
    financeService.getTransactions(150).then(setTransactions)
  })

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === 'all' || tx.type === typeFilter
      const matchesCat = categoryFilter === 'all' || tx.category === categoryFilter
      return matchesSearch && matchesType && matchesCat
    })
  }, [transactions, searchTerm, typeFilter, categoryFilter])

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {}
    filteredTransactions.forEach((tx) => {
      const d = tx.date ? tx.date.split('T')[0] : 'Sem data'
      if (!groups[d]) groups[d] = []
      groups[d].push(tx)
    })
    return groups
  }, [filteredTransactions])

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description || !formData.amount) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
      return
    }

    const amt = parseFloat(formData.amount.replace(',', '.'))
    if (isNaN(amt) || amt <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      await financeService.createTransaction({
        description: formData.description,
        amount: amt,
        type: formData.type,
        category: formData.category,
        date: `${formData.date} 12:00:00.000Z`,
        account: formData.account || undefined,
        source: 'manual',
      })
      toast({ title: 'Transação registrada com sucesso!' })
      setModalOpen(false)
      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        category: 'Alimentação',
        date: new Date().toISOString().split('T')[0],
        account: '',
      })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta transação?')) return
    try {
      await financeService.deleteTransaction(id)
      toast({ title: 'Transação removida' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatDateHeader = (dateStr: string) => {
    if (dateStr === 'Sem data') return dateStr
    const [year, month, day] = dateStr.split('-')
    const d = new Date(Number(year), Number(month) - 1, Number(day))
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Banner & Quick Import Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-100">
            Transações e Fluxo de Caixa
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerencie entradas, saídas e importe extratos bancários em PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30 text-xs h-9"
          >
            <Link to="/documentos">
              <FileText className="w-4 h-4 mr-1.5" /> Importar Extrato PDF
            </Link>
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-9"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" /> Nova Transação
          </Button>
        </div>
      </div>

      {/* Toolbar Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#111827] border border-slate-800 p-4 rounded-xl">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            placeholder="Buscar por descrição ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-[#1E293B] border-slate-700 text-slate-100 text-xs h-10"
          />
        </div>

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
          <SelectTrigger className="bg-[#1E293B] border-slate-700 text-slate-200 text-xs h-10">
            <SelectValue placeholder="Tipo de Movimentação" />
          </SelectTrigger>
          <SelectContent className="bg-[#1E293B] border-slate-700 text-slate-200 text-xs">
            <SelectItem value="all">Todas as Movimentações</SelectItem>
            <SelectItem value="income">Apenas Receitas (+)</SelectItem>
            <SelectItem value="expense">Apenas Despesas (−)</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val)}>
          <SelectTrigger className="bg-[#1E293B] border-slate-700 text-slate-200 text-xs h-10">
            <SelectValue placeholder="Todas as Categorias" />
          </SelectTrigger>
          <SelectContent className="bg-[#1E293B] border-slate-700 text-slate-200 text-xs">
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List Grouped by Date */}
      <div className="space-y-6">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-16 bg-[#111827] border border-slate-800 rounded-2xl">
            <Filter className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-300">Nenhuma transação encontrada</div>
            <p className="text-xs text-slate-500 mt-1">
              Tente ajustar os filtros ou cadastre um novo lançamento.
            </p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([dateStr, items]) => (
            <div key={dateStr} className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                {formatDateHeader(dateStr)}
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/60">
                {items.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-800/40 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.type === 'income'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {tx.type === 'income' ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                          {tx.description}
                          {tx.source === 'pdf' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 font-normal">
                              PDF
                            </span>
                          )}
                          {tx.source === 'whatsapp' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-normal">
                              WhatsApp
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {tx.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`text-sm sm:text-base font-heading font-bold font-mono text-right ${
                          tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '−'}
                        {formatCurrency(tx.amount)}
                      </div>

                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Nova Transação */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#111827] border-slate-800 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-100">
              Registrar Nova Transação
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveTransaction} className="space-y-4 py-2">
            {/* Toggle Tipo */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'expense' })}
                className={`py-2 rounded-lg text-xs font-semibold transition ${
                  formData.type === 'expense'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Despesa (−)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'income' })}
                className={`py-2 rounded-lg text-xs font-semibold transition ${
                  formData.type === 'income'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Receita (+)
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Descrição</Label>
              <Input
                required
                placeholder="Ex: Supermercado Pão de Açúcar"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Valor (R$)</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Data</Label>
                <Input
                  required
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val: any) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="bg-[#1E293B] border-slate-700 text-slate-200 text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-slate-700 text-slate-200 text-xs">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Conta Bancária</Label>
                <Select
                  value={formData.account}
                  onValueChange={(val) => setFormData({ ...formData, account: val })}
                >
                  <SelectTrigger className="bg-[#1E293B] border-slate-700 text-slate-200 text-xs h-10">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-slate-700 text-slate-200 text-xs">
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
              >
                {saving ? 'Salvando...' : 'Salvar Transação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
