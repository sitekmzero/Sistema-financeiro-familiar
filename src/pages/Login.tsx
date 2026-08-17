import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Sparkles, ArrowRight, ShieldCheck, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('adriana.araujo@kmzero.com.br')
  const [password, setPassword] = useState('Skip@Pass')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err?.message || 'E-mail ou senha inválidos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0B1120] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-fade-in-up">
        {/* Logo Card Top */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-500 text-slate-950 font-bold font-heading text-3xl shadow-xl shadow-emerald-500/20 mb-3">
            £
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-100 tracking-tight">
            Vida Financeira
          </h1>
          <p className="text-sm text-slate-400 mt-1 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Gestão Familiar & Consultoria com James
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#111827]/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6">
            <h2 className="text-lg font-heading font-semibold text-slate-100">
              Bem-vindo(a) de volta
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Acesse sua conta para gerenciar suas metas e falar com James.
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
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-medium text-slate-300 flex items-center gap-1"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Senha
                </Label>
                <span className="text-[11px] text-amber-400/80 hover:text-amber-400 cursor-pointer">
                  Esqueci minha senha
                </span>
              </div>
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
              {loading ? 'Entrando...' : 'Entrar na Plataforma'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Quick Demo Credentials note */}
          <div className="mt-5 p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-center">
            <div className="text-[11px] text-slate-400">
              Acesso padrão da família:{' '}
              <span className="text-emerald-400 font-mono font-medium">
                adriana.araujo@kmzero.com.br
              </span>{' '}
              / <span className="text-amber-400 font-mono font-medium">Skip@Pass</span>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            Não tem uma conta?{' '}
            <Link to="/cadastro" className="text-emerald-400 hover:underline font-medium">
              Criar conta agora
            </Link>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Ambiente seguro · Criptografia de ponta a ponta</span>
        </div>
      </div>
    </div>
  )
}
