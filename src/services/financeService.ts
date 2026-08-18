import pb from '@/lib/pocketbase/client'
import type {
  BankAccount,
  Transaction,
  Debt,
  DebtPayment,
  ReserveGoal,
  ReserveContribution,
  Trip,
  TripItem,
  DocumentItem,
  ChatMessage,
  WeeklyReport,
  Supplier,
  Budget,
  FamilyMember,
  AppUser,
  GratitudeJournalEntry,
  DocumentImport,
} from '@/types/finance'

export const financeService = {
  // Bank Accounts
  async getAccounts(): Promise<BankAccount[]> {
    return await pb.collection('bank_accounts').getFullList<BankAccount>({ sort: 'name' })
  },

  async createAccount(data: Partial<BankAccount>): Promise<BankAccount> {
    return await pb.collection('bank_accounts').create<BankAccount>({
      ...data,
      user: pb.authStore.record?.id,
    })
  },

  // Transactions
  async getTransactions(limit = 100, filter = ''): Promise<Transaction[]> {
    return (
      await pb.collection('transactions').getList<Transaction>(1, limit, {
        filter,
        sort: '-date',
      })
    ).items
  },

  async createTransaction(data: Partial<Transaction>): Promise<Transaction> {
    return await pb.collection('transactions').create<Transaction>({
      ...data,
      user: pb.authStore.record?.id,
    })
  },

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
    return await pb.collection('transactions').update<Transaction>(id, data)
  },

  async deleteTransaction(id: string): Promise<boolean> {
    return await pb.collection('transactions').delete(id)
  },

  // Debts
  async getDebts(): Promise<Debt[]> {
    return await pb.collection('debts').getFullList<Debt>({ sort: 'due_date' })
  },

  async createDebt(data: Partial<Debt>): Promise<Debt> {
    return await pb.collection('debts').create<Debt>({
      ...data,
      user: pb.authStore.record?.id,
    })
  },

  async updateDebt(id: string, data: Partial<Debt>): Promise<Debt> {
    return await pb.collection('debts').update<Debt>(id, data)
  },

  async deleteDebt(id: string): Promise<boolean> {
    return await pb.collection('debts').delete(id)
  },

  async recordDebtPayment(
    debtId: string,
    amount: number,
    date?: string,
    note?: string,
  ): Promise<DebtPayment> {
    const userId = pb.authStore.record?.id
    // 1. Create debt payment record
    const payment = await pb.collection('debt_payments').create<DebtPayment>({
      debt: debtId,
      amount,
      date: date || new Date().toISOString(),
      note,
      user: userId,
    })

    // 2. Fetch debt and update remaining amount
    const debt = await pb.collection('debts').getOne<Debt>(debtId)
    const newRemaining = Math.max(0, debt.remaining_amount - amount)
    const newStatus = newRemaining === 0 ? 'paga' : debt.status

    await pb.collection('debts').update(debtId, {
      remaining_amount: newRemaining,
      status: newStatus,
    })

    // 3. Create expense transaction
    await pb.collection('transactions').create({
      description: `Pagamento Dívida: ${debt.name}`,
      amount,
      type: 'expense',
      category: 'Outros',
      date: date || new Date().toISOString(),
      source: 'manual',
      user: userId,
    })

    return payment
  },

  async getDebtPayments(debtId?: string): Promise<DebtPayment[]> {
    const filter = debtId ? `debt = "${debtId}"` : ''
    return await pb.collection('debt_payments').getFullList<DebtPayment>({
      filter,
      sort: '-date',
    })
  },

  // Reserve Goals & Contributions
  async getReserveGoals(): Promise<ReserveGoal[]> {
    return await pb.collection('reserve_goals').getFullList<ReserveGoal>({ sort: '-created' })
  },

  async createReserveGoal(data: Partial<ReserveGoal>): Promise<ReserveGoal> {
    return await pb.collection('reserve_goals').create<ReserveGoal>({
      ...data,
      user: pb.authStore.record?.id,
    })
  },

  async updateReserveGoal(id: string, data: Partial<ReserveGoal>): Promise<ReserveGoal> {
    return await pb.collection('reserve_goals').update<ReserveGoal>(id, data)
  },

  async getReserveContributions(goalId?: string): Promise<ReserveContribution[]> {
    const filter = goalId ? `goal = "${goalId}"` : ''
    return await pb.collection('reserve_contributions').getFullList<ReserveContribution>({
      filter,
      sort: '-date',
    })
  },

  async recordReserveContribution(
    goalId: string,
    amount: number,
    date?: string,
  ): Promise<ReserveContribution> {
    const userId = pb.authStore.record?.id
    const contrib = await pb.collection('reserve_contributions').create<ReserveContribution>({
      goal: goalId,
      amount,
      date: date || new Date().toISOString(),
      user: userId,
    })

    const goal = await pb.collection('reserve_goals').getOne<ReserveGoal>(goalId)

    // Create expense/transfer transaction
    await pb.collection('transactions').create({
      description: `Aporte Reserva: ${goal.title}`,
      amount,
      type: 'expense',
      category: 'Outros',
      date: date || new Date().toISOString(),
      source: 'manual',
      user: userId,
    })

    return contrib
  },

  // Trips & Items
  async getTrips(): Promise<Trip[]> {
    return await pb.collection('trips').getFullList<Trip>({ sort: 'start_date' })
  },

  async createTrip(data: Partial<Trip>): Promise<Trip> {
    return await pb.collection('trips').create<Trip>({
      ...data,
      user: pb.authStore.record?.id,
    })
  },

  async updateTrip(id: string, data: Partial<Trip>): Promise<Trip> {
    return await pb.collection('trips').update<Trip>(id, data)
  },

  async deleteTrip(id: string): Promise<boolean> {
    return await pb.collection('trips').delete(id)
  },

  async getTripItems(tripId?: string): Promise<TripItem[]> {
    const filter = tripId ? `trip = "${tripId}"` : ''
    return await pb.collection('trip_items').getFullList<TripItem>({
      filter,
      sort: 'created',
    })
  },

  async createTripItem(data: Partial<TripItem>): Promise<TripItem> {
    return await pb.collection('trip_items').create<TripItem>({
      ...data,
      user: pb.authStore.record?.id,
    })
  },

  async deleteTripItem(id: string): Promise<boolean> {
    return await pb.collection('trip_items').delete(id)
  },

  async recordTripSavings(tripId: string, amount: number, date?: string): Promise<void> {
    const trip = await pb.collection('trips').getOne<Trip>(tripId)
    const newSaved = (trip.saved_amount || 0) + amount
    await pb.collection('trips').update(tripId, { saved_amount: newSaved })

    await pb.collection('transactions').create({
      description: `Poupança Viagem: ${trip.destination}`,
      amount,
      type: 'expense',
      category: 'Lazer',
      date: date || new Date().toISOString(),
      source: 'manual',
      user: pb.authStore.record?.id,
    })
  },

  // Documents
  async getDocuments(): Promise<DocumentItem[]> {
    return await pb.collection('documents').getFullList<DocumentItem>({ sort: '-created' })
  },

  async uploadDocument(formData: FormData): Promise<DocumentItem> {
    formData.append('user', pb.authStore.record?.id || '')
    formData.append('status', 'parsing')
    return await pb.collection('documents').create<DocumentItem>(formData)
  },

  async updateDocument(id: string, data: Partial<DocumentItem>): Promise<DocumentItem> {
    return await pb.collection('documents').update<DocumentItem>(id, data)
  },

  async deleteDocument(id: string): Promise<boolean> {
    return await pb.collection('documents').delete(id)
  },

  async importDocumentTransactions(
    documentId: string,
    transactions: Array<{
      description: string
      amount: number
      type: 'income' | 'expense'
      category: string
      date: string
      account?: string
    }>,
  ): Promise<{ success: boolean; imported_count: number; message: string }> {
    const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/documents/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify({ document_id: documentId, transactions }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao importar transações.' }))
      throw new Error(err.error || 'Erro na importação.')
    }

    return await res.json()
  },

  // Weekly Reports
  async getWeeklyReports(): Promise<WeeklyReport[]> {
    return await pb.collection('weekly_reports').getFullList<WeeklyReport>({ sort: '-week_start' })
  },

  async createWeeklyReport(data: Partial<WeeklyReport>): Promise<WeeklyReport> {
    return await pb.collection('weekly_reports').create<WeeklyReport>({
      ...data,
      user: pb.authStore.record?.id,
    })
  },

  // Chat Messages
  async getChatMessages(limit = 100): Promise<ChatMessage[]> {
    return (
      await pb.collection('chat_messages').getList<ChatMessage>(1, limit, {
        sort: 'created',
      })
    ).items
  },

  async sendChatMessage(
    message: string,
    command?: string,
    conversationId?: string | null,
  ): Promise<{
    conversation_id?: string
    content: string
    citations?: string[]
  }> {
    const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/agents/james/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify({
        message,
        command,
        conversation_id: conversationId || null,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao comunicar com James.' }))
      throw new Error(err.error || 'Erro no chat.')
    }

    return await res.json()
  },

  // Transcribe audio (Whisper) — Onda 2
  async transcribeAudio(base64: string, mime: string, filename: string): Promise<{ text: string }> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/agents/james/transcribe`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({ audio: base64, mime, filename }),
      },
    )
    const data = await res.json().catch(() => ({ error: 'Falha ao transcrever áudio.' }))
    if (!res.ok) {
      throw new Error(data.error || 'Não consegui entender o áudio.')
    }
    return { text: data.text || '' }
  },

  // ----------------------------------------------------------------
  // Onda 1 — Reports: bulk transactions, accounts, users
  // ----------------------------------------------------------------
  async getAllTransactions(): Promise<Transaction[]> {
    return await pb.collection('transactions').getFullList<Transaction>({ sort: '-date' })
  },

  async getAllAccounts(): Promise<BankAccount[]> {
    return await pb.collection('bank_accounts').getFullList<BankAccount>({ sort: 'name' })
  },

  async getFamilyUsers(): Promise<AppUser[]> {
    return await pb.collection('users').getFullList<AppUser>({ sort: 'name' })
  },

  // ----------------------------------------------------------------
  // Onda 3 — Registers CRUD
  // ----------------------------------------------------------------
  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return await pb.collection('suppliers').getFullList<Supplier>({ sort: 'name' })
  },
  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    return await pb.collection('suppliers').create<Supplier>({
      ...data,
      user: pb.authStore.record?.id,
    })
  },
  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    return await pb.collection('suppliers').update<Supplier>(id, data)
  },
  async deleteSupplier(id: string): Promise<boolean> {
    return await pb.collection('suppliers').delete(id)
  },

  // Budgets
  async getBudgets(): Promise<Budget[]> {
    return await pb.collection('budgets').getFullList<Budget>({ sort: 'category' })
  },
  async createBudget(data: Partial<Budget>): Promise<Budget> {
    return await pb.collection('budgets').create<Budget>({
      ...data,
      user: pb.authStore.record?.id,
    })
  },
  async updateBudget(id: string, data: Partial<Budget>): Promise<Budget> {
    return await pb.collection('budgets').update<Budget>(id, data)
  },
  async deleteBudget(id: string): Promise<boolean> {
    return await pb.collection('budgets').delete(id)
  },

  // Family members
  async getFamilyMembers(): Promise<FamilyMember[]> {
    return await pb.collection('family_members').getFullList<FamilyMember>({ sort: 'name' })
  },
  async createFamilyMember(data: Partial<FamilyMember>): Promise<FamilyMember> {
    return await pb.collection('family_members').create<FamilyMember>({
      ...data,
      user: pb.authStore.record?.id,
    })
  },
  async updateFamilyMember(id: string, data: Partial<FamilyMember>): Promise<FamilyMember> {
    return await pb.collection('family_members').update<FamilyMember>(id, data)
  },
  async deleteFamilyMember(id: string): Promise<boolean> {
    return await pb.collection('family_members').delete(id)
  },

  // ----------------------------------------------------------------
  // Onda 4 — Gratidão Financeira + Importações de documentos
  // ----------------------------------------------------------------
  // Gratitude Journal
  async getGratitudeEntries(limit = 100): Promise<GratitudeJournalEntry[]> {
    return (
      await pb.collection('gratitude_journal').getList<GratitudeJournalEntry>(1, limit, {
        sort: '-created_at',
      })
    ).items
  },

  async createGratitudeEntry(entry: string, date?: string): Promise<GratitudeJournalEntry> {
    return await pb.collection('gratitude_journal').create<GratitudeJournalEntry>({
      entry,
      created_at: date || new Date().toISOString(),
      user: pb.authStore.record?.id,
    })
  },

  async deleteGratitudeEntry(id: string): Promise<boolean> {
    return await pb.collection('gratitude_journal').delete(id)
  },

  // Document Imports
  async getDocumentImports(limit = 100): Promise<DocumentImport[]> {
    return (
      await pb.collection('document_imports').getList<DocumentImport>(1, limit, {
        sort: '-created',
      })
    ).items
  },

  async createDocumentImport(data: Partial<DocumentImport>): Promise<DocumentImport> {
    return await pb.collection('document_imports').create<DocumentImport>({
      ...data,
      user: pb.authStore.record?.id,
    })
  },

  async updateDocumentImport(id: string, data: Partial<DocumentImport>): Promise<DocumentImport> {
    return await pb.collection('document_imports').update<DocumentImport>(id, data)
  },

  async deleteDocumentImport(id: string): Promise<boolean> {
    return await pb.collection('document_imports').delete(id)
  },
}
