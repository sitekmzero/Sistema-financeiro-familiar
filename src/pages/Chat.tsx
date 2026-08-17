import React, { useState, useEffect, useRef } from 'react'
import { financeService } from '@/services/financeService'
import { useRealtime } from '@/hooks/use-realtime'
import type { ChatMessage } from '@/types/finance'
import {
  Sparkles,
  Send,
  Paperclip,
  CheckCheck,
  Bot,
  User,
  Zap,
  ShieldCheck,
  CreditCard,
  FileBarChart,
  DollarSign,
  Quote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

const COMMAND_CHIPS = [
  { label: '/resumo', desc: 'Consolidado familiar completo' },
  { label: '/retirada', desc: 'Motor de Pró-labore necessário' },
  { label: '/gabriel', desc: 'Resumo de gastos do filho Gabriel' },
  { label: 'Quanto gastei com Facebook Ads', desc: 'Consulta marketing Transluga' },
  { label: 'Quanto custa o Jaguar por mês', desc: 'Custo mensal do veículo Jaguar' },
]

export default function Chat() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadMessages = async () => {
    try {
      const list = await financeService.getChatMessages(100)
      setMessages(list)
    } catch (err) {
      console.error('Failed to load chat messages:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [])

  useRealtime('chat_messages', () => {
    financeService.getChatMessages(100).then(setMessages)
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim()
    if (!text || isTyping) return

    setInputValue('')
    setIsTyping(true)

    const isCommand = text.startsWith('/')
    const cmd = isCommand ? text.split(' ')[0] : undefined

    // Optimistic local add of user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      command: cmd,
      user: '',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const res = await financeService.sendChatMessage(text, cmd)
      // Realtime will reload or we can append
      const tempAgentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: res.content,
        user: '',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        tempUserMsg,
        tempAgentMsg,
      ])
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar mensagem',
        description: err.message || 'Não foi possível contatar o James no momento.',
        variant: 'destructive',
      })
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[850px] bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-fade-in-up">
      {/* WhatsApp Header */}
      <div className="bg-[#1E293B] border-b border-slate-800 px-4 py-3 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-amber-500 p-0.5 flex items-center justify-center shadow-md">
              <div className="w-full h-full bg-[#111827] rounded-full flex items-center justify-center font-bold font-heading text-emerald-400 text-base">
                £
              </div>
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#1E293B] rounded-full" />
          </div>

          <div>
            <div className="font-heading font-bold text-sm sm:text-base text-slate-100 flex items-center gap-1.5">
              James · Consultor Financeiro
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online 24h · Abraham Hicks & Bachar
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSendMessage('/dica')}
            className="text-amber-400 hover:bg-slate-800 text-xs hidden sm:flex items-center gap-1"
          >
            <Quote className="w-3.5 h-3.5" /> Dica Rápida
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSendMessage('/resumo')}
            className="text-emerald-400 hover:bg-slate-800 text-xs hidden sm:flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" /> Resumo
          </Button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#0B1120]/60">
        {messages.map((msg) => {
          const isUser = msg.role === 'user'

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center text-slate-950 font-bold text-xs shrink-0 shadow">
                  £
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs sm:text-sm relative leading-relaxed shadow-md ${
                  isUser
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-slate-50 rounded-br-xs'
                    : 'bg-[#1E293B] border border-slate-700/80 text-slate-100 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-line break-words">{msg.content}</div>

                <div
                  className={`text-[10px] flex items-center justify-end gap-1 mt-1.5 ${
                    isUser ? 'text-emerald-200/80' : 'text-slate-400'
                  }`}
                >
                  {msg.created
                    ? new Date(msg.created).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                  {isUser && <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />}
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs shrink-0">
              £
            </div>
            <div className="bg-[#1E293B] border border-slate-800 p-3 rounded-2xl rounded-bl-xs flex items-center gap-1.5 text-xs text-slate-400">
              <span
                className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
              <span className="ml-1 text-[11px]">James está digitando…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp Command Shortcuts Toolbar */}
      <div className="px-3 py-2 bg-[#1E293B]/80 border-t border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" /> Atalhos:
        </span>
        {COMMAND_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => handleSendMessage(chip.label)}
            className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-500/40 text-emerald-400 text-[11px] font-mono shrink-0 transition"
            title={chip.desc}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 bg-[#1E293B] border-t border-slate-800 flex items-center gap-2 shrink-0">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => navigate('/documentos')}
          title="Anexar Extrato Bancário em PDF"
          className="text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl shrink-0"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <Input
          placeholder="Digite sua mensagem ou comando (ex: /resumo, 'registre R$ 120 em alimentação')..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
          className="flex-1 bg-[#0B1120] border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm h-11 focus:border-emerald-500 rounded-xl"
        />

        <Button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={isTyping || !inputValue.trim()}
          className="h-11 w-11 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shrink-0 flex items-center justify-center shadow-lg shadow-emerald-500/20"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
