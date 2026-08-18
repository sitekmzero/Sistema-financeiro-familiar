import React, { useState, useEffect } from 'react'
import { financeService } from '@/services/financeService'
import { useCategories } from '@/hooks/use-categories'
import { ICON_OPTIONS, ICON_MAP, resolveIcon } from '@/lib/categories'
import type { Category } from '@/types/finance'
import { Tag, Plus, Pencil, Trash2, Loader2, Check, Search } from 'lucide-react'
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

const DEFAULT_COLOR = '#A855F7'
const DEFAULT_ICON = 'Tag'

export default function Categorias() {
  const { toast } = useToast()
  const { raw, metas, isLoading, reload } = useCategories()

  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<Partial<Category>>({})
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = metas.filter((m) =>
    !search.trim() ? true : m.name.toLowerCase().includes(search.toLowerCase()),
  )

  const openNew = () => {
    setEditing(null)
    setForm({ color: DEFAULT_COLOR, icon: DEFAULT_ICON })
    setSheetOpen(true)
  }

  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ ...c })
    setSheetOpen(true)
  }

  const save = async () => {
    if (!form.name || !String(form.name).trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload: Partial<Category> = {
        name: form.name?.trim(),
        color: form.color || DEFAULT_COLOR,
        icon: form.icon || DEFAULT_ICON,
      }
      if (editing) {
        await financeService.updateCategory(editing.id, payload)
      } else {
        await financeService.createCategory(payload)
      }
      setSheetOpen(false)
      await reload()
      toast({ title: editing ? 'Categoria atualizada' : 'Categoria criada' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteId) return
    try {
      await financeService.deleteCategory(deleteId)
      setDeleteId(null)
      await reload()
      toast({ title: 'Categoria excluída' })
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

  const FormIcon = ICON_MAP[form.icon || DEFAULT_ICON] || Tag

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Tag className="w-6 h-6 text-purple-400" />
          <div>
            <h2 className="text-xl font-heading font-bold text-slate-100">Categorias</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Categorias padrão e customizadas — use cores e ícones para organizar seus gastos.
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-slate-950">
          <Plus className="w-4 h-4 mr-1.5" /> Nova Categoria
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Buscar categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#111827] border-slate-700 text-slate-100"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando categorias...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((cat) => {
            const Icon = cat.icon
            const dbRec = raw.find((r) => r.name.toLowerCase() === cat.name.toLowerCase())
            const isCustom = dbRec && !dbRec.is_default
            return (
              <div
                key={cat.name}
                className={`rounded-2xl border p-5 ${cat.bg} ${cat.ring} ring-1 hover:scale-[1.02] transition-transform group`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: `${cat.color}22`, color: cat.color }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    {dbRec && (
                      <button
                        onClick={() => openEdit(dbRec)}
                        className="p-1.5 rounded-lg bg-slate-900/60 text-slate-300 hover:text-emerald-400"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {dbRec && (
                      <button
                        onClick={() => setDeleteId(dbRec.id)}
                        className="p-1.5 rounded-lg bg-slate-900/60 text-slate-300 hover:text-rose-400"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-heading font-semibold text-slate-100 mt-3">
                  {cat.name}
                </h3>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {isCustom ? 'customizada' : 'padrão'}
                  </span>
                </div>
              </div>
            )
          })}
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
              {editing ? 'Editar Categoria' : 'Nova Categoria'}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0B1120] border border-slate-800">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{
                  background: `${form.color || DEFAULT_COLOR}22`,
                  color: form.color || DEFAULT_COLOR,
                }}
              >
                <FormIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-heading font-semibold text-slate-100">
                  {form.name || 'Nome da categoria'}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">preview</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Nome *</Label>
              <Input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex: Mercado"
                className="bg-[#0B1120] border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Cor</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.color || DEFAULT_COLOR}
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

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Ícone</Label>
              <Select
                value={form.icon || DEFAULT_ICON}
                onValueChange={(v) => setForm({ ...form, icon: v })}
              >
                <SelectTrigger className="bg-[#0B1120] border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] border-slate-700 text-slate-100 max-h-72">
                  {ICON_OPTIONS.map((name) => {
                    const I = ICON_MAP[name]
                    return (
                      <SelectItem key={name} value={name}>
                        <span className="inline-flex items-center gap-2">
                          <I className="w-4 h-4" />
                          {name}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {ICON_OPTIONS.slice(0, 12).map((name) => {
                  const I = ICON_MAP[name]
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setForm({ ...form, icon: name })}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border transition ${
                        form.icon === name
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                          : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title={name}
                    >
                      <I className="w-4 h-4" />
                    </button>
                  )
                })}
              </div>
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
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1.5" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-[#111827] border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta ação não pode ser desfeita. Transações já registradas com esta categoria não
              serão alteradas, mas ela deixará de aparecer nos selects.
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

      <Badge className="hidden" />
    </div>
  )
}
