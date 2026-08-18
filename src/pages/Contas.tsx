import React, { useState, useEffect, useMemo } from 'react'
import { financeService } from '@/services/financeService'
import type { BankAccount, Bank, FamilyMember } from '@/types/finance'
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Landmark,
  Wallet,
  PiggyBank,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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

type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'consortium'

const TYPE_LABEL: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de Crédito',
  investment: 'Investimento',
  consortium: 'Consórcio',
}

const TYPE_ICON: Record<AccountType, React.ComponentType<{ className?: string }>> = {
  checking: Wallet,
  savings: PiggyBank,
  credit_card: CreditCard,
  investment: TrendingUp,
  consortium: Landmark,
}

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const INVESTMENT_TYPES = [
  'CDB',
  'Tesouro',
  'Ações',
  'FIIs',
  'LCI-LCA',
  'Previdência',
  'Fundos',
  'Poupança',
  'Cripto',
  'Outros',
]
const LIQUIDITY_OPTIONS = ['Diária', 'No vencimento', 'D+30', 'D+90', 'Indefinida']
const INDEXER_OPTIONS = ['CDI', 'IPCA', 'Selic', 'Prefixado', 'IGP-M']
const CARD_BRANDS: Array<{ value: BankAccount['card_brand']; label: string }> = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'amex', label: 'Amex' },
  { value: 'elo', label: 'Elo' },
]

const DEFAULT_FORM: Partial<BankAccount> = {
  name: '',
  account_type: 'checking',
  balance: 0,
  color: '#0EA5E9',
  status: 'active',
  additional_holders: [],
}

export default function Contas() {
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<BankAccount | null>(null)
  const [form, setForm] = useState<Partial<BankAccount>>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)

  // additional holder input
  const [addHolderName, setAddHolderName] = useState('')
  const [addHolderLast4, setAddHolderLast4] = useState('')

  const load = async () => {
    try {
      const [accs, bks, mems] = await Promise.all([
        financeService.getAllAccountsExpanded(),
        financeService.getBanks(),
        financeService.getFamilyMembers(),
      ])
      setAccounts(accs)
      setBanks(bks)
      setMembers(mems)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const bankName = (id?: string) => banks.find((b) => b.id === id)?.name || '—'
  const memberName = (id?: string) => members.find((m) => m.id === id)?.name || '—'

  const openNew = () => {
    setEditing(null)
    setForm({ ...DEFAULT_FORM })
    setAddHolderName('')
    setAddHolderLast4('')
    setSheetOpen(true)
  }

  const openEdit = (a: BankAccount) => {
    setEditing(a)
    setForm({ ...a })
    setAddHolderName('')
    setAddHolderLast4('')
    setSheetOpen(true)
  }

  const addHolder = () => {
    if (!addHolderName.trim() || !addHolderLast4.trim()) {
      toast({ title: 'Nome e últimos 4 dígitos são obrigatórios', variant: 'destructive' })
      return
    }
    const holders = Array.isArray(form.additional_holders) ? [...form.additional_holders] : []
    holders.push({ name: addHolderName.trim(), last_four: addHolderLast4.trim() })
    setForm({ ...form, additional_holders: holders })
    setAddHolderName('')
    setAddHolderLast4('')
  }

  const removeHolder = (idx: number) => {
    const holders = Array.isArray(form.additional_holders) ? [...form.additional_holders] : []
    holders.splice(idx, 1)
    setForm({ ...form, additional_holders: holders })
  }

  const save = async () => {
    if (!form.name || !String(form.name).trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      // monta payload limpo (remove undefined e expand)
      const { ...rest } = form
      const payload: Partial<BankAccount> = { ...rest }
      // garante campos numéricos
      const numFields: (keyof BankAccount)[] = [
        'balance',
        'overdraft_limit',
        'interest_rate',
        'savings_rate',
        'credit_limit',
        'closing_day',
        'due_day',
        'invested_amount',
        'yield_rate',
        'consortium_quota',
        'consortium_credit',
        'installments_paid',
        'installments_total',
      ]
      numFields.forEach((k) => {
        if (payload[k] !== undefined) {
          const n = Number(payload[k])
          ;(payload as any)[k] = isNaN(n) ? undefined : n
        }
      })
      if (editing) {
        await financeService.updateAccountExtended(editing.id, payload)
      } else {
        await financeService.createAccountExtended(payload)
      }
      setSheetOpen(false)
      await load()
      toast({ title: editing ? 'Conta atualizada' : 'Conta criada' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteId) return
    try {
      await financeService.deleteAccount(deleteId)
      setDeleteId(null)
      await load()
      toast({ title: 'Conta excluída' })
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

  const type = (form.account_type || 'checking') as AccountType

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-fuchsia-400" />
          <div>
            <h2 className="text-xl font-heading font-bold text-slate-100">Contas & Cartões</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Contas correntes, poupanças, cartões, investimentos e consórcios.
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-slate-950">
          <Plus className="w-4 h-4 mr-1.5" /> Nova Conta
        </Button>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Nome</TableHead>
              <TableHead className="text-slate-400">Tipo</TableHead>
              <TableHead className="text-slate-400">Banco</TableHead>
              <TableHead className="text-slate-400">Saldo/Limite</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-right text-slate-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8 text-sm">
                  Nenhuma conta encontrada.
                </TableCell>
              </TableRow>
            )}
            {accounts.map((a) => {
              const TIcon = TYPE_ICON[(a.account_type || 'checking') as AccountType]
              const saldo =
                a.account_type === 'credit_card'
                  ? a.credit_limit
                  : a.account_type === 'investment'
                    ? a.invested_amount
                    : a.balance
              return (
                <TableRow key={a.id} className="border-slate-800/60">
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: a.color || '#0EA5E9' }}
                      />
                      <div>
                        <div className="text-slate-100 font-medium">{a.name}</div>
                        {a.card_last_four && (
                          <div className="text-[10px] text-slate-500">*{a.card_last_four}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="inline-flex items-center gap-1.5 text-slate-300">
                      <TIcon className="w-3.5 h-3.5" />
                      {TYPE_LABEL[(a.account_type || 'checking') as AccountType]}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">
                    {a.bank ? bankName(a.bank) : a.bank_name || '—'}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-200">
                    {saldo != null && saldo !== 0 ? fmtCurrency(saldo) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {a.status === 'inactive' ? (
                      <Badge className="bg-slate-500/15 text-slate-300 border-slate-500/30">
                        Inativa
                      </Badge>
                    ) : a.status === 'blocked' ? (
                      <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30">
                        Bloqueada
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                        Ativa
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-emerald-400"
                        onClick={() => openEdit(a)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-rose-400"
                        onClick={() => setDeleteId(a.id)}
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

      {/* Sheet form dinâmico */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="bg-[#111827] border-slate-800 text-slate-100 overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-slate-100">
              {editing ? 'Editar Conta' : 'Nova Conta'}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            {/* Tipo */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Tipo de Conta *</Label>
              <Select
                value={type}
                onValueChange={(v) => setForm({ ...form, account_type: v as AccountType })}
              >
                <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                  {(Object.keys(TYPE_LABEL) as AccountType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Nome *</Label>
              <Input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex: C6 Bank (Ag 0001 / CC 398265607)"
                className="bg-[#0B1120] border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Cor</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.color || '#0EA5E9'}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-10 h-10 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                />
                <Input
                  value={form.color || ''}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="bg-[#0B1120] border-slate-700 text-slate-100 flex-1"
                />
              </div>
            </div>

            {/* Campos comuns: conta corrente, poupança, investimento */}
            {(type === 'checking' || type === 'savings' || type === 'investment') && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">
                  {type === 'investment' ? 'Banco / Corretora' : 'Banco'}
                </Label>
                <Select
                  value={form.bank || 'none'}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      bank: v === 'none' ? undefined : v,
                      bank_name: v === 'none' ? undefined : banks.find((b) => b.id === v)?.name,
                    })
                  }
                >
                  <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                    <SelectValue placeholder="Selecionar banco" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                    <SelectItem value="none">— Sem banco —</SelectItem>
                    {banks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Conta Corrente */}
            {type === 'checking' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Agência</Label>
                    <Input
                      value={form.agency || ''}
                      onChange={(e) => setForm({ ...form, agency: e.target.value })}
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Número da conta</Label>
                    <Input
                      value={form.account_number || ''}
                      onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Saldo atual (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.balance ?? ''}
                      onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Limite cheque especial (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.overdraft_limit ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, overdraft_limit: Number(e.target.value) })
                      }
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">
                    Taxa de juros do cheque especial (% a.m.)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.interest_rate ?? ''}
                    onChange={(e) => setForm({ ...form, interest_rate: Number(e.target.value) })}
                    className="bg-[#0B1120] border-slate-700 text-slate-100"
                  />
                </div>
              </>
            )}

            {/* Poupança */}
            {type === 'savings' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Agência</Label>
                    <Input
                      value={form.agency || ''}
                      onChange={(e) => setForm({ ...form, agency: e.target.value })}
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Número da conta</Label>
                    <Input
                      value={form.account_number || ''}
                      onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Saldo atual (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.balance ?? ''}
                      onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Rendimento (% a.a.)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.savings_rate ?? ''}
                      onChange={(e) => setForm({ ...form, savings_rate: Number(e.target.value) })}
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Cartão de Crédito */}
            {type === 'credit_card' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Bandeira</Label>
                    <Select
                      value={form.card_brand || 'visa'}
                      onValueChange={(v) =>
                        setForm({ ...form, card_brand: v as BankAccount['card_brand'] })
                      }
                    >
                      <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                        {CARD_BRANDS.map((b) => (
                          <SelectItem key={b.value} value={b.value}>
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Últimos 4 dígitos</Label>
                    <Input
                      value={form.card_last_four || ''}
                      onChange={(e) => setForm({ ...form, card_last_four: e.target.value })}
                      maxLength={4}
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Titular</Label>
                  <Select
                    value={form.card_holder || 'none'}
                    onValueChange={(v) =>
                      setForm({ ...form, card_holder: v === 'none' ? undefined : v })
                    }
                  >
                    <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                      <SelectValue placeholder="Selecionar membro" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                      <SelectItem value="none">— Sem titular —</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Adicionais */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Cartões adicionais</Label>
                  <div className="flex gap-2">
                    <Input
                      value={addHolderName}
                      onChange={(e) => setAddHolderName(e.target.value)}
                      placeholder="Nome"
                      className="bg-[#0B1120] border-slate-700 text-slate-100 flex-1"
                    />
                    <Input
                      value={addHolderLast4}
                      onChange={(e) => setAddHolderLast4(e.target.value)}
                      placeholder="4 dígitos"
                      maxLength={4}
                      className="bg-[#0B1120] border-slate-700 text-slate-100 w-28"
                    />
                    <Button type="button" onClick={addHolder} variant="outline" size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {Array.isArray(form.additional_holders) && form.additional_holders.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.additional_holders.map((h, idx) => (
                        <Badge
                          key={idx}
                          className="bg-slate-800 text-slate-200 border-slate-700 gap-1"
                        >
                          {h.name} (*{h.last_four})
                          <button
                            type="button"
                            onClick={() => removeHolder(idx)}
                            className="ml-1 text-slate-400 hover:text-rose-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Limite (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.credit_limit ?? ''}
                      onChange={(e) => setForm({ ...form, credit_limit: Number(e.target.value) })}
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Dia fechamento (1-31)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={form.closing_day ?? ''}
                      onChange={(e) => setForm({ ...form, closing_day: Number(e.target.value) })}
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Dia vencimento (1-31)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={form.due_day ?? ''}
                    onChange={(e) => setForm({ ...form, due_day: Number(e.target.value) })}
                    className="bg-[#0B1120] border-slate-700 text-slate-100"
                  />
                </div>
              </>
            )}

            {/* Investimento */}
            {type === 'investment' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Tipo de investimento</Label>
                    <Select
                      value={form.investment_type || 'CDB'}
                      onValueChange={(v) =>
                        setForm({ ...form, investment_type: v as BankAccount['investment_type'] })
                      }
                    >
                      <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                        {INVESTMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Valor aplicado (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.invested_amount ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, invested_amount: Number(e.target.value) })
                      }
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Rentabilidade descritiva</Label>
                    <Input
                      value={form.yield_description || ''}
                      onChange={(e) => setForm({ ...form, yield_description: e.target.value })}
                      placeholder="ex: 110% CDI"
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Rentabilidade (% a.a.)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.yield_rate ?? ''}
                      onChange={(e) => setForm({ ...form, yield_rate: Number(e.target.value) })}
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Liquidez</Label>
                    <Select
                      value={form.liquidity || 'Diária'}
                      onValueChange={(v) =>
                        setForm({ ...form, liquidity: v as BankAccount['liquidity'] })
                      }
                    >
                      <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                        {LIQUIDITY_OPTIONS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Indexador</Label>
                    <Select
                      value={form.indexer || 'CDI'}
                      onValueChange={(v) =>
                        setForm({ ...form, indexer: v as BankAccount['indexer'] })
                      }
                    >
                      <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                        {INDEXER_OPTIONS.map((i) => (
                          <SelectItem key={i} value={i}>
                            {i}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Vencimento</Label>
                  <Input
                    type="date"
                    value={form.maturity_date ? String(form.maturity_date).slice(0, 10) : ''}
                    onChange={(e) => setForm({ ...form, maturity_date: e.target.value })}
                    className="bg-[#0B1120] border-slate-700 text-slate-100"
                  />
                </div>
              </>
            )}

            {/* Consórcio */}
            {type === 'consortium' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Administradora</Label>
                    <Input
                      value={form.consortium_admin || ''}
                      onChange={(e) => setForm({ ...form, consortium_admin: e.target.value })}
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Cota</Label>
                    <Input
                      value={form.consortium_quota ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, consortium_quota: Number(e.target.value) })
                      }
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Crédito total (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.consortium_credit ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, consortium_credit: Number(e.target.value) })
                    }
                    className="bg-[#0B1120] border-slate-700 text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Parcelas pagas</Label>
                    <Input
                      type="number"
                      value={form.installments_paid ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, installments_paid: Number(e.target.value) })
                      }
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Parcelas totais</Label>
                    <Input
                      type="number"
                      value={form.installments_total ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, installments_total: Number(e.target.value) })
                      }
                      className="bg-[#0B1120] border-slate-700 text-slate-100"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Vencimento</Label>
                  <Input
                    type="date"
                    value={form.maturity_date ? String(form.maturity_date).slice(0, 10) : ''}
                    onChange={(e) => setForm({ ...form, maturity_date: e.target.value })}
                    className="bg-[#0B1120] border-slate-700 text-slate-100"
                  />
                </div>
              </>
            )}

            {/* Status comum */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Status</Label>
              <Select
                value={form.status || 'active'}
                onValueChange={(v) => setForm({ ...form, status: v as BankAccount['status'] })}
              >
                <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                  <SelectItem value="blocked">Bloqueada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setSheetOpen(false)}
                className="text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                onClick={save}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-slate-950"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-[#111827] border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta ação não pode ser desfeita. Transações vinculadas podem ficar sem conta
              associada.
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

      <X className="hidden" />
    </div>
  )
}
