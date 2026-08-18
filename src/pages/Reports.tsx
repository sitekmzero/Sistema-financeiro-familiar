import React, { useState, useEffect, useMemo } from 'react'
import { financeService } from '@/services/financeService'
import { getCategoryMeta } from '@/lib/categories'
import type { Transaction, BankAccount, AppUser } from '@/types/finance'
import {
  FileBarChart,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Download,
  FileSpreadsheet,
  Mic,
  ChevronDown,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import { useToast } from '@/hooks/use-toast'

// ----- helpers -------------------------------------------------------------

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const monthLabel = (key: string) => {
  const [y, m] = key.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

interface PresetRange {
  start: Date
  end: Date
}
const presetRanges: Record<string, () => PresetRange> = {
  'Este mês': () => {
    const now = new Date()
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
  },
  'Mês passado': () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    return { start, end }
  },
  'Últimos 3 meses': () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return { start, end: now }
  },
  'Este ano': () => {
    const now = new Date()
    return { start: new Date(now.getFullYear(), 0, 1), end: now }
  },
  'Ano passado': () => {
    const now = new Date()
    return {
      start: new Date(now.getFullYear() - 1, 0, 1),
      end: new Date(now.getFullYear() - 1, 11, 31),
    }
  },
}

const toInputDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const CHART_COLORS = [
  '#10B981',
  '#F59E0B',
  '#3B82F6',
  '#EF4444',
  '#A855F7',
  '#06B6D4',
  '#EAB308',
  '#EC4899',
  '#22C55E',
  '#8B5CF6',
  '#14B8A6',
  '#94A3B8',
  '#FB923C',
  '#0EA5E9',
]

// ----- main component ------------------------------------------------------

export default function Reports() {
  const { toast } = useToast()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [preset, setPreset] = useState<string>('Este ano')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [cardFilter, setCardFilter] = useState<string>('all')
  const [memberFilter, setMemberFilter] = useState<string>('all')

  // Drill-down
  const [drilldown, setDrilldown] = useState<{
    type: 'category' | 'supplier'
    value: string
  } | null>(null)
  const [sortField, setSortField] = useState<string>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tx, accs, usrs] = await Promise.all([
          financeService.getAllTransactions(),
          financeService.getAllAccounts(),
          financeService.getFamilyUsers(),
        ])
        setTransactions(tx)
        setAccounts(accs)
        setUsers(usrs)
        // initial preset range
        applyPreset('Este ano')
      } catch (err) {
        console.error('Failed to load reports data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyPreset = (name: string) => {
    setPreset(name)
    if (name === 'Personalizado') return
    const r = presetRanges[name]?.()
    if (r) {
      setStartDate(toInputDate(r.start))
      setEndDate(toInputDate(r.end))
    }
  }

  // Dynamic categories from transactions
  const allCategories = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((t) => set.add(t.category))
    return Array.from(set).sort()
  }, [transactions])

  const accountOptions = useMemo(() => {
    return accounts.filter((a) => !a.name.toLowerCase().startsWith('cartão'))
  }, [accounts])
  const cardOptions = useMemo(() => {
    return accounts.filter((a) => a.name.toLowerCase().startsWith('cartão'))
  }, [accounts])

  // Filtered transactions
  const filtered = useMemo(() => {
    const s = startDate ? new Date(startDate + 'T00:00:00') : null
    const e = endDate ? new Date(endDate + 'T23:59:59') : null
    const accountIds = new Set(
      (accountFilter === 'all'
        ? accountOptions
        : accountOptions.filter((a) => a.name === accountFilter)
      ).map((a) => a.id),
    )
    const cardIds = new Set(
      (cardFilter === 'all' ? cardOptions : cardOptions.filter((a) => a.name === cardFilter)).map(
        (a) => a.id,
      ),
    )

    return transactions.filter((t) => {
      const td = new Date(t.date)
      if (s && td < s) return false
      if (e && td > e) return false
      if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false
      if (accountFilter !== 'all' && t.account && !accountIds.has(t.account)) return false
      if (cardFilter !== 'all' && t.account && !cardIds.has(t.account)) return false
      if (memberFilter !== 'all') {
        const u = users.find((x) => x.id === t.user)
        if (!u || u.name !== memberFilter) return false
      }
      return true
    })
  }, [
    transactions,
    startDate,
    endDate,
    selectedCategories,
    accountFilter,
    cardFilter,
    memberFilter,
    users,
    accountOptions,
    cardOptions,
  ])

  // ---- Aggregations ----
  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    filtered.forEach((t) => {
      if (t.type === 'income') income += t.amount
      else expense += t.amount
    })
    return { income, expense, net: income - expense }
  }, [filtered])

  // Comparison: this month vs last month
  const monthComparison = useMemo(() => {
    const now = new Date()
    const thisMonth = monthKey(now)
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = monthKey(lastMonthDate)
    const sum = (key: string) => {
      let inc = 0,
        exp = 0
      transactions.forEach((t) => {
        if (monthKey(new Date(t.date)) !== key) return
        if (t.type === 'income') inc += t.amount
        else exp += t.amount
      })
      return { income: inc, expense: exp, net: inc - exp }
    }
    const cur = sum(thisMonth)
    const prev = sum(lastMonth)
    return { cur, prev, thisLabel: monthLabel(thisMonth), lastLabel: monthLabel(lastMonth) }
  }, [transactions])

  const yearComparison = useMemo(() => {
    const now = new Date()
    const thisY = now.getFullYear()
    const lastY = thisY - 1
    const sum = (year: number) => {
      let inc = 0,
        exp = 0
      transactions.forEach((t) => {
        if (new Date(t.date).getFullYear() !== year) return
        if (t.type === 'income') inc += t.amount
        else exp += t.amount
      })
      return { income: inc, expense: exp, net: inc - exp }
    }
    return {
      cur: sum(thisY),
      prev: sum(lastY),
      thisLabel: String(thisY),
      lastLabel: String(lastY),
    }
  }, [transactions])

  // Evolution patrimonial (cumulative net per month)
  const evolutionData = useMemo(() => {
    const byMonth: Record<string, number> = {}
    filtered.forEach((t) => {
      const k = monthKey(new Date(t.date))
      const signed = t.type === 'income' ? t.amount : -t.amount
      byMonth[k] = (byMonth[k] || 0) + signed
    })
    const keys = Object.keys(byMonth).sort()
    let acc = 0
    return keys.map((k) => {
      acc += byMonth[k]
      return { month: monthLabel(k), saldo: Math.round(acc * 100) / 100 }
    })
  }, [filtered])

  // Distribution by category (expenses only)
  const distributionData = useMemo(() => {
    const byCat: Record<string, number> = {}
    filtered
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        byCat[t.category] = (byCat[t.category] || 0) + t.amount
      })
    return Object.entries(byCat)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
  }, [filtered])

  // Monthly flow (income vs expense per month)
  const flowData = useMemo(() => {
    const byMonth: Record<string, { income: number; expense: number }> = {}
    filtered.forEach((t) => {
      const k = monthKey(new Date(t.date))
      if (!byMonth[k]) byMonth[k] = { income: 0, expense: 0 }
      if (t.type === 'income') byMonth[k].income += t.amount
      else byMonth[k].expense += t.amount
    })
    return Object.keys(byMonth)
      .sort()
      .map((k) => ({
        month: monthLabel(k),
        Receitas: Math.round(byMonth[k].income * 100) / 100,
        Despesas: Math.round(byMonth[k].expense * 100) / 100,
      }))
  }, [filtered])

  // Top suppliers (by description aggregate)
  const topSuppliersData = useMemo(() => {
    const byDesc: Record<string, number> = {}
    filtered
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const key = t.description || 'Desconhecido'
        byDesc[key] = (byDesc[key] || 0) + t.amount
      })
    return Object.entries(byDesc)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filtered])

  // ---- Insights do James ----
  const insights = useMemo(() => {
    const out: string[] = []
    if (filtered.length === 0) {
      out.push('Sem transações no período selecionado. Ajuste os filtros para gerar insights.')
      return out
    }

    // 1) biggest category this month vs last month
    const now = new Date()
    const thisMonth = monthKey(now)
    const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    const catThis: Record<string, number> = {}
    const catLast: Record<string, number> = {}
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const k = monthKey(new Date(t.date))
        if (k === thisMonth) catThis[t.category] = (catThis[t.category] || 0) + t.amount
        else if (k === lastMonth) catLast[t.category] = (catLast[t.category] || 0) + t.amount
      })
    const topCatThis = Object.entries(catThis).sort((a, b) => b[1] - a[1])[0]
    if (topCatThis) {
      const prevVal = catLast[topCatThis[0]] || 0
      if (prevVal > 0) {
        const delta = ((topCatThis[1] - prevVal) / prevVal) * 100
        if (delta > 5) {
          out.push(
            `Seus gastos com ${topCatThis[0]} subiram ${delta.toFixed(0)}% este mês em relação ao anterior. Isso é um padrão recorrente ou algo pontual?`,
          )
        } else if (delta < -5) {
          out.push(
            `Você reduziu ${Math.abs(delta).toFixed(0)}% os gastos com ${topCatThis[0]} este mês. Continue nesse fluxo!`,
          )
        }
      } else {
        out.push(
          `${topCatThis[0]} foi sua maior categoria de gasto este mês (${fmtCurrency(topCatThis[1])}). Vale acompanhar a evolução nos próximos meses.`,
        )
      }
    }

    // 2) savings vs last month
    if (monthComparison.prev.net !== 0) {
      const deltaNet = monthComparison.cur.net - monthComparison.prev.net
      if (deltaNet > 0) {
        out.push(
          `Você economizou ${fmtCurrency(deltaNet)} a mais que no mês passado. Continue nesse fluxo de abundância!`,
        )
      } else if (deltaNet < 0) {
        out.push(
          `Seu saldo líquido caiu ${fmtCurrency(Math.abs(deltaNet))} frente ao mês passado. Que tal revisar os gastos variáveis?`,
        )
      }
    }

    // 3) member share
    const memberExpense: Record<string, number> = {}
    let totalExpense = 0
    transactions
      .filter((t) => t.type === 'expense' && monthKey(new Date(t.date)) === thisMonth)
      .forEach((t) => {
        const u = users.find((x) => x.id === t.user)
        const name = u?.name || 'Outros'
        memberExpense[name] = (memberExpense[name] || 0) + t.amount
        totalExpense += t.amount
      })
    const topMember = Object.entries(memberExpense).sort((a, b) => b[1] - a[1])[0]
    if (topMember && totalExpense > 0) {
      const pct = (topMember[1] / totalExpense) * 100
      out.push(
        `${topMember[0]} foi responsável por ${pct.toFixed(0)}% dos gastos da família este mês (${fmtCurrency(topMember[1])}).`,
      )
    }

    return out.slice(0, 3)
  }, [filtered, transactions, monthComparison, users])

  // ---- Drill-down rows ----
  const drilldownRows = useMemo(() => {
    if (!drilldown) return []
    let rows = filtered
    if (drilldown.type === 'category') {
      rows = rows.filter((t) => t.category === drilldown.value)
    } else {
      rows = rows.filter((t) => t.description === drilldown.value)
    }
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
      else if (sortField === 'amount') cmp = a.amount - b.amount
      else if (sortField === 'description')
        cmp = (a.description || '').localeCompare(b.description || '')
      else if (sortField === 'category') cmp = (a.category || '').localeCompare(b.category || '')
      else if (sortField === 'account') cmp = (a.account || '').localeCompare(b.account || '')
      else if (sortField === 'user') {
        const ua = users.find((u) => u.id === a.user)?.name || ''
        const ub = users.find((u) => u.id === b.user)?.name || ''
        cmp = ua.localeCompare(ub)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [drilldown, filtered, sortField, sortDir, users])

  const accountNameById = (id?: string) => accounts.find((a) => a.id === id)?.name || '—'
  const memberNameById = (id?: string) => users.find((u) => u.id === id)?.name || '—'

  // ---- Export CSV ----
  const exportCsv = () => {
    const header = ['Data', 'Descrição', 'Categoria', 'Conta/Cartão', 'Membro', 'Tipo', 'Valor']
    const rows = filtered.map((t) => [
      new Date(t.date).toLocaleDateString('pt-BR'),
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.category,
      accountNameById(t.account),
      memberNameById(t.user),
      t.type === 'income' ? 'Receita' : 'Despesa',
      String(t.amount),
    ])
    const csv = [header, ...rows].map((r) => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-james-${toInputDate(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ---- Export PDF ----
  const exportPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF()

      doc.setFontSize(16)
      doc.setTextColor(16, 122, 87)
      doc.text('Relatório Financeiro — James Family Office', 14, 16)
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Período: ${startDate || 'início'} a ${endDate || 'agora'}`, 14, 23)

      // Summary
      doc.setFontSize(11)
      doc.setTextColor(40)
      let y = 32
      doc.text(`Total de Receitas: ${fmtCurrency(totals.income)}`, 14, y)
      y += 6
      doc.text(`Total de Despesas: ${fmtCurrency(totals.expense)}`, 14, y)
      y += 6
      doc.text(`Saldo Líquido: ${fmtCurrency(totals.net)}`, 14, y)
      y += 6
      doc.text(`Transações no filtro: ${filtered.length}`, 14, y)
      y += 6

      // Top categories
      autoTable(doc, {
        startY: y + 2,
        head: [['Categoria', 'Gasto (R$)']],
        body: distributionData.map((d) => [d.name, d.value.toFixed(2)]),
        theme: 'striped',
        headStyles: { fillColor: [16, 122, 87] },
      })

      // Transactions table
      // @ts-expect-error lastAutoTable is added by the plugin at runtime
      const afterY = doc.lastAutoTable?.finalY || y + 20
      autoTable(doc, {
        startY: afterY + 8,
        head: [['Data', 'Descrição', 'Categoria', 'Conta/Cartão', 'Membro', 'Valor']],
        body: filtered.map((t) => [
          new Date(t.date).toLocaleDateString('pt-BR'),
          (t.description || '').slice(0, 40),
          t.category,
          accountNameById(t.account),
          memberNameById(t.user),
          `${t.type === 'income' ? '+' : '-'} ${t.amount.toFixed(2)}`,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 7 },
      })

      doc.save(`relatorio-james-${toInputDate(new Date())}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
      toast({
        title: 'Erro ao exportar PDF',
        description: 'Não foi possível gerar o PDF agora.',
        variant: 'destructive',
      })
    }
  }

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const variationColor = (cur: number, prev: number, higherIsBetter = true) => {
    if (prev === 0) return 'text-slate-400'
    const delta = ((cur - prev) / Math.abs(prev)) * 100
    const improved = higherIsBetter ? delta > 0 : delta < 0
    return improved ? 'text-emerald-400' : 'text-rose-400'
  }
  const variationPct = (cur: number, prev: number) => {
    if (prev === 0) return '—'
    return fmtPct(((cur - prev) / Math.abs(prev)) * 100)
  }

  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <TableHead
      className="cursor-pointer select-none text-slate-400 hover:text-slate-200"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortField === field && (
          <ChevronDown
            className={`w-3 h-3 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`}
          />
        )}
      </span>
    </TableHead>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando relatórios...
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* Header + export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-100 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-emerald-400" /> Relatórios & Análises Avançadas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Filtre, compare e exporte a vida financeira da família com a visão estratégica do James.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportCsv}
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Exportar CSV
          </Button>
          <Button
            onClick={exportPdf}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-slate-950"
          >
            <Download className="w-4 h-4 mr-1.5" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Insights do James */}
      <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-emerald-600/90 via-emerald-700/80 to-teal-800/80 border border-emerald-400/40 shadow-lg shadow-emerald-900/30 relative overflow-hidden">
        <Sparkles className="w-20 h-20 text-emerald-200/10 absolute -bottom-3 -right-3 rotate-12" />
        <div className="flex items-center gap-2 text-emerald-50 mb-3">
          <Mic className="w-5 h-5" />
          <h3 className="font-heading font-bold text-base">Insights do James</h3>
          <Badge className="bg-emerald-300/20 text-emerald-50 border-emerald-200/30">
            análise automática
          </Badge>
        </div>
        <div className="space-y-2">
          {insights.map((text, i) => (
            <p
              key={i}
              className="text-sm text-emerald-50/95 leading-relaxed flex items-start gap-2"
            >
              <span className="text-emerald-200 mt-0.5">•</span>
              <span>{text}</span>
            </p>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-heading font-semibold text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> Filtros
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-200"
            onClick={() => {
              setSelectedCategories([])
              setAccountFilter('all')
              setCardFilter('all')
              setMemberFilter('all')
              applyPreset('Este ano')
            }}
          >
            Limpar
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Period preset */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Período</Label>
            <Select value={preset} onValueChange={(v) => applyPreset(v)}>
              <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                {Object.keys(presetRanges).map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
                <SelectItem value="Personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start / End */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">De</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPreset('Personalizado')
              }}
              className="bg-[#0B1120] border-slate-700 text-slate-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Até</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPreset('Personalizado')
              }}
              className="bg-[#0B1120] border-slate-700 text-slate-100"
            />
          </div>

          {/* Categories multi-select */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Categorias</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between bg-[#0B1120] border-slate-700 text-slate-100 font-normal"
                >
                  <span className="truncate">
                    {selectedCategories.length === 0
                      ? 'Todas'
                      : `${selectedCategories.length} selecionada(s)`}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 bg-[#111827] border-slate-700 text-slate-100 p-2"
                align="start"
              >
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {allCategories.map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={selectedCategories.includes(cat)}
                        onCheckedChange={(checked) => {
                          setSelectedCategories((prev) =>
                            checked ? [...prev, cat] : prev.filter((c) => c !== cat),
                          )
                        }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: getCategoryMeta(cat).color }}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Account */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Conta</Label>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                <SelectItem value="all">Todas as contas</SelectItem>
                {accountOptions.map((a) => (
                  <SelectItem key={a.id} value={a.name}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Card */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Cartão</Label>
            <Select value={cardFilter} onValueChange={setCardFilter}>
              <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                <SelectItem value="all">Todos os cartões</SelectItem>
                {cardOptions.map((a) => (
                  <SelectItem key={a.id} value={a.name}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Member */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Membro da família</Label>
            <Select value={memberFilter} onValueChange={setMemberFilter}>
              <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Adriana Araújo">Adriana</SelectItem>
                <SelectItem value="Luiz Fernando">Luiz Fernando</SelectItem>
                <SelectItem value="Gabriel Araújo">Gabriel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Receitas (período)" value={totals.income} tone="emerald" />
        <SummaryCard label="Despesas (período)" value={totals.expense} tone="rose" />
        <SummaryCard
          label="Saldo Líquido (período)"
          value={totals.net}
          tone={totals.net >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* Comparativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ComparisonCard
          title="Mês Atual vs. Mês Anterior"
          curLabel={monthComparison.thisLabel}
          prevLabel={monthComparison.lastLabel}
          cur={monthComparison.cur}
          prev={monthComparison.prev}
          variationColor={variationColor}
          variationPct={variationPct}
        />
        <ComparisonCard
          title="Este Ano vs. Ano Passado"
          curLabel={yearComparison.thisLabel}
          prevLabel={yearComparison.lastLabel}
          cur={yearComparison.cur}
          prev={yearComparison.prev}
          variationColor={variationColor}
          variationPct={variationPct}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Evolução Patrimonial" subtitle="Saldo líquido acumulado mês a mês">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={evolutionData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #1E293B',
                  borderRadius: 8,
                  color: '#F8FAFC',
                }}
                formatter={(v: number) => fmtCurrency(v)}
              />
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#10B981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribuição de Gastos" subtitle="Por categoria (clique para detalhar)">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={distributionData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                onClick={(_, idx) => {
                  const item = distributionData[idx]
                  if (item) setDrilldown({ type: 'category', value: item.name })
                }}
              >
                {distributionData.map((entry, idx) => (
                  <Cell
                    key={entry.name}
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    stroke="#0B1120"
                    cursor="pointer"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #1E293B',
                  borderRadius: 8,
                  color: '#F8FAFC',
                }}
                formatter={(v: number) => fmtCurrency(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fluxo Mensal" subtitle="Receitas vs. Despesas por mês">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={flowData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #1E293B',
                  borderRadius: 8,
                  color: '#F8FAFC',
                }}
                formatter={(v: number) => fmtCurrency(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              <Bar dataKey="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Fornecedores" subtitle="10 maiores gastos (clique para detalhar)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={topSuppliersData}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 17) + '…' : v)}
              />
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #1E293B',
                  borderRadius: 8,
                  color: '#F8FAFC',
                }}
                formatter={(v: number) => fmtCurrency(v)}
              />
              <Bar
                dataKey="value"
                fill="#F59E0B"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(_: any, idx: number) => {
                  const item = topSuppliersData[idx]
                  if (item) setDrilldown({ type: 'supplier', value: item.name })
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Drill-down */}
      {drilldown && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                {drilldown.type === 'category' ? 'Categoria' : 'Fornecedor'}
              </Badge>
              <h3 className="text-sm font-heading font-semibold text-slate-100">
                {drilldown.value}
              </h3>
              <span className="text-xs text-slate-400">{drilldownRows.length} transações</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-slate-200"
              onClick={() => setDrilldown(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <SortHeader field="date" label="Data" />
                <SortHeader field="description" label="Descrição" />
                <SortHeader field="category" label="Categoria" />
                <SortHeader field="account" label="Conta/Cartão" />
                <SortHeader field="user" label="Membro" />
                <SortHeader field="amount" label="Valor" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {drilldownRows.map((t) => (
                <TableRow key={t.id} className="border-slate-800/60">
                  <TableCell className="text-xs text-slate-300">
                    {new Date(t.date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-xs text-slate-100">{t.description}</TableCell>
                  <TableCell className="text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: getCategoryMeta(t.category).color }}
                      />
                      {t.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">
                    {accountNameById(t.account)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">{memberNameById(t.user)}</TableCell>
                  <TableCell
                    className={`text-xs font-mono ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}
                  >
                    {t.type === 'income' ? '+' : '−'} {fmtCurrency(t.amount)}
                  </TableCell>
                </TableRow>
              ))}
              {drilldownRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-slate-500 py-8">
                    Nenhuma transação neste grupo.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ----- subcomponents -------------------------------------------------------

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'emerald' | 'rose'
}) {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`text-2xl font-heading font-bold mt-1 font-mono ${tone === 'emerald' ? 'text-emerald-400' : 'text-rose-400'}`}
      >
        {tone === 'emerald' ? '+' : '−'} {fmtCurrency(Math.abs(value))}
      </div>
    </div>
  )
}

function ComparisonCard({
  title,
  curLabel,
  prevLabel,
  cur,
  prev,
  variationColor,
  variationPct,
}: {
  title: string
  curLabel: string
  prevLabel: string
  cur: { income: number; expense: number; net: number }
  prev: { income: number; expense: number; net: number }
  variationColor: (cur: number, prev: number, higherIsBetter?: boolean) => string
  variationPct: (cur: number, prev: number) => string
}) {
  const Row = ({
    label,
    cval,
    pval,
    higherIsBetter = true,
  }: {
    label: string
    cval: number
    pval: number
    higherIsBetter?: boolean
  }) => (
    <div className="grid grid-cols-3 items-center py-2 border-b border-slate-800/60 last:border-0">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-xs font-mono text-slate-200 text-right">{fmtCurrency(cval)}</div>
      <div className="text-right">
        <div className="text-xs font-mono text-slate-400">{fmtCurrency(pval)}</div>
        <div className={`text-[11px] font-semibold ${variationColor(cval, pval, higherIsBetter)}`}>
          {variationPct(cval, pval)}
        </div>
      </div>
    </div>
  )
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-heading font-semibold text-slate-100">{title}</h3>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="text-emerald-400">{curLabel}</span>
          <span>vs</span>
          <span className="text-slate-400">{prevLabel}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 text-[11px] font-semibold text-slate-500 uppercase pb-1">
        <span>Métrica</span>
        <span className="text-right text-emerald-400/80">Atual</span>
        <span className="text-right">Anterior · Var.</span>
      </div>
      <Row label="Receitas" cval={cur.income} pval={prev.income} />
      <Row label="Despesas" cval={cur.expense} pval={prev.expense} higherIsBetter={false} />
      <Row label="Saldo" cval={cur.net} pval={prev.net} />
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5">
      <div className="mb-3">
        <h3 className="text-sm font-heading font-semibold text-slate-100">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// silence unused import warnings for icons reserved for future use
void ArrowUpRight
void ArrowDownRight
void TrendingUp
void TrendingDown
