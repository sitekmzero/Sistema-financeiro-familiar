export interface BankAccount {
  id: string
  name: string
  bank_name?: string
  balance: number
  color?: string
  account_type?: 'checking' | 'savings' | 'credit_card' | 'investment' | 'consortium'
  card_brand?: 'visa' | 'mastercard' | 'elo' | 'amex'
  card_last_four?: string
  additional_holders?: Array<{ name: string; last_four: string }>
  // Onda 5 — campos estendidos (migration 0014)
  bank?: string
  agency?: string
  account_number?: string
  overdraft_limit?: number
  interest_rate?: number
  savings_rate?: number
  credit_limit?: number
  card_holder_type?: 'titular' | 'adicional'
  card_holder?: string
  closing_day?: number
  due_day?: number
  investment_type?:
    | 'CDB'
    | 'Tesouro'
    | 'Ações'
    | 'FIIs'
    | 'LCI-LCA'
    | 'Previdência'
    | 'Fundos'
    | 'Poupança'
    | 'Cripto'
    | 'Outros'
  invested_amount?: number
  yield_description?: string
  yield_rate?: number
  liquidity?: 'Diária' | 'No vencimento' | 'D+30' | 'D+90' | 'Indefinida'
  maturity_date?: string
  indexer?: 'CDI' | 'IPCA' | 'Selic' | 'Prefixado' | 'IGP-M'
  consortium_admin?: string
  consortium_quota?: number
  consortium_credit?: number
  installments_paid?: number
  installments_total?: number
  status?: 'active' | 'inactive' | 'blocked'
  user: string
  created: string
  updated: string
}

export interface Bank {
  id: string
  name: string
  code: string
  ispb?: string
  logo_url?: string
  color?: string
  user?: string
  created: string
  updated: string
}

export interface Category {
  id: string
  name: string
  color?: string
  icon?: string
  is_default?: boolean
  user?: string
  created: string
  updated: string
}

export interface Transaction {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
  account?: string
  source?: 'manual' | 'pdf' | 'whatsapp' | 'agent'
  card_id?: string
  installment_current?: number
  installment_total?: number
  family_member?: string
  source_document?: string
  original_description?: string
  status?: 'review' | 'imported' | 'categorized'
  supplier?: string
  import_hash?: string
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
  aliases?: string[]
  auto_detect?: boolean
  user: string
  created: string
  updated: string
}

export interface GratitudeJournalEntry {
  id: string
  entry: string
  created_at: string
  user: string
  created: string
  updated: string
}

export interface DocumentImport {
  id: string
  file_name: string
  file_type?: 'pdf' | 'csv' | 'ofx' | 'jpg' | 'png'
  source?: 'bank_statement' | 'credit_card_bill' | 'consortium_statement' | 'receipt'
  bank_account?: string
  transactions_found?: number
  transactions_imported?: number
  transactions_pending?: number
  status?: 'processing' | 'review' | 'imported' | 'error'
  raw_data?: unknown
  transactions_duplicated?: number
  bank_balance?: number
  period_start?: string
  period_end?: string
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
