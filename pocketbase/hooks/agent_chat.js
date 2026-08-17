// Backend Hook: agent_chat.js
// Router POST /backend/v1/agents/james/chat
routerAdd(
  'POST',
  '/backend/v1/agents/james/chat',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária.')
      }

      const body = e.requestInfo().body || {}
      const message = (body.message || '').trim()
      const command = (body.command || '').trim()

      if (!message && !command) {
        return e.badRequestError('Mensagem ou comando é obrigatório.')
      }

      const promptText = message || command

      // Call Skip Agent James
      const result = $ai.agent('james').chat({
        user_id: userId,
        conversation_id: body.conversation_id || null,
        message: promptText,
      })

      const replyContent = result.content || 'Olá! Como posso ajudar você hoje?'

      // Persist in chat_messages collection
      try {
        const chatCol = $app.findCollectionByNameOrId('chat_messages')

        const userMsg = new Record(chatCol)
        userMsg.set('role', 'user')
        userMsg.set('content', promptText)
        if (command) userMsg.set('command', command)
        userMsg.set('user', userId)
        $app.save(userMsg)

        const agentMsg = new Record(chatCol)
        agentMsg.set('role', 'agent')
        agentMsg.set('content', replyContent)
        agentMsg.set('user', userId)
        $app.save(agentMsg)
      } catch (saveErr) {
        console.log('Error persisting chat messages:', saveErr)
      }

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: replyContent,
        citations: result.citations || [],
        message_id: result.message_id || '',
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'Serviço de IA temporariamente indisponível.' })
      }
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha no agente consultor James.' : err.message,
        })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, {
          error: status >= 500 ? 'IA temporariamente indisponível.' : err.message,
        })
      }
      console.log('Unexpected error in agent_chat:', err)
      return e.json(500, { error: 'Erro interno no processamento da mensagem.' })
    }
  },
  $apis.requireAuth(),
)
