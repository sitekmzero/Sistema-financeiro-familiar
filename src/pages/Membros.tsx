import React, { useState, useEffect } from 'react'
import { financeService } from '@/services/financeService'
import type { FamilyMember } from '@/types/finance'
import { Users, Plus, Pencil, Trash2, Mail, CreditCard, Loader2 } from 'lucide-react'
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

const ROLES = ['Titular', 'Cônjuge', 'Filho(a)'] as const

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const getInitials = (name?: string) => {
  if (!name) return '?'
  const parts = name.split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

const roleColor: Record<string, string> = {
  Titular: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Cônjuge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Filho(a)': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
}

export default function Membros() {
  const { toast } = useToast()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<FamilyMember | null>(null)
  const [form, setForm] = useState<Partial<FamilyMember>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = async () => {
    try {
      setMembers(await financeService.getFamilyMembers())
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setEditing(null)
    setForm({ role: 'Filho(a)' })
    setSheetOpen(true)
  }
  const openEdit = (m: FamilyMember) => {
    setEditing(m)
    setForm({ ...m })
    setSheetOpen(true)
  }

  const save = async () => {
    if (!form.name || !form.name.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }
    try {
      if (editing) await financeService.updateFamilyMember(editing.id, form)
      else await financeService.createFamilyMember(form)
      setSheetOpen(false)
      await load()
      toast({ title: editing ? 'Membro atualizado' : 'Membro adicionado' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    }
  }

  const remove = async () => {
    if (!deleteId) return
    try {
      await financeService.deleteFamilyMember(deleteId)
      setDeleteId(null)
      await load()
      toast({ title: 'Membro excluído' })
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-emerald-400" />
          <div>
            <h2 className="text-xl font-heading font-bold text-slate-100">Membros da Família</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Titular, cônjuge e dependentes do family office.
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-slate-950">
          <Plus className="w-4 h-4 mr-1.5" /> Adicionar Membro
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <div
              key={m.id}
              className="bg-[#111827] border border-slate-800 rounded-2xl p-5 relative group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center font-heading font-bold text-slate-950">
                  {getInitials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-heading font-semibold text-slate-100 truncate">
                    {m.name}
                  </h3>
                  {m.role && (
                    <span
                      className={`inline-block text-[10px] px-2 py-0.5 rounded-full border mt-0.5 ${roleColor[m.role] || 'bg-slate-700 text-slate-300'}`}
                    >
                      {m.role}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                {m.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{m.email}</span>
                  </div>
                )}
                {m.card_number && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Cartão {m.card_number}</span>
                  </div>
                )}
                {m.monthly_allowance ? (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Mesada:</span>
                    <span className="text-emerald-400 font-mono">
                      {fmtCurrency(m.monthly_allowance)}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-emerald-400"
                  onClick={() => openEdit(m)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-rose-400"
                  onClick={() => setDeleteId(m.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-12 text-sm">
              Nenhum membro cadastrado.
            </div>
          )}
        </div>
      )}

      {/* Sheet form */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="bg-[#111827] border-slate-800 text-slate-100 overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-slate-100">
              {editing ? 'Editar Membro' : 'Adicionar Membro'}
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
              <Label className="text-xs text-slate-400">E-mail</Label>
              <Input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-[#0B1120] border-slate-700 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Papel</Label>
              <Select
                value={form.role || 'Filho(a)'}
                onValueChange={(v) => setForm({ ...form, role: v as FamilyMember['role'] })}
              >
                <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] border-slate-700 text-slate-100">
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Mesada / Limite Mensal (R$)</Label>
              <Input
                type="number"
                value={form.monthly_allowance ?? ''}
                onChange={(e) => setForm({ ...form, monthly_allowance: Number(e.target.value) })}
                className="bg-[#0B1120] border-slate-700 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Final do Cartão Adicional</Label>
              <Input
                value={form.card_number || ''}
                onChange={(e) => setForm({ ...form, card_number: e.target.value })}
                placeholder="ex: *0463"
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
            <AlertDialogTitle>Excluir membro?</AlertDialogTitle>
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
