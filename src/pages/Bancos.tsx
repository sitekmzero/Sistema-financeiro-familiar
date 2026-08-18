import React, { useState, useEffect, useMemo } from 'react'
import { financeService } from '@/services/financeService'
import type { Bank } from '@/types/finance'
import { Building2, Plus, Pencil, Trash2, Loader2, Search, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

interface BrasilApiBank {
  ispb: string
  name: string
  code: string
  fullName: string
}

const DEFAULT_COLOR = '#0EA5E9'

export default function Bancos() {
  const { toast } = useToast()
  const [banks, setBanks] = useState<Bank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Bank | null>(null)
  const [form, setForm] = useState<Partial<Bank>>({})
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Brasil API autocomplete
  const [apiBanks, setApiBanks] = useState<BrasilApiBank[]>([])
  const [apiLoaded, setApiLoaded] = useState(false)
  const [apiLoading, setApiLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const load = async () => {
    try {
      const list = await financeService.getBanks()
      setBanks(list)
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
    if (!search.trim()) return banks
    const q = search.toLowerCase()
    return banks.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.ispb || '').toLowerCase().includes(q),
    )
  }, [banks, search])

  const loadApiBanks = async () => {
    if (apiLoaded || apiLoading) return
    setApiLoading(true)
    try {
      const res = await fetch('https://brasilapi.com.br/api/banks/v1')
      if (res.ok) {
        const data = (await res.json()) as BrasilApiBank[]
        setApiBanks(data.filter((b) => b.name))
        setApiLoaded(true)
      }
    } catch (err) {
      console.error('Brasil API indisponível:', err)
    } finally {
      setApiLoading(false)
    }
  }

  const suggestions = useMemo(() => {
    if (!showSuggestions || !form.name) return []
    const q = String(form.name).toLowerCase().trim()
    if (q.length < 2) return []
    return apiBanks
      .filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q) ||
          b.fullName.toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [apiBanks, form.name, showSuggestions])

  const openNew = () => {
    setEditing(null)
    setForm({ color: DEFAULT_COLOR })
    setSheetOpen(true)
    loadApiBanks()
  }

  const openEdit = (b: Bank) => {
    setEditing(b)
    setForm({ ...b })
    setSheetOpen(true)
  }

  const applySuggestion = (b: BrasilApiBank) => {
    setForm((prev) => ({
      ...prev,
      name: b.name,
      code: b.code,
      ispb: b.ispb,
    }))
    setShowSuggestions(false)
  }

  const save = async () => {
    if (!form.name || !String(form.name).trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }
    if (!form.code || !String(form.code).trim()) {
      toast({ title: 'Código Febraban obrigatório', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload: Partial<Bank> = {
        name: form.name?.trim(),
        code: String(form.code).trim(),
        ispb: form.ispb?.trim() || undefined,
        color: form.color || DEFAULT_COLOR,
        logo_url: form.logo_url?.trim() || undefined,
      }
      if (editing) {
        await financeService.updateBank(editing.id, payload)
      } else {
        await financeService.createBank(payload)
      }
      setSheetOpen(false)
      await load()
      toast({ title: editing ? 'Banco atualizado' : 'Banco criado' })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteId) return
    try {
      await financeService.deleteBank(deleteId)
      setDeleteId(null)
      await load()
      toast({ title: 'Banco excluído' })
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-sky-400" />
          <div>
            <h2 className="text-xl font-heading font-bold text-slate-100">Bancos</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Instituições financeiras cadastradas — usadas pelas contas e cartões.
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-slate-950">
          <Plus className="w-4 h-4 mr-1.5" /> Novo Banco
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Buscar por nome, código ou ISPB..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#111827] border-slate-700 text-slate-100"
        />
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Banco</TableHead>
              <TableHead className="text-slate-400">Código</TableHead>
              <TableHead className="text-slate-400">ISPB</TableHead>
              <TableHead className="text-slate-400">Cor</TableHead>
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
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-8 text-sm">
                  Nenhum banco encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((b) => (
              <TableRow key={b.id} className="border-slate-800/60">
                <TableCell className="text-sm">
                  <div className="flex items-center gap-3">
                    {b.logo_url ? (
                      <img
                        src={b.logo_url}
                        alt={b.name}
                        className="w-8 h-8 rounded-lg object-cover bg-slate-800"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                        style={{
                          background: `${b.color || DEFAULT_COLOR}22`,
                          color: b.color || DEFAULT_COLOR,
                        }}
                      >
                        {b.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-slate-100 font-medium">{b.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-mono text-slate-300">{b.code}</TableCell>
                <TableCell className="text-xs font-mono text-slate-400">{b.ispb || '—'}</TableCell>
                <TableCell>
                  <span
                    className="inline-block w-5 h-5 rounded-full border border-slate-700"
                    style={{ background: b.color || DEFAULT_COLOR }}
                  />
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
            ))}
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
              {editing ? 'Editar Banco' : 'Novo Banco'}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5 relative">
              <Label className="text-xs text-slate-400">Nome do Banco *</Label>
              <Input
                value={form.name || ''}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value })
                  setShowSuggestions(true)
                }}
                onFocus={() => {
                  loadApiBanks()
                  setShowSuggestions(true)
                }}
                placeholder="Digite para buscar na Brasil API..."
                className="bg-[#0B1120] border-slate-700 text-slate-100"
              />
              {apiLoading && (
                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Carregando lista Brasil API...
                </div>
              )}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-[#0B1120] border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.ispb + s.code}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 border-b border-slate-800/60 last:border-0 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-slate-100 truncate">{s.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{s.fullName}</div>
                      </div>
                      <div className="text-[10px] font-mono text-sky-400 shrink-0">{s.code}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Código Febraban *</Label>
                <Input
                  value={form.code || ''}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="ex: 336"
                  className="bg-[#0B1120] border-slate-700 text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">ISPB</Label>
                <Input
                  value={form.ispb || ''}
                  onChange={(e) => setForm({ ...form, ispb: e.target.value })}
                  className="bg-[#0B1120] border-slate-700 text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Cor principal</Label>
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
              <Label className="text-xs text-slate-400">URL do Logo</Label>
              <Input
                value={form.logo_url || ''}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://..."
                className="bg-[#0B1120] border-slate-700 text-slate-100"
              />
              {form.logo_url && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={form.logo_url}
                    alt="preview"
                    className="w-12 h-12 rounded-lg object-cover bg-slate-800 border border-slate-700"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.opacity = '0.2'
                    }}
                  />
                  <span className="text-[10px] text-slate-500">preview</span>
                </div>
              )}
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
            <AlertDialogTitle>Excluir banco?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Esta ação não pode ser desfeita. Contas vinculadas podem ficar sem banco associado.
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
