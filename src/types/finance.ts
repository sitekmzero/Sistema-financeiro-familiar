export interface BankAccount {
  id: string
  name: string
  bank_name?: string
  balance: number
  color?: string
  user: string
  created: string
  updated: string
}

export interface Transaction {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category:
    | 'Alimentação'
    | 'Transporte'
    | 'Moradia'
    | 'Saúde'
    | 'Lazer'
    | 'Educação'
    | 'Assinaturas'
    | 'Renda'
    | 'Outros'
  date: string
  account?: string
  source?: 'manual' | 'pdf' | 'whatsapp' | 'agent'
  user: string
  created: string
  updated: string
}

export interface Debt {
  id: string
  name: string
  creditor?: string
  total_amount: number
  remaining_amount: number
  interest_rate?: number
  monthly_payment?: number
  due_date?: string
  status?: 'em_dia' | 'atrasada' | 'paga'
  strategy?: 'snowball' | 'avalanche'
  user: string
  created: string
  updated: string
}

export interface DebtPayment {
  id: string
  debt: string
  amount: number
  date?: string
  note?: string
  user: string
  created: string
  updated: string
}

export interface ReserveGoal {
  id: string
  title: string
  target_amount: number
  monthly_contribution?: number
  deadline?: string
  user: string
  created: string
  updated: string
}

export interface ReserveContribution {
  id: string
  goal: string
  amount: number
  date?: string
  user: string
  created: string
  updated: string
}

export interface TripChecklistItem {
  id: string
  task: string
  done: boolean
}

export interface Trip {
  id: string
  destination: string
  start_date?: string
  end_date?: string
  budget: number
  saved_amount?: number
  status?: 'planejando' | 'reservado' | 'finalizada'
  checklist?: TripChecklistItem[]
  user: string
  created: string
  updated: string
}

export interface TripItem {
  id: string
  trip: string
  description?: string
  category: 'transporte' | 'hospedagem' | 'alimentacao' | 'passeios' | 'extras'
  amount?: number
  user: string
  created: string
  updated: string
}

export interface DocumentItem {
  id: string
  filename?: string
  file?: string
  status?: 'parsing' | 'review' | 'imported' | 'failed'
  parsed_text?: string
  import_data?: Array<{
    description: string
    amount: number
    type: 'income' | 'expense'
    category: string
    date: string
  }>
  user: string
  created: string
  updated: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  command?: string
  user: string
  created: string
  updated: string
}

export interface WeeklyReport {
  id: string
  week_start?: string
  week_end?: string
  total_income: number
  total_expense: number
  net: number
  insight?: string
  tip?: string
  user: string
  created: string
  updated: string
}

export interface MentorQuote {
  quote: string
  author: 'Abraham Hicks' | 'Bachar'
  theme: string
}

// ----------------------------------------------------------------
// Onda 3 — Cadastros integrados
// ----------------------------------------------------------------

export interface Supplier {
  id: string
  name: string
  cnpj?: string
  category?: string
  recurrence?: 'Mensal' | 'Semanal' | 'Esporádico' | 'Anual'
  payment_method?: string
  notes?: string
  user: string
  created: string
  updated: string
}

export interface Budget {
  id: string
  category: string
  monthly_limit: number
  month?: string
  alert_threshold?: number
  user: string
  created: string
  updated: string
}

export interface FamilyMember {
  id: string
  name: string
  email?: string
  role?: 'Titular' | 'Cônjuge' | 'Filho(a)'
  monthly_allowance?: number
  card_number?: string
  user: string
  created: string
  updated: string
}

export interface AppUser {
  id: string
  name?: string
  email?: string
  role?: 'admin' | 'member'
}
