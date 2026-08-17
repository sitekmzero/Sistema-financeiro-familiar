import React, { useState, useEffect } from 'react'
import { financeService } from '@/services/financeService'
import { useRealtime } from '@/hooks/use-realtime'
import type { Trip, TripItem, TripChecklistItem } from '@/types/finance'
import {
  Plane,
  PlusCircle,
  Calendar,
  Clock,
  CheckSquare,
  Square,
  Trash2,
  DollarSign,
  Tag,
  Sparkles,
  MapPin,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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

export default function Trips() {
  const { toast } = useToast()
  const [trips, setTrips] = useState<Trip[]>([])
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [tripItems, setTripItems] = useState<TripItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // New Trip Modal
  const [newTripOpen, setNewTripOpen] = useState(false)
  const [newTripForm, setNewTripForm] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    budget: '',
    saved_amount: '',
  })

  // Save Savings Modal
  const [savingsModalOpen, setSavingsModalOpen] = useState(false)
  const [savingAmount, setSavingAmount] = useState('')

  // New Item Modal
  const [newItemOpen, setNewItemOpen] = useState(false)
  const [newItemDesc, setNewItemDesc] = useState('')
  const [newItemCat, setNewItemCat] = useState<
    'transporte' | 'hospedagem' | 'alimentacao' | 'passeios' | 'extras'
  >('transporte')
  const [newItemAmount, setNewItemAmount] = useState('')

  const loadData = async () => {
    try {
      const list = await financeService.getTrips()
      setTrips(list)
      if (list.length > 0 && !selectedTrip) {
        setSelectedTrip(list[0])
        loadItems(list[0].id)
      } else if (selectedTrip) {
        loadItems(selectedTrip.id)
      }
    } catch (err) {
      console.error('Failed to load trips:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadItems = async (tripId: string) => {
    try {
      const items = await financeService.getTripItems(tripId)
      setTripItems(items)
    } catch (err) {
      console.error('Failed to load trip items:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('trips', () => {
    financeService.getTrips().then((list) => {
      setTrips(list)
      if (selectedTrip) {
        const found = list.find((t) => t.id === selectedTrip.id)
        if (found) setSelectedTrip(found)
      }
    })
  })

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTrip(trip)
    loadItems(trip.id)
  }

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTripForm.destination || !newTripForm.budget) {
      toast({ title: 'Destino e orçamento são obrigatórios', variant: 'destructive' })
      return
    }

    try {
      const budgetNum = parseFloat(newTripForm.budget.replace(',', '.'))
      const savedNum = parseFloat(newTripForm.saved_amount.replace(',', '.')) || 0

      const created = await financeService.createTrip({
        destination: newTripForm.destination,
        start_date: newTripForm.start_date ? `${newTripForm.start_date} 00:00:00.000Z` : undefined,
        end_date: newTripForm.end_date ? `${newTripForm.end_date} 00:00:00.000Z` : undefined,
        budget: budgetNum,
        saved_amount: savedNum,
        status: 'planejando',
        checklist: [
          { id: '1', task: 'Comprar passagens aéreas', done: false },
          { id: '2', task: 'Reservar hospedagem', done: false },
          { id: '3', task: 'Montar roteiro de passeios', done: false },
          { id: '4', task: 'Revisar bagagem e documentos', done: false },
        ],
      })

      toast({ title: 'Viagem planejada com sucesso!' })
      setNewTripOpen(false)
      setNewTripForm({
        destination: '',
        start_date: '',
        end_date: '',
        budget: '',
        saved_amount: '',
      })
      loadData()
      setSelectedTrip(created)
    } catch (err: any) {
      toast({ title: 'Erro ao criar viagem', description: err.message, variant: 'destructive' })
    }
  }

  const handleRecordSavings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTrip || !savingAmount) return
    const amt = parseFloat(savingAmount.replace(',', '.'))
    if (isNaN(amt) || amt <= 0) return

    try {
      await financeService.recordTripSavings(selectedTrip.id, amt)
      toast({
        title: 'Economia registrada!',
        description: `R$ ${amt.toFixed(2)} guardados para ${selectedTrip.destination}!`,
      })
      setSavingsModalOpen(false)
      setSavingAmount('')
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao registrar', description: err.message, variant: 'destructive' })
    }
  }

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTrip || !newItemDesc || !newItemAmount) return

    try {
      const amt = parseFloat(newItemAmount.replace(',', '.'))
      await financeService.createTripItem({
        trip: selectedTrip.id,
        description: newItemDesc,
        category: newItemCat,
        amount: amt,
      })

      toast({ title: 'Item de custo adicionado!' })
      setNewItemOpen(false)
      setNewItemDesc('')
      setNewItemAmount('')
      loadItems(selectedTrip.id)
    } catch (err: any) {
      toast({ title: 'Erro ao adicionar item', description: err.message, variant: 'destructive' })
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      await financeService.deleteTripItem(id)
      if (selectedTrip) loadItems(selectedTrip.id)
    } catch (err: any) {
      toast({ title: 'Erro ao excluir item', description: err.message, variant: 'destructive' })
    }
  }

  const handleToggleChecklist = async (index: number) => {
    if (!selectedTrip || !selectedTrip.checklist) return
    const updatedChecklist = [...selectedTrip.checklist]
    updatedChecklist[index].done = !updatedChecklist[index].done

    try {
      await financeService.updateTrip(selectedTrip.id, { checklist: updatedChecklist })
      setSelectedTrip({ ...selectedTrip, checklist: updatedChecklist })
    } catch (err: any) {
      console.error('Failed to toggle checklist:', err)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return 0
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-100">
            Férias & Viagens Familiares
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Programe suas férias dos sonhos com tranquilidade e sem endividamento.
          </p>
        </div>
        <Button
          onClick={() => setNewTripOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-9"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" /> Planejar Nova Viagem
        </Button>
      </div>

      {/* Trips Cards Selection Carousel/Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trips.map((trip) => {
          const saved = trip.saved_amount || 0
          const pct = Math.min(100, Math.round((saved / trip.budget) * 100))
          const days = getDaysDiff(trip.start_date)
          const isSelected = selectedTrip?.id === trip.id

          return (
            <div
              key={trip.id}
              onClick={() => handleSelectTrip(trip)}
              className={`cursor-pointer rounded-2xl p-5 border transition-all ${
                isSelected
                  ? 'bg-gradient-to-br from-emerald-950/40 via-[#111827] to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : 'bg-[#111827] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center">
                    <Plane className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm sm:text-base text-slate-100">
                      {trip.destination}
                    </h3>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {trip.start_date
                        ? new Date(trip.start_date).toLocaleDateString('pt-BR')
                        : 'Data a definir'}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/30">
                  {days > 0 ? `Faltam ${days} dias` : 'Em andamento'}
                </span>
              </div>

              <div className="space-y-1.5 my-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">
                    Poupado: <strong className="text-emerald-400">{formatCurrency(saved)}</strong>
                  </span>
                  <span className="text-slate-400">Meta: {formatCurrency(trip.budget)}</span>
                </div>
                <Progress value={pct} className="h-2 bg-slate-800 [&>div]:bg-teal-400" />
              </div>

              <div className="text-right text-[11px] text-teal-300 font-semibold">
                {pct}% acumulado
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Trip Details */}
      {selectedTrip && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-1">
                Destino Selecionado
              </div>
              <h3 className="text-2xl font-heading font-bold text-slate-100 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-emerald-400" /> {selectedTrip.destination}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Orçamento Previsto: {formatCurrency(selectedTrip.budget)} · Salvo:{' '}
                {formatCurrency(selectedTrip.saved_amount || 0)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setSavingsModalOpen(true)}
                className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs h-9"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" /> Registrar Economias
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Breakdown de Custos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-heading font-bold text-sm sm:text-base text-slate-100">
                    Detalhamento de Custos
                  </h4>
                  <p className="text-xs text-slate-400">Itens previstos para a viagem</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNewItemOpen(true)}
                  className="text-xs border-slate-700 text-slate-300 hover:text-white h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-teal-400" /> Adicionar Custo
                </Button>
              </div>

              <div className="divide-y divide-slate-800/80 bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                {tripItems.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    Nenhum custo cadastrado para este destino.
                  </div>
                ) : (
                  tripItems.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-teal-400" />
                        <div>
                          <div className="font-semibold text-slate-200">{item.description}</div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {item.category}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-heading font-bold font-mono text-slate-100">
                          {formatCurrency(item.amount || 0)}
                        </span>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Checklist Pré-Viagem */}
            <div className="space-y-4">
              <div>
                <h4 className="font-heading font-bold text-sm sm:text-base text-slate-100">
                  Checklist Pré-Viagem
                </h4>
                <p className="text-xs text-slate-400">
                  Tarefas e preparativos para embarcar sem estresse
                </p>
              </div>

              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 space-y-2">
                {!selectedTrip.checklist || selectedTrip.checklist.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">Checklist vazio.</div>
                ) : (
                  selectedTrip.checklist.map((task, idx) => (
                    <div
                      key={task.id || idx}
                      onClick={() => handleToggleChecklist(idx)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition text-xs text-slate-200"
                    >
                      {task.done ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span className={task.done ? 'line-through text-slate-500' : ''}>
                        {task.task}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Viagem */}
      <Dialog open={newTripOpen} onOpenChange={setNewTripOpen}>
        <DialogContent className="bg-[#111827] border-slate-800 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-100">
              Planejar Nova Viagem
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTrip} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Destino da Viagem</Label>
              <Input
                required
                placeholder="Ex: Fernando de Noronha, Gramado, Paris"
                value={newTripForm.destination}
                onChange={(e) => setNewTripForm({ ...newTripForm, destination: e.target.value })}
                className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Orçamento Total (R$)</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  placeholder="Ex: 9000.00"
                  value={newTripForm.budget}
                  onChange={(e) => setNewTripForm({ ...newTripForm, budget: e.target.value })}
                  className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Já Economizado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={newTripForm.saved_amount}
                  onChange={(e) => setNewTripForm({ ...newTripForm, saved_amount: e.target.value })}
                  className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Data de Ida</Label>
                <Input
                  type="date"
                  value={newTripForm.start_date}
                  onChange={(e) => setNewTripForm({ ...newTripForm, start_date: e.target.value })}
                  className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Data de Volta</Label>
                <Input
                  type="date"
                  value={newTripForm.end_date}
                  onChange={(e) => setNewTripForm({ ...newTripForm, end_date: e.target.value })}
                  className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setNewTripOpen(false)}
                className="text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
              >
                Criar Viagem
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Registrar Economias */}
      <Dialog open={savingsModalOpen} onOpenChange={setSavingsModalOpen}>
        <DialogContent className="bg-[#111827] border-slate-800 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-100">
              Guardar Dinheiro para a Viagem
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRecordSavings} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Valor a Guardar (R$)</Label>
              <Input
                required
                type="number"
                step="0.01"
                placeholder="Ex: 500.00"
                value={savingAmount}
                onChange={(e) => setSavingAmount(e.target.value)}
                className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSavingsModalOpen(false)}
                className="text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold"
              >
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Custo */}
      <Dialog open={newItemOpen} onOpenChange={setNewItemOpen}>
        <DialogContent className="bg-[#111827] border-slate-800 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-slate-100">
              Adicionar Item de Custo
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateItem} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Descrição do Item</Label>
              <Input
                required
                placeholder="Ex: Passagens, Hotel, Jantares"
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Categoria</Label>
                <Select value={newItemCat} onValueChange={(val: any) => setNewItemCat(val)}>
                  <SelectTrigger className="bg-[#1E293B] border-slate-700 text-slate-200 text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-slate-700 text-slate-200 text-xs">
                    <SelectItem value="transporte">Transporte</SelectItem>
                    <SelectItem value="hospedagem">Hospedagem</SelectItem>
                    <SelectItem value="alimentacao">Alimentação</SelectItem>
                    <SelectItem value="passeios">Passeios</SelectItem>
                    <SelectItem value="extras">Extras</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Valor Previsto (R$)</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                  className="bg-[#1E293B] border-slate-700 text-slate-100 h-10 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setNewItemOpen(false)}
                className="text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
              >
                Salvar Custo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
