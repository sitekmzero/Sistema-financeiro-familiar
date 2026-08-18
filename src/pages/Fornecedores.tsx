import React, { useState, useEffect, useMemo } from 'react'
import { financeService } from '@/services/financeService'
import { getCategoryMeta } from '@/lib/categories'
import { useCategories } from '@/hooks/use-categories'
import type { Supplier } from '@/types/finance'
import { Truck, Plus, Search, Pencil, Trash2, X, Loader2 } from 'lucide-react'
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

const RECURRENCES = ['Mensal', 'Semanal', 'Esporádico', 'Anual'] as const

export default function Fornecedores() {
  const { toast } = useToast()
  const { metas: categoryMetas } = useCategories()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState<Partial<Supplier>>({})

  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = async () => {
    try {
      const list = await financeService.getSuppliers()
      setSuppliers(list)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false
      return true
    })
  }, [suppliers, search, categoryFilter])

  const openNew = () => {
    setEditing(null)
    setForm({ category: 'Outros', recurrence: 'Mensal' })
    setSheetOpen(true)
  }
  const openEdit = (s: Supplier) => {
    setEditing(s)
    setForm({ ...s })
    setSheetOpen(true)
  }

  const save = async () => {
    if (!form.name || !form.name.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }
    try {
      if (editing) {
        await financeService.updateSupplier(editing.id, form)
      } else {
        await financeService.createSupplier(form)
      }
      setSheetOpen(false)
      await load()
      toast({ title: editing ? 'Fornecedor atualizado' : 'Fornecedor criado' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    }
  }

  const remove = async () => {
    if (!deleteId) return
    try {
      await financeService.deleteSupplier(deleteId)
      setDeleteId(null)
      await load()
      toast({ title: 'Fornecedor excluído' })
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Truck className="w-6 h-6 text-blue-400" />
          <div>
            <h2 className="text-xl font-heading font-bold text-slate-100">Fornecedores</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Cadastro de fornecedores recorrentes da família.
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-slate-950">
          <Plus className="w-4 h-4 mr-1.5" /> Novo Fornecedor
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#111827] border-slate-700 text-slate-100"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-56 bg-[#111827] border-slate-700 text-slate-100">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categoryMetas.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Nome</TableHead>
              <TableHead className="text-slate-400">CNPJ</TableHead>
              <TableHead className="text-slate-400">Categoria</TableHead>
              <TableHead className="text-slate-400">Recorrência</TableHead>
              <TableHead className="text-slate-400">Forma de Pagamento</TableHead>
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
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8 text-sm">
                  Nenhum fornecedor encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((s) => {
              const meta = getCategoryMeta(s.category)
              return (
                <TableRow key={s.id} className="border-slate-800/60">
                  <TableCell className="text-sm text-slate-100 font-medium">{s.name}</TableCell>
                  <TableCell className="text-xs text-slate-400">{s.cnpj || '—'}</TableCell>
                  <TableCell className="text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                      {s.category || 'Outros'}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">{s.recurrence || '—'}</TableCell>
                  <TableCell className="text-xs text-slate-300">
                    {s.payment_method || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-emerald-400"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-rose-400"
                        onClick={() => setDeleteId(s.id)}
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
              {editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Nome *</Label>
              <Input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-[#0B1120] border-slate-700 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">CNPJ</Label>
              <Input
                value={form.cnpj || ''}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                className="bg-[#0B1120] border-slate-700 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Categoria</Label>
              <Select
                value={form.category || 'Outros'}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
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
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Recorrência</Label>
              <Select
                value={form.recurrence || 'Mensal'}
                onValueChange={(v) => setForm({ ...form, recurrence: v as Supplier['recurrence'] })}
              >
                <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                  {RECURRENCES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Forma de Pagamento</Label>
              <Input
                value={form.payment_method || ''}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                placeholder="ex: Cartão C6 Carbon"
                className="bg-[#0B1120] border-slate-700 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Observações</Label>
              <Input
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
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

      <X className="hidden" />
    </div>
  )
}
