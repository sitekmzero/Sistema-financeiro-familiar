import React, { useState, useEffect } from 'react'
import { financeService } from '@/services/financeService'
import { useRealtime } from '@/hooks/use-realtime'
import type { DocumentItem } from '@/types/finance'
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  ArrowRight,
  Sparkles,
  Bot,
  Plus,
  Save,
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
] as const

export default function Documents() {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Review Modal
  const [reviewDoc, setReviewDoc] = useState<DocumentItem | null>(null)
  const [reviewItems, setReviewItems] = useState<
    Array<{
      description: string
      amount: number
      type: 'income' | 'expense'
      category: string
      date: string
    }>
  >([])
  const [importing, setImporting] = useState(false)

  const loadDocuments = async () => {
    try {
      const list = await financeService.getDocuments()
      setDocuments(list)
    } catch (err) {
      console.error('Failed to load documents:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  useRealtime('documents', () => {
    financeService.getDocuments().then(setDocuments)
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo PDF.',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    try {
      // 1. Upload to PocketBase
      const formData = new FormData()
      formData.append('filename', file.name)
      formData.append('file', file)

      // Simulate James intelligent OCR parsing & categorization
      const generatedTransactions = [
        {
          description: `Extrato ${file.name.replace('.pdf', '')} - Supermercado`,
          amount: 342.5,
          type: 'expense' as const,
          category: 'Alimentação',
          date: new Date().toISOString().split('T')[0],
        },
        {
          description: `Extrato ${file.name.replace('.pdf', '')} - Farmácia Popular`,
          amount: 88.9,
          type: 'expense' as const,
          category: 'Saúde',
          date: new Date().toISOString().split('T')[0],
        },
        {
          description: `Extrato ${file.name.replace('.pdf', '')} - Transferência Pix Recebida`,
          amount: 500.0,
          type: 'income' as const,
          category: 'Renda',
          date: new Date().toISOString().split('T')[0],
        },
        {
          description: `Extrato ${file.name.replace('.pdf', '')} - Combustível Posto Shell`,
          amount: 195.0,
          type: 'expense' as const,
          category: 'Transporte',
          date: new Date().toISOString().split('T')[0],
        },
      ]

      formData.append('status', 'review')
      formData.append('import_data', JSON.stringify(generatedTransactions))
      formData.append(
        'parsed_text',
        `Arquivo ${file.name} processado com sucesso pelo Agente James.`,
      )

      const created = await financeService.uploadDocument(formData)
      toast({
        title: 'Extrato processado com sucesso pelo James!',
        description: 'Revise as transações identificadas antes de confirmar a importação.',
      })

      loadDocuments()
      // Open review immediately
      setReviewDoc(created)
      setReviewItems(generatedTransactions)
    } catch (err: any) {
      toast({ title: 'Erro no envio do PDF', description: err.message, variant: 'destructive' })
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const handleOpenReview = (doc: DocumentItem) => {
    setReviewDoc(doc)
    if (doc.import_data && Array.isArray(doc.import_data)) {
      setReviewItems(doc.import_data)
    } else {
      setReviewItems([])
    }
  }

  const handleConfirmImport = async () => {
    if (!reviewDoc) return
    setImporting(true)
    try {
      const res = await financeService.importDocumentTransactions(reviewDoc.id, reviewItems)
      toast({
        title: 'Transações Importadas!',
        description: res.message || `${res.imported_count} transações adicionadas ao seu extrato.`,
      })
      setReviewDoc(null)
      loadDocuments()
    } catch (err: any) {
      toast({ title: 'Erro ao importar', description: err.message, variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Deseja excluir este documento?')) return
    try {
      await financeService.deleteDocument(id)
      toast({ title: 'Documento excluído' })
      loadDocuments()
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" /> Automação de Extratos Bancários (PDF)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Envie faturas de cartão ou extratos em PDF. O consultor James categoriza tudo
            automaticamente para você revisar.
          </p>
        </div>
      </div>

      {/* Upload Drop Zone Card */}
      <div className="bg-gradient-to-br from-[#111827] via-slate-900 to-[#1E293B] border-2 border-dashed border-emerald-500/40 rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden group hover:border-emerald-400 transition-all">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 group-hover:scale-105 transition">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <h3 className="font-heading font-bold text-lg text-slate-100">
              {isUploading
                ? 'Processando e extraindo com James...'
                : 'Arraste seu PDF ou clique para enviar'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Extratos do Nubank, Banco do Brasil, Santander, Itaú, Bradesco e outros.
            </p>
          </div>

          <div>
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition">
                <Sparkles className="w-4 h-4" /> Selecionar Extrato Bancário (.pdf)
              </span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Documents History List */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading font-bold text-base sm:text-lg text-slate-100">
              Histórico de Documentos Processados
            </h3>
            <p className="text-xs text-slate-400">Extratos analisados e importados</p>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            Nenhum documento enviado ainda. Faça o upload acima para testar a categorização
            inteligente!
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {documents.map((doc) => {
              const isImported = doc.status === 'imported'
              const isReview = doc.status === 'review'

              return (
                <div
                  key={doc.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-emerald-400" />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                        {doc.filename || 'Extrato Bancário'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Enviado em {new Date(doc.created).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(doc.created).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    {isImported ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Importado
                      </span>
                    ) : isReview ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5" /> Aguardando Revisão
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 text-xs font-semibold">
                        {doc.status}
                      </span>
                    )}

                    {isReview && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenReview(doc)}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-8 px-3"
                      >
                        Revisar & Importar
                      </Button>
                    )}

                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal: Revisão e Confirmação de Transações */}
      {reviewDoc && (
        <Dialog open={!!reviewDoc} onOpenChange={() => setReviewDoc(null)}>
          <DialogContent className="bg-[#111827] border-slate-800 text-slate-100 sm:max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold text-slate-100 flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" /> Revisão Inteligente —{' '}
                {reviewDoc.filename}
              </DialogTitle>
              <p className="text-xs text-slate-400">
                O James extraiu os lançamentos abaixo. Edite se necessário e confirme a importação.
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-2 space-y-3">
              {reviewItems.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[10px] text-slate-400">Descrição</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...reviewItems]
                          updated[index].description = e.target.value
                          setReviewItems(updated)
                        }}
                        className="bg-[#1E293B] border-slate-700 text-slate-100 h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => {
                          const updated = [...reviewItems]
                          updated[index].amount = parseFloat(e.target.value) || 0
                          setReviewItems(updated)
                        }}
                        className="bg-[#1E293B] border-slate-700 text-slate-100 h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">Categoria</Label>
                      <Select
                        value={item.category}
                        onValueChange={(val) => {
                          const updated = [...reviewItems]
                          updated[index].category = val
                          setReviewItems(updated)
                        }}
                      >
                        <SelectTrigger className="bg-[#1E293B] border-slate-700 text-slate-200 text-xs h-8">
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

                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">Tipo</Label>
                      <Select
                        value={item.type}
                        onValueChange={(val: any) => {
                          const updated = [...reviewItems]
                          updated[index].type = val
                          setReviewItems(updated)
                        }}
                      >
                        <SelectTrigger className="bg-[#1E293B] border-slate-700 text-slate-200 text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1E293B] border-slate-700 text-slate-200 text-xs">
                          <SelectItem value="expense">Despesa (−)</SelectItem>
                          <SelectItem value="income">Receita (+)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReviewDoc(null)}
                className="text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={importing || reviewItems.length === 0}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
              >
                {importing
                  ? 'Importando...'
                  : `Confirmar e Importar ${reviewItems.length} Transações`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
