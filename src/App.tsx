import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'

// Pages
import Index from '@/pages/Index'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Transactions from '@/pages/Transactions'
import Debts from '@/pages/Debts'
import Reserve from '@/pages/Reserve'
import Trips from '@/pages/Trips'
import Reports from '@/pages/Reports'
import Documents from '@/pages/Documents'
import Chat from '@/pages/Chat'
import NotFound from '@/pages/NotFound'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center text-emerald-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400">Carregando Vida Financeira...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Signup />} />

        {/* Protected Application Routes with Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Index />} />
          <Route path="transacoes" element={<Transactions />} />
          <Route path="dividas" element={<Debts />} />
          <Route path="reserva" element={<Reserve />} />
          <Route path="viagens" element={<Trips />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="documentos" element={<Documents />} />
          <Route path="chat" element={<Chat />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
