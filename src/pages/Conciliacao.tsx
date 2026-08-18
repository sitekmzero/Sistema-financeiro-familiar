import React, { useState, useEffect, useMemo } from 'react'
import { financeService } from '@/services/financeService'
import type { Transaction, BankAccount, DocumentImport, Supplier } from '@/types/finance'
import {
  Scale,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sparkles,
  Loader2,
  Check,
  ArrowRight,
  Banknote,
  Clock,
  CheckCheck,
  ListChecks,
  FileLock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'
import { useCategories } from '@/hooks/use-categories'

// ----- helpers -------------------------------------------------------------

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const fmtDate = (d: string) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('pt-BR')
  } catch (_) {
    return d
  }
}

const C6_DOC = 'extrato-c6-180-dias.pdf'

type MatchStatus = 'ok' | 'divergent' | 'missing' | 'extra'

interface RawLine {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
}

interface MatchRow {
  raw: RawLine
  status: MatchStatus
  systemTx?: Transaction
  diff?: number
}

interface ExtraRow {
  tx: Transaction
  status: 'extra'
}

// ----- normalização p/ batimento (mesma lógica do parser C6) ---------------

const norm = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normDesc = (s: string) =>
  norm(s)
    .replace(/^pix (recebido de|enviado para|enviado de|recebido para)\s+/, '')
    .replace(/^recorrencia pix enviada para\s+/, '')
    .replace(/^pix /, '')
    .trim()

const levenshtein = (a: string, b: string) => {
  const m = a.length,
    n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev: number[] = [],
    curr: number[] = []
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    const tmp = prev
    prev = curr
    curr = tmp
  }
  return prev[n]
}

const similarity = (a: string, b: string) => {
  const A = (a || '').toLowerCase().trim(),
    B = (b || '').toLowerCase().trim()
  if (!A || !B) return 0
  if (A === B) return 1
  return 1 - levenshtein(A, B) / Math.max(A.length, B.length)
}

const sameDay = (a: string, b: string) => {
  const da = (a || '').slice(0, 10)
  const db = (b || '').slice(0, 10)
  return da && db && da === db
}

// Extrai o array de transações da verdade (raw_data) de um document_import.
// raw_data pode vir como objeto já parseado (PocketBase json) ou string JSON.
const extractRawLines = (imp?: DocumentImport | null): RawLine[] => {
  if (!imp || imp.raw_data == null) return []
  let data: any = imp.raw_data
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch (_) {
      return []
    }
  }
  if (!data || typeof data !== 'object') return []
  const txs = (data as any).transactions
  if (!Array.isArray(txs)) return []
  return txs
    .map((t: any): RawLine => {
      const date = String(t.date || '').slice(0, 10)
      const description = String(t.description || t.original_description || '').trim()
      const amount = Math.abs(parseFloat(t.amount) || 0)
      const type = t.type === 'income' ? 'income' : 'expense'
      return { date, description, amount, type }
    })
    .filter((t: RawLine) => t.description && t.amount)
}

// ----- main component ------------------------------------------------------

export default function Conciliacao() {
  const { toast } = useToast()
  const { metas: categoryMetas } = useCategories()

  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [imports, setImports] = useState<DocumentImport[]>([])
  const [allTx, setAllTx] = useState<Transaction[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [reviewTx, setReviewTx] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | MatchStatus>('all')

  // fila de revisão — escolhas por id
  const [reviewChoices, setReviewChoices] = useState<
    Record<string, { category: string; supplier: string }>
  >({})
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approvingAll, setApprovingAll] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [accs, imps, txs, sups, rev] = await Promise.all([
          financeService.getAllAccounts(),
          financeService.getDocumentImportsForAccount(),
          financeService.getAllTransactions(),
          financeService.getSuppliers(),
          financeService.getReviewTransactions(),
        ])
        setAccounts(accs)
        setImports(imps)
        setAllTx(txs)
        setSuppliers(sups)
        setReviewTx(rev)
        // pré-seleciona a conta do extrato C6 (vinculada ao document_import)
        const c6Imp = imps.find((i) => i.file_name === C6_DOC)
        if (c6Imp?.bank_account) {
          setSelectedAccountId(c6Imp.bank_account)
        } else if (accs.length > 0) {
          setSelectedAccountId(accs[0].id)
        }
      } catch (err) {
        console.error('Failed to load conciliacao data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // ---- dados do extrato importado (a VERDADE = raw_data) ----
  const selectedImport = useMemo(() => {
    return (
      imports.find((i) => i.file_name === C6_DOC && i.bank_account === selectedAccountId) ||
      imports.find((i) => i.file_name === C6_DOC)
    )
  }, [imports, selectedAccountId])

  // Conjunto A (verdade absoluta): linhas extraídas do PDF, imutáveis em raw_data
  const rawLines = useMemo(() => extractRawLines(selectedImport), [selectedImport])

  const bankBalance = selectedImport?.bank_balance ?? null

  // Conjunto B (sistema): transações registradas a partir deste extrato
  const systemTx = useMemo(() => {
    return allTx.filter(
      (t) =>
        t.source_document === C6_DOC && (!selectedAccountId || t.account === selectedAccountId),
    )
  }, [allTx, selectedAccountId])

  // ---- Etapa 1: Conferência de saldo ----
  // Saldo do banco (document_imports.bank_balance) vs. saldo calculado das
  // transações registradas no sistema ( Conjunto B ).
  const calculatedBalance = useMemo(() => {
    let sum = 0
    systemTx.forEach((t) => {
      sum += t.type === 'income' ? Math.abs(t.amount) : -Math.abs(t.amount)
    })
    return Math.round(sum * 100) / 100
  }, [systemTx])

  const balanceDiff =
    bankBalance == null ? null : Math.round((bankBalance - calculatedBalance) * 100) / 100

  // ---- Etapa 2: Batimento linha-a-linha (A vs. B) ----
  // Para cada linha da verdade (raw_data), procura a transação correspondente
  // no sistema. Status: OK | Valor divergente | Não encontrada.
  // Depois, transações do sistema sem correspondência na verdade = Sobrando.
  const { matchRows, extraRows } = useMemo(() => {
    const used = new Set<string>()
    const rows: MatchRow[] = []

    rawLines.forEach((raw) => {
      const nd = normDesc(raw.description)
      const amt = Math.abs(raw.amount)
      let best: Transaction | undefined
      let bestSim = 0

      systemTx.forEach((s) => {
        if (used.has(s.id)) return
        const sd = normDesc(s.original_description || s.description)
        const sim = similarity(nd, sd)
        const sameDate = sameDay(s.date, raw.date)
        const sameAmt = Math.abs(Math.abs(s.amount) - amt) <= 0.02
        // casamento forte: descrição similar + mesmo valor (data conta como bônus)
        let score = sim
        if (sameAmt) score += 0.2
        if (sameDate) score += 0.1
        if (score > bestSim) {
          bestSim = score
          best = s
        }
      })

      if (best && bestSim >= 0.7) {
        used.add(best.id)
        const diff = Math.round((Math.abs(best.amount) - amt) * 100) / 100
        rows.push({
          raw,
          status: Math.abs(diff) <= 0.02 ? 'ok' : 'divergent',
          systemTx: best,
          diff,
        })
      } else {
        rows.push({ raw, status: 'missing' })
      }
    })

    // Sobrando: transações no sistema (deste extrato) que não casam com nenhuma
    // linha da verdade — indicam registro extra / duplicata não detectada.
    const extras: ExtraRow[] = []
    systemTx.forEach((s) => {
      if (used.has(s.id)) return
      extras.push({ tx: s, status: 'extra' })
    })

    return { matchRows: rows, extraRows: extras }
  }, [rawLines, systemTx])

  const allRows = useMemo(
    () => [...matchRows, ...extraRows] as Array<MatchRow | ExtraRow>,
    [matchRows, extraRows],
  )

  const counts = useMemo(() => {
    const c = { ok: 0, divergent: 0, missing: 0, extra: 0 }
    matchRows.forEach((r) => {
      c[r.status]++
    })
    c.extra = extraRows.length
    return c
  }, [matchRows, extraRows])

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return allRows
    return allRows.filter((r) => r.status === statusFilter)
  }, [allRows, statusFilter])

  // ---- Etapa 3: Resumo ----
  const totalConferidas = counts.ok + counts.divergent + counts.missing
  const reconciliado = counts.divergent === 0 && counts.missing === 0 && counts.extra === 0

  // ---- Fila de revisão ----
  const ensureChoice = (txId: string) => {
    setReviewChoices((prev) => {
      if (prev[txId]) return prev
      const tx = reviewTx.find((t) => t.id === txId)
      return {
        ...prev,
        [txId]: {
          category: tx?.category || 'Outros',
          supplier: tx?.supplier || 'none',
        },
      }
    })
  }

  useEffect(() => {
    reviewTx.forEach((t) => ensureChoice(t.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewTx])

  const handleApprove = async (txId: string) => {
    const choice = reviewChoices[txId]
    if (!choice) return
    setApprovingId(txId)
    try {
      const data: { category: Transaction['category']; supplier?: string } = {
        category: choice.category as Transaction['category'],
      }
      if (choice.supplier && choice.supplier !== 'none') data.supplier = choice.supplier
      await financeService.approveReviewTransaction(txId, data)
      setReviewTx((prev) => prev.filter((t) => t.id !== txId))
      setAllTx((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, ...data, status: 'categorized' as const } : t)),
      )
      toast({ title: 'Transação aprovada', description: 'Categoria atualizada com sucesso.' })
    } catch (err: any) {
      toast({ title: 'Erro ao aprovar', description: err.message, variant: 'destructive' })
    } finally {
      setApprovingId(null)
    }
  }

  const handleApproveAll = async () => {
    const pending = reviewTx.filter((t) => reviewChoices[t.id])
    if (pending.length === 0) return
    setApprovingAll(true)
    let ok = 0
    let fail = 0
    for (const t of pending) {
      const choice = reviewChoices[t.id]
      try {
        const data: { category: string; supplier?: string } = { category: choice.category }
        if (choice.supplier && choice.supplier !== 'none') data.supplier = choice.supplier
        await financeService.approveReviewTransaction(t.id, data)
        ok++
      } catch (_) {
        fail++
      }
    }
    setReviewTx((prev) => prev.filter((t) => !reviewChoices[t.id] || pending.includes(t)))
    setAllTx((prev) =>
      prev.map((t) => {
        const c = reviewChoices[t.id]
        if (!c) return t
        const data: {
          category: Transaction['category']
          supplier?: string
          status: Transaction['status']
        } = {
          category: c.category as Transaction['category'],
          status: 'categorized',
        }
        if (c.supplier && c.supplier !== 'none') data.supplier = c.supplier
        return { ...t, ...data }
      }),
    )
    toast({
      title: 'Fila de revisão processada',
      description: `${ok} aprovadas${fail ? `, ${fail} falharam` : ''}.`,
      variant: fail ? 'destructive' : 'default',
    })
    setApprovingAll(false)
  }

  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name || '—'
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)

  // ----- render -------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando conciliação...
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-100 flex items-center gap-2">
            <Scale className="w-6 h-6 text-emerald-400" /> Conciliação Bancária
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Conferência de saldo, batimento linha-a-linha e fila de revisão do James.
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-sky-400">
            <FileLock className="w-3.5 h-3.5" />
            Verdade absoluta: <code className="font-mono">document_imports.raw_data</code>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100 w-56">
              <SelectValue placeholder="Selecionar conta" />
            </SelectTrigger>
            <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ===== ETAPA 1 — Conferência de Saldo ===== */}
      <Card className="bg-[#111827] border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading font-semibold text-slate-200 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold">
              1
            </span>
            Conferência de Saldo
            {selectedAccount && (
              <span className="text-xs text-slate-400 font-normal">· {selectedAccount.name}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5" /> Saldo do Banco (extrato)
              </div>
              <div className="text-2xl font-heading font-bold mt-1 font-mono text-slate-100">
                {bankBalance == null ? '—' : fmtCurrency(bankBalance)}
              </div>
              {selectedImport && (
                <div className="text-[10px] text-slate-500 mt-1">{selectedImport.file_name}</div>
              )}
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" /> Saldo Calculado (sistema)
              </div>
              <div className="text-2xl font-heading font-bold mt-1 font-mono text-slate-100">
                {fmtCurrency(calculatedBalance)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {systemTx.length} transações registradas
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Divergência
              </div>
              {balanceDiff == null ? (
                <div className="text-2xl font-heading font-bold mt-1 text-slate-400">—</div>
              ) : Math.abs(balanceDiff) < 0.01 ? (
                <div className="mt-2">
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Reconciliado ✅
                  </Badge>
                  <div className="text-lg font-heading font-bold mt-2 font-mono text-emerald-400">
                    {fmtCurrency(0)}
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Divergência
                  </Badge>
                  <div className="text-lg font-heading font-bold mt-2 font-mono text-rose-400">
                    {fmtCurrency(balanceDiff)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== ETAPA 2 — Batimento Linha a Linha ===== */}
      <Card className="bg-[#111827] border-slate-800">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-heading font-semibold text-slate-200 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold">
                2
              </span>
              Batimento Linha a Linha
              <span className="text-[11px] text-slate-500 font-normal">
                · {rawLines.length} linhas no extrato vs {systemTx.length} no sistema
              </span>
            </CardTitle>

            {/* Contadores + filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <StatusCounter
                active={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
                label="Todas"
                count={allRows.length}
                tone="slate"
              />
              <StatusCounter
                active={statusFilter === 'ok'}
                onClick={() => setStatusFilter('ok')}
                label="OK"
                count={counts.ok}
                tone="emerald"
              />
              <StatusCounter
                active={statusFilter === 'divergent'}
                onClick={() => setStatusFilter('divergent')}
                label="Divergentes"
                count={counts.divergent}
                tone="amber"
              />
              <StatusCounter
                active={statusFilter === 'missing'}
                onClick={() => setStatusFilter('missing')}
                label="Não encontradas"
                count={counts.missing}
                tone="rose"
              />
              <StatusCounter
                active={statusFilter === 'extra'}
                onClick={() => setStatusFilter('extra')}
                label="Sobrando"
                count={counts.extra}
                tone="yellow"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">Data</TableHead>
                  <TableHead className="text-slate-400 text-xs">Descrição (extrato)</TableHead>
                  <TableHead className="text-slate-400 text-xs">Valor Extrato</TableHead>
                  <TableHead className="text-slate-400 text-xs">Valor Sistema</TableHead>
                  <TableHead className="text-slate-400 text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row, idx) => {
                  const isExtra = row.status === 'extra' && 'tx' in row && !('raw' in row)
                  const date = isExtra ? (row as ExtraRow).tx.date : (row as MatchRow).raw.date
                  const desc = isExtra
                    ? (row as ExtraRow).tx.original_description || (row as ExtraRow).tx.description
                    : (row as MatchRow).raw.description
                  const amt = isExtra
                    ? Math.abs((row as ExtraRow).tx.amount)
                    : (row as MatchRow).raw.amount
                  const type = isExtra ? (row as ExtraRow).tx.type : (row as MatchRow).raw.type
                  const systemTx = 'systemTx' in row ? row.systemTx : undefined
                  const diff = 'diff' in row ? row.diff : undefined
                  return (
                    <TableRow
                      key={idx + '-' + date + '-' + desc.slice(0, 20)}
                      className="border-slate-800/60"
                    >
                      <TableCell className="text-xs text-slate-300 whitespace-nowrap">
                        {fmtDate(date)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-100 max-w-[280px] truncate">
                        {desc}
                        <div className="text-[10px] text-slate-500">
                          {isExtra ? 'Sistema (sobrando)' : 'Extrato (verdade)'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-200">
                        {type === 'income' ? '+' : '−'} {fmtCurrency(amt)}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {systemTx ? (
                          <span
                            className={
                              systemTx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {systemTx.type === 'income' ? '+' : '−'}{' '}
                            {fmtCurrency(Math.abs(systemTx.amount))}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <StatusBadge status={row.status} diff={diff} />
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-slate-500 py-8">
                      Nenhuma transação neste filtro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ===== ETAPA 3 — Resumo ===== */}
      <Card className="bg-[#111827] border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading font-semibold text-slate-200 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold">
              3
            </span>
            Resumo da Conciliação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryStat
              icon={ListChecks}
              label="Conferidas"
              value={totalConferidas}
              tone="slate"
            />
            <SummaryStat icon={CheckCircle2} label="OK" value={counts.ok} tone="emerald" />
            <SummaryStat
              icon={AlertTriangle}
              label="Divergentes"
              value={counts.divergent}
              tone="amber"
            />
            <SummaryStat
              icon={XCircle}
              label="Não encontradas"
              value={counts.missing}
              tone="rose"
            />
          </div>

          <div
            className={`mt-4 rounded-xl p-4 border flex items-center justify-between ${
              reconciliado
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-rose-500/10 border-rose-500/30'
            }`}
          >
            <div className="flex items-center gap-3">
              {reconciliado ? (
                <CheckCheck className="w-6 h-6 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              )}
              <div>
                <div
                  className={`text-sm font-heading font-bold ${
                    reconciliado ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {reconciliado ? 'Sistema Reconciliado' : 'Divergências Encontradas'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {reconciliado
                    ? 'Todas as linhas do extrato batem com o sistema.'
                    : `${counts.divergent + counts.missing + counts.extra} divergência(s) precisam de atenção.`}
                </div>
              </div>
            </div>
            {balanceDiff != null && (
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase">Diferença de saldo</div>
                <div
                  className={`font-mono font-bold ${
                    Math.abs(balanceDiff) < 0.01 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {fmtCurrency(balanceDiff)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== Fila de Revisão ===== */}
      <Card className="bg-[#111827] border-slate-800">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-heading font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Fila de Revisão do James
              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
                {reviewTx.length}
              </Badge>
            </CardTitle>
            {reviewTx.length > 0 && (
              <Button
                size="sm"
                onClick={handleApproveAll}
                disabled={approvingAll}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
              >
                {approvingAll ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                )}
                Aprovar Todas
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Transações que o James não conseguiu categorizar automaticamente. Escolha a categoria e
            fornecedor e aprove.
          </p>
        </CardHeader>
        <CardContent>
          {reviewTx.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
              Nenhuma transação pendente de revisão. Tudo categorizado!
            </div>
          ) : (
            <div className="space-y-3">
              {reviewTx.map((tx) => {
                const choice = reviewChoices[tx.id] || {
                  category: tx.category || 'Outros',
                  supplier: 'none',
                }
                return (
                  <div
                    key={tx.id}
                    className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-100 truncate">
                        {tx.original_description || tx.description}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3" /> {fmtDate(tx.date)}
                        <span>·</span>
                        <span
                          className={tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}
                        >
                          {tx.type === 'income' ? '+' : '−'} {fmtCurrency(Math.abs(tx.amount))}
                        </span>
                        <span>·</span>
                        <span>{accountName(tx.account)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Select
                        value={choice.category}
                        onValueChange={(v) =>
                          setReviewChoices((prev) => ({
                            ...prev,
                            [tx.id]: { ...prev[tx.id], category: v },
                          }))
                        }
                      >
                        <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100 h-8 text-xs w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                          {categoryMetas.map((c) => (
                            <SelectItem key={c.name} value={c.name}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={choice.supplier}
                        onValueChange={(v) =>
                          setReviewChoices((prev) => ({
                            ...prev,
                            [tx.id]: { ...prev[tx.id], supplier: v },
                          }))
                        }
                      >
                        <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100 h-8 text-xs w-40">
                          <SelectValue placeholder="Fornecedor" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                          <SelectItem value="none">Sem fornecedor</SelectItem>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        onClick={() => handleApprove(tx.id)}
                        disabled={approvingId === tx.id}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold h-8 px-3 text-xs"
                      >
                        {approvingId === tx.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        )}
                        Aprovar
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ----- subcomponents -------------------------------------------------------

function StatusCounter({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  tone: 'slate' | 'emerald' | 'amber' | 'rose' | 'yellow'
}) {
  const tones: Record<string, string> = {
    slate: 'border-slate-700 text-slate-300',
    emerald: 'border-emerald-500/30 text-emerald-400',
    amber: 'border-amber-500/30 text-amber-400',
    rose: 'border-rose-500/30 text-rose-400',
    yellow: 'border-yellow-500/30 text-yellow-400',
  }
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition ${
        active
          ? `${tones[tone]} bg-slate-800`
          : 'border-slate-800 text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
      <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px]">{count}</span>
    </button>
  )
}

function StatusBadge({ status, diff }: { status: MatchStatus; diff?: number }) {
  if (status === 'ok') {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3 mr-1" /> OK
      </Badge>
    )
  }
  if (status === 'divergent') {
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
        <AlertTriangle className="w-3 h-3 mr-1" /> Valor divergente
        {diff != null && Math.abs(diff) > 0.02 && (
          <span className="ml-1 font-mono">{fmtCurrency(diff)}</span>
        )}
      </Badge>
    )
  }
  if (status === 'missing') {
    return (
      <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30">
        <XCircle className="w-3 h-3 mr-1" /> Não encontrada
      </Badge>
    )
  }
  return (
    <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">
      <HelpCircle className="w-3 h-3 mr-1" /> Sobrando
    </Badge>
  )
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  tone: 'slate' | 'emerald' | 'amber' | 'rose'
}) {
  const tones: Record<string, string> = {
    slate: 'text-slate-300',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
  }
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className={`text-2xl font-heading font-bold mt-1 font-mono ${tones[tone]}`}>{value}</div>
    </div>
  )
}

// silence unused import reserved for future
void ArrowRight
