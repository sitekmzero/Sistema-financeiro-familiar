import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  FileText,
  Pencil,
  Columns3,
  Printer,
  Eye,
  Info,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useCategories } from '@/hooks/use-categories'
import { getCategoryMeta } from '@/lib/categories'
import { Link } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Colunas exibíveis na tabela / impressão
// ---------------------------------------------------------------------------
type ColumnKey =
  | 'date'
  | 'original_description'
  | 'supplier'
  | 'category'
  | 'account'
  | 'installment'
  | 'family_member'
  | 'amount'
  | 'status'
  | 'actions'

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'date', label: 'Data' },
  { key: 'original_description', label: 'Descrição Original' },
  { key: 'supplier', label: 'Fornecedor' },
  { key: 'category', label: 'Categoria' },
  { key: 'account', label: 'Conta' },
  { key: 'installment', label: 'Parcela' },
  { key: 'family_member', label: 'Membro' },
  { key: 'amount', label: 'Valor' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Ações' },
]

const PRINTABLE_COLUMNS = ALL_COLUMNS.filter((c) => c.key !== 'actions')

const PRINT_COLUMNS_KEY = 'print-columns-preference'

const STATUS_LABEL: Record<string, string> = {
  imported: 'Importado',
  review: 'Revisar',
  categorized: 'Categorizado',
  manual: 'Manual',
}

const STATUS_CLASS: Record<string, string> = {
  imported: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  review: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  categorized: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  manual: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
}

// Categoria -> classes de badge colorido (usando meta dinâmico do banco).
function categoryClass(cat: string) {
  const m = getCategoryMeta(cat)
  return `${m.bg} text-slate-200 border-slate-700`
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

const formatDateBR = (dateStr?: string) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Acessa campos de relações expandidas do PocketBase (expand via client)
function expandField(tx: any, field: string): any {
  return tx?.expand?.[field] ?? null
}

function supplierName(tx: any): string {
  const s = expandField(tx, 'supplier')
  if (s && typeof s === 'object' && 'name' in s) return s.name
  return '—'
}

function accountName(tx: any, fallbackAccounts: BankAccount[]): string {
  const a = expandField(tx, 'account')
  if (a && typeof a === 'object' && 'name' in a) return a.name
  if (tx.account) {
    const found = fallbackAccounts.find((acc) => acc.id === tx.account)
    if (found) return found.name
  }
  return '—'
}

function memberName(tx: any): string {
  const m = expandField(tx, 'family_member')
  if (m && typeof m === 'object' && 'name' in m) return m.name
  return '—'
}

function installmentLabel(tx: Transaction): string {
  const cur = tx.installment_current
  const total = tx.installment_total
  if (!cur || !total || total <= 0) return '—'
  return `${cur}/${total}`
}

function statusLabel(tx: Transaction): string {
  if (tx.source === 'manual') return 'Manual'
  return STATUS_LABEL[tx.status || 'imported'] || 'Importado'
}

function statusClass(tx: Transaction): string {
  if (tx.source === 'manual') return STATUS_CLASS.manual
  return STATUS_CLASS[tx.status || 'imported'] || STATUS_CLASS.imported
}

export default function Transactions() {
  const { toast } = useToast()
  const { metas: categoryMetas } = useCategories()
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    description: string
    amount: string
    type: 'income' | 'expense'
    category: string
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

  // ---------------- Impressão ----------------
  // Colunas selecionadas para impressão (persistidas em localStorage)
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>(() => {
    try {
      const raw = localStorage.getItem(PRINT_COLUMNS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ColumnKey[]
        // sanity check
        const valid = parsed.filter((k) => PRINTABLE_COLUMNS.some((c) => c.key === k))
        if (valid.length > 0) return valid
      }
    } catch {
      /* ignore */
    }
    return PRINTABLE_COLUMNS.map((c) => c.key)
  })

  const [printPreviewOpen, setPrintPreviewOpen] = useState(false)

  const toggleColumn = (key: ColumnKey) => {
    setSelectedColumns((prev) => {
      // nunca permitir desmarcar a última coluna
      if (prev.length === 1 && prev[0] === key) return prev
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      try {
        localStorage.setItem(PRINT_COLUMNS_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const resetColumns = () => {
    const all = PRINTABLE_COLUMNS.map((c) => c.key)
    setSelectedColumns(all)
    try {
      localStorage.setItem(PRINT_COLUMNS_KEY, JSON.stringify(all))
    } catch {
      /* ignore */
    }
  }

  const loadData = useCallback(async () => {
    try {
      const [txs, accs] = await Promise.all([
        financeService.getTransactionsExpanded(1000),
        financeService.getAccounts(),
      ])
      setTransactions(txs)
      setAccounts(accs)
    } catch (err) {
      console.error('Failed to load transactions:', err)
      // fallback simples sem expand
      try {
        const txs = await financeService.getTransactions(500)
        setTransactions(txs)
      } catch (e) {
        /* ignore */
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('transactions', () => {
    financeService
      .getTransactionsExpanded(1000)
      .then(setTransactions)
      .catch(() => {})
  })

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const haystack = [tx.description, tx.original_description, tx.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchesSearch = !searchTerm.trim() || haystack.includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === 'all' || tx.type === typeFilter
      const matchesCat = categoryFilter === 'all' || tx.category === categoryFilter
      return matchesSearch && matchesType && matchesCat
    })
  }, [transactions, searchTerm, typeFilter, categoryFilter])

  // Totais (para o preview de impressão)
  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') income += tx.amount
      else expense += tx.amount
    })
    return { income, expense, net: income - expense, count: filteredTransactions.length }
  }, [filteredTransactions])

  const openEdit = (tx: Transaction) => {
    setEditingId(tx.id)
    setFormData({
      description: tx.description,
      amount: String(tx.amount),
      type: tx.type,
      category: (tx.category as any) || 'Alimentação',
      date: tx.date ? tx.date.split('T')[0] : new Date().toISOString().split('T')[0],
      account: tx.account || '',
    })
    setModalOpen(true)
  }

  const openNew = () => {
    setEditingId(null)
    setFormData({
      description: '',
      amount: '',
      type: 'expense',
      category: 'Alimentação',
      date: new Date().toISOString().split('T')[0],
      account: '',
    })
    setModalOpen(true)
  }

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
      const payload: Partial<Transaction> = {
        description: formData.description,
        amount: amt,
        type: formData.type,
        category: formData.category,
        date: `${formData.date} 12:00:00.000Z`,
        account: formData.account || undefined,
        source: editingId ? undefined : 'manual',
      }
      if (editingId) {
        await financeService.updateTransaction(editingId, payload)
        toast({ title: 'Transação atualizada!' })
      } else {
        await financeService.createTransaction({
          ...payload,
          source: 'manual',
        })
        toast({ title: 'Transação registrada com sucesso!' })
      }
      setModalOpen(false)
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

  const handlePrint = () => {
    // Pequeno atraso para garantir render do conteúdo no DOM
    setTimeout(() => window.print(), 100)
  }

  const reportDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  // Colunas que aparecem na tabela em tela (sempre todas, incluindo ações)
  const visibleTableColumns = ALL_COLUMNS

  // Colunas usadas no preview/papel (sem ações)
  const printColumns = PRINTABLE_COLUMNS.filter((c) => selectedColumns.includes(c.key))

  // Render do conteúdo de uma célula por coluna (usado na tabela e no preview)
  const renderCell = (tx: Transaction, key: ColumnKey, forPrint = false) => {
    switch (key) {
      case 'date':
        return formatDateBR(tx.date)
      case 'original_description':
        return tx.original_description || tx.description || '—'
      case 'supplier':
        return supplierName(tx)
      case 'category':
        if (forPrint) return tx.category
        return (
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 border ${categoryClass(tx.category)}`}
          >
            {tx.category}
          </Badge>
        )
      case 'account':
        return accountName(tx, accounts)
      case 'installment':
        return installmentLabel(tx)
      case 'family_member':
        return memberName(tx)
      case 'amount':
        if (forPrint) {
          return (
            <span className={tx.type === 'income' ? 'print-amount-in' : 'print-amount-out'}>
              {tx.type === 'income' ? '+' : '−'} {formatCurrency(tx.amount)}
            </span>
          )
        }
        return (
          <span
            className={`font-mono font-semibold ${
              tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {tx.type === 'income' ? '+' : '−'} {formatCurrency(tx.amount)}
          </span>
        )
      case 'status':
        if (forPrint) return statusLabel(tx)
        return (
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${statusClass(tx)}`}>
            {statusLabel(tx)}
          </Badge>
        )
      case 'actions':
        return (
          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={() => openEdit(tx)}
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(tx.id)}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      default:
        return '—'
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Banner & Quick Import Link */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-5 rounded-2xl">
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
            onClick={openNew}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-9"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" /> Nova Transação
          </Button>
        </div>
      </div>

      {/* Toolbar Search & Filters */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#111827] border border-slate-800 p-4 rounded-xl">
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
            {categoryMetas.map((cat) => (
              <SelectItem key={cat.name} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Barra de ferramentas de Impressão */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#111827] border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">Impressão de Relatório</span>
          </div>

          {/* Seleção de colunas */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-slate-700 bg-[#1E293B] text-slate-200 hover:bg-slate-800"
              >
                <Columns3 className="w-3.5 h-3.5 mr-1.5" />
                Colunas ({selectedColumns.length}/{PRINTABLE_COLUMNS.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-[#1E293B] border-slate-700 p-3" align="start">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-200">Colunas do relatório</span>
                <button
                  onClick={resetColumns}
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  Marcar todas
                </button>
              </div>
              <div className="space-y-2">
                {PRINTABLE_COLUMNS.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 cursor-pointer text-xs text-slate-200 hover:text-white"
                  >
                    <Checkbox
                      checked={selectedColumns.includes(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                      className="border-slate-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-help">
                  <Info className="w-3.5 h-3.5" /> Como funciona?
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-[#0B1120] border-slate-700 text-slate-200 text-xs p-3">
                <p className="font-semibold mb-1 text-emerald-400">Fluxo de impressão</p>
                <p className="leading-relaxed">
                  1. Aplique os filtros desejados na tabela. <br />
                  2. Selecione as colunas que quer no papel. <br />
                  3. Clique em <strong>Visualizar Impressão</strong>. <br />
                  4. No modal, confira e clique em <strong>Imprimir</strong>. <br />
                  5. O diálogo nativo do navegador abrirá para escolher a impressora.
                </p>
                <p className="mt-2 text-[10px] text-amber-400 leading-relaxed">
                  ⚠ O site não pode listar impressoras — essa é uma limitação de segurança de todos
                  os navegadores. A seleção da impressora acontece no diálogo nativo.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">
            {totals.count} transação{totals.count === 1 ? '' : 'ões'} filtrada
            {totals.count === 1 ? '' : 's'}
          </span>
          <Button
            onClick={() => setPrintPreviewOpen(true)}
            size="sm"
            className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white"
            disabled={filteredTransactions.length === 0}
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" /> Visualizar Impressão
          </Button>
        </div>
      </div>

      {/* Tabela densa de transações */}
      <div className="no-print bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                {visibleTableColumns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`text-[11px] uppercase tracking-wider text-slate-400 font-semibold ${
                      col.key === 'amount' ? 'text-right' : ''
                    } ${col.key === 'actions' ? 'text-right w-20' : ''}`}
                  >
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleTableColumns.length}
                    className="text-center py-12 text-slate-400 text-xs"
                  >
                    Carregando transações...
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleTableColumns.length} className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Filter className="w-8 h-8 text-slate-600" />
                      <div className="text-xs font-semibold text-slate-300">
                        Nenhuma transação encontrada
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Tente ajustar os filtros ou cadastre um novo lançamento.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} className="border-slate-800/60 hover:bg-slate-800/40 group">
                    {visibleTableColumns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={`text-xs text-slate-200 py-2.5 ${
                          col.key === 'amount' ? 'text-right' : ''
                        } ${col.key === 'actions' ? 'text-right' : ''} ${
                          col.key === 'original_description' ? 'max-w-[260px] truncate' : ''
                        }`}
                        title={
                          col.key === 'original_description'
                            ? tx.original_description || tx.description
                            : undefined
                        }
                      >
                        {renderCell(tx, col.key, false)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal: Nova / Editar Transação */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#111827] border-slate-800 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-100">
              {editingId ? 'Editar Transação' : 'Registrar Nova Transação'}
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
                    {categoryMetas.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
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
                {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Salvar Transação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Preview de Impressão A4 */}
      <Dialog open={printPreviewOpen} onOpenChange={setPrintPreviewOpen}>
        <DialogContent className="print-modal-content bg-slate-950/95 border-slate-800 text-slate-100 max-w-5xl w-[95vw] h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header do modal (não impresso) */}
          <div className="no-print flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#111827]">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-emerald-400" />
              <DialogTitle className="text-sm font-semibold text-slate-100">
                Pré-visualização — Relatório A4
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrint}
                size="sm"
                className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Imprimir
              </Button>
              <Button
                onClick={() => setPrintPreviewOpen(false)}
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Fechar
              </Button>
            </div>
          </div>

          {/* Área de preview rolável */}
          <div className="flex-1 overflow-auto bg-slate-800/50 p-4 sm:p-8">
            {/* A página A4 */}
            <div className="print-page">
              {/* Cabeçalho do relatório */}
              <div className="print-header">
                <div className="print-brand">
                  <div className="print-logo">£</div>
                  <div>
                    <div
                      style={{
                        fontFamily: 'Sora, sans-serif',
                        fontWeight: 700,
                        fontSize: '18px',
                        color: '#0b1120',
                      }}
                    >
                      Vida Financeira
                    </div>
                    <div style={{ fontSize: '10px', color: '#475569' }}>
                      Relatório de Transações
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '10px', color: '#475569' }}>
                  <div>
                    <strong>Emissão:</strong> {reportDate}
                  </div>
                  <div>
                    <strong>Transações:</strong> {totals.count}
                  </div>
                  <div>
                    <strong>Receitas:</strong>{' '}
                    <span style={{ color: '#047857' }}>{formatCurrency(totals.income)}</span>
                  </div>
                  <div>
                    <strong>Despesas:</strong>{' '}
                    <span style={{ color: '#b91c1c' }}>{formatCurrency(totals.expense)}</span>
                  </div>
                  <div>
                    <strong>Saldo:</strong>{' '}
                    <span
                      style={{
                        color: totals.net >= 0 ? '#047857' : '#b91c1c',
                        fontWeight: 700,
                      }}
                    >
                      {formatCurrency(totals.net)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabela */}
              <table className="print-table">
                <thead>
                  <tr>
                    {printColumns.map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={printColumns.length}
                        style={{ textAlign: 'center', padding: '16px' }}
                      >
                        Nenhuma transação para exibir.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id}>
                        {printColumns.map((col) => (
                          <td key={col.key}>{renderCell(tx, col.key, true)}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Rodapé */}
              <div className="print-footer">
                <span>Gerado por Vida Financeira · {reportDate}</span>
                <span>Página 1</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
