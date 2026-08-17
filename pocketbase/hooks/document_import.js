// Backend Hook: document_import.js
// Router POST /backend/v1/documents/import
routerAdd(
  'POST',
  '/backend/v1/documents/import',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária.')
      }

      const body = e.requestInfo().body || {}
      const documentId = body.document_id
      const transactionsToImport = body.transactions || []

      if (!documentId) {
        return e.badRequestError('ID do documento é obrigatório.')
      }

      const doc = $app.findRecordById('documents', documentId)
      if (doc.getString('user') !== userId) {
        return e.forbiddenError('Acesso negado a este documento.')
      }

      const txCol = $app.findCollectionByNameOrId('transactions')
      let importedCount = 0

      for (const item of transactionsToImport) {
        if (!item.description || !item.amount) continue

        const tx = new Record(txCol)
        tx.set('description', item.description)
        tx.set('amount', Math.abs(parseFloat(item.amount) || 0))
        tx.set('type', item.type === 'income' ? 'income' : 'expense')

        const validCategories = [
          'Alimentação',
          'Transporte',
          'Moradia',
          'Saúde',
          'Lazer',
          'Educação',
          'Assinaturas',
          'Renda',
          'Outros',
        ]
        const cat = validCategories.includes(item.category) ? item.category : 'Outros'
        tx.set('category', cat)

        const txDate = item.date
          ? item.date.includes('T')
            ? item.date
            : item.date + ' 12:00:00.000Z'
          : new Date().toISOString()
        tx.set('date', txDate)
        if (item.account) tx.set('account', item.account)
        tx.set('source', 'pdf')
        tx.set('user', userId)

        $app.save(tx)
        importedCount++
      }

      // Update document status
      doc.set('status', 'imported')
      $app.save(doc)

      return e.json(200, {
        success: true,
        imported_count: importedCount,
        message: importedCount + ' transações importadas com sucesso!',
      })
    } catch (err) {
      console.log('Error in document_import hook:', err)
      return e.json(500, { error: 'Erro ao importar transações do documento.' })
    }
  },
  $apis.requireAuth(),
)
