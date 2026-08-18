import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { MENTOR_QUOTES } from '@/lib/quotes'
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  ShieldCheck,
  Plane,
  FileBarChart,
  FileText,
  Settings,
  MessageSquare,
  Bell,
  LogOut,
  Menu,
  X,
  Sparkles,
  Quote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navItems = [
  { path: '/', label: 'Visão Geral', icon: LayoutDashboard },
  { path: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
  { path: '/dividas', label: 'Dívidas', icon: CreditCard },
  { path: '/reserva', label: 'Reserva', icon: ShieldCheck },
  { path: '/viagens', label: 'Viagens', icon: Plane },
  { path: '/relatorios', label: 'Relatórios', icon: FileBarChart },
  { path: '/cadastros', label: 'Cadastros', icon: Settings },
  { path: '/documentos', label: 'Documentos', icon: FileText },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [quoteIndex, setQuoteIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % MENTOR_QUOTES.length)
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  const currentQuote = MENTOR_QUOTES[quoteIndex]

  const getInitials = (name?: string) => {
    if (!name) return 'VF'
    const parts = name.split(' ')
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase()
  }

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/':
        return 'Visão Geral & Foco Estratégico'
      case '/transacoes':
        return 'Extrato de Transações'
      case '/dividas':
        return 'Gestão & Quitação de Dívidas'
      case '/reserva':
        return 'Reserva de Emergência Familiar'
      case '/viagens':
        return 'Planejamento de Férias & Viagens'
      case '/relatorios':
        return 'Relatórios Semanais & Insights'
      case '/cadastros':
        return 'Cadastros & Configurações'
      case '/documentos':
        return 'Extratos Bancários & Leitura PDF'
      case '/chat':
        return 'Consultor James — 24h Online'
      default:
        return 'Vida Financeira'
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-[#111827] border-r border-slate-800 shrink-0 sticky top-0 h-screen z-40 justify-between p-4 overflow-y-auto">
        <div className="space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-heading font-bold text-slate-950 text-xl">
              £
            </div>
            <div>
              <span className="font-heading font-bold text-lg text-slate-100 tracking-tight block">
                Vida Financeira
              </span>
              <span className="text-xs text-amber-400 font-medium tracking-wide flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Foco & Abundância
              </span>
            </div>
          </div>

          {/* CTA Falar com James */}
          <NavLink
            to="/chat"
            className={({ isActive }) =>
              `flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-semibold shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400'
                  : 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-400'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Falar com James</div>
                <div className="text-[11px] opacity-80">Mentor 24h · Leis Universais</div>
              </div>
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </NavLink>

          {/* Nav List */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Mentor Quote & User Profile Card */}
        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          {/* Rotating Quote */}
          <div className="bg-gradient-to-br from-amber-950/20 to-slate-900/60 border border-amber-500/20 rounded-xl p-3 relative overflow-hidden group">
            <Quote className="w-6 h-6 text-amber-500/20 absolute -right-1 -bottom-1 rotate-12" />
            <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {currentQuote.author}
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed line-clamp-3">
              "{currentQuote.quote}"
            </p>
          </div>

          {/* User & Logout */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Avatar className="h-8 w-8 bg-emerald-600 text-slate-900 font-bold border border-emerald-400">
                <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
              <div className="truncate">
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {user?.name || 'Família'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Sair"
              className="text-slate-400 hover:text-rose-400 hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-semibold text-base sm:text-lg text-slate-100">
                {getPageTitle(location.pathname)}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-slate-300 hover:bg-slate-800 rounded-xl"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-72 bg-[#111827] border-slate-800 text-slate-200"
              >
                <DropdownMenuLabel className="font-heading text-xs text-amber-400 uppercase tracking-wider">
                  Notificações do James
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-slate-800 flex flex-col items-start gap-1 p-3"
                  onClick={() => navigate('/dividas')}
                >
                  <span className="text-xs font-semibold text-emerald-400">Dívida a Vencer</span>
                  <span className="text-xs text-slate-300">
                    Cartão de Crédito Nubank vence em 8 dias.
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-slate-800 flex flex-col items-start gap-1 p-3"
                  onClick={() => navigate('/relatorios')}
                >
                  <span className="text-xs font-semibold text-amber-400">
                    Novo Relatório Semanal
                  </span>
                  <span className="text-xs text-slate-300">
                    James preparou seu insight com dicas dos mentores.
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-emerald-500/50 transition">
                  <Avatar className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 font-bold">
                    <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#111827] border-slate-800 text-slate-200"
              >
                <DropdownMenuLabel>
                  <div className="font-semibold text-sm">{user?.name || 'Adriana Araújo'}</div>
                  <div className="text-xs text-slate-400 truncate">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem onClick={() => navigate('/chat')} className="cursor-pointer">
                  <MessageSquare className="w-4 h-4 mr-2 text-emerald-400" /> Consultor James
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/documentos')}
                  className="cursor-pointer"
                >
                  <FileText className="w-4 h-4 mr-2 text-amber-400" /> Importar PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-rose-400 focus:text-rose-400 focus:bg-rose-950/40"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Encerrar Sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer (0-1023px) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#111827] border-r border-slate-800 h-full p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center font-bold text-slate-950">
                    £
                  </div>
                  <span className="font-heading font-bold text-base text-slate-100">
                    Vida Financeira
                  </span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <NavLink
                to="/chat"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-semibold"
              >
                <MessageSquare className="w-5 h-5" />
                <div>
                  <div className="text-sm">Falar com James</div>
                  <div className="text-[10px] opacity-80">Mentor 24h Online</div>
                </div>
              </NavLink>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </NavLink>
                  )
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start text-rose-400 border-rose-900/40 hover:bg-rose-950/30"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation (0-1023px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111827]/95 backdrop-blur-lg border-t border-slate-800 px-3 py-2 flex items-center justify-around">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Início</span>
        </NavLink>

        <NavLink
          to="/transacoes"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`
          }
        >
          <ArrowLeftRight className="w-5 h-5" />
          <span>Extrato</span>
        </NavLink>

        {/* Central Floating James Button */}
        <NavLink to="/chat" className="relative -top-5 flex flex-col items-center group">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-amber-500 p-0.5 shadow-lg shadow-emerald-500/30 transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-[#111827] rounded-full flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>
          <span className="text-[10px] text-amber-400 font-bold mt-0.5">James</span>
        </NavLink>

        <NavLink
          to="/dividas"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`
          }
        >
          <CreditCard className="w-5 h-5" />
          <span>Dívidas</span>
        </NavLink>

        <NavLink
          to="/viagens"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-medium transition ${
              isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`
          }
        >
          <Plane className="w-5 h-5" />
          <span>Viagens</span>
        </NavLink>
      </div>
    </div>
  )
}
