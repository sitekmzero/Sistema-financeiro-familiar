import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Sparkles, ArrowRight, ShieldCheck, Lock, Mail, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('A senha deve conter no mínimo 8 caracteres.')
      return
    }
    setLoading(true)
    try {
      await signup(email, password, name)
      navigate('/')
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta. Verifique os dados inseridos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0B1120] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-fade-in-up">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-500 text-slate-950 font-bold font-heading text-3xl shadow-xl shadow-emerald-500/20 mb-3">
            £
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-100 tracking-tight">
            Vida Financeira
          </h1>
          <p className="text-sm text-slate-400 mt-1 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Comece a organizar suas finanças com o James
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111827]/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6">
            <h2 className="text-lg font-heading font-semibold text-slate-100">Criar Nova Conta</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Leva menos de 1 minuto para dar o primeiro passo.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="name"
                className="text-xs font-medium text-slate-300 flex items-center gap-1"
              >
                <User className="w-3.5 h-3.5 text-slate-400" /> Nome Completo
              </Label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Adriana Araújo"
                className="bg-[#1E293B] border-slate-700 text-slate-100 focus:border-emerald-500 focus:ring-emerald-500/20 h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-slate-300 flex items-center gap-1"
              >
                <Mail className="w-3.5 h-3.5 text-slate-400" /> E-mail
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="bg-[#1E293B] border-slate-700 text-slate-100 focus:border-emerald-500 focus:ring-emerald-500/20 h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-slate-300 flex items-center gap-1"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" /> Senha (mínimo 8 caracteres)
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-[#1E293B] border-slate-700 text-slate-100 focus:border-emerald-500 focus:ring-emerald-500/20 h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-semibold shadow-lg shadow-emerald-500/25 transition-all text-sm mt-2"
            >
              {loading ? 'Criando conta...' : 'Cadastrar e Começar'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Já possui uma conta?{' '}
            <Link to="/login" className="text-emerald-400 hover:underline font-medium">
              Fazer login
            </Link>
          </div>
        </div>

        {/* Security */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Privacidade total · Apenas você acessa seus dados</span>
        </div>
      </div>
    </div>
  )
}
