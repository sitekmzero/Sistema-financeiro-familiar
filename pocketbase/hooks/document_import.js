// Backend Hook: document_import.js
// Router POST /backend/v1/documents/import
//
// Pipeline completo de importação de extrato (Onda 4):
//   1. Anti-duplicata: data + valor + descrição similar (Levenshtein > 85%) ou
//      import_hash idêntico → transação é pulada e contabilizada como duplicata.
//   2. Categorização automática: busca descrição nos aliases dos suppliers do
//      usuário; se encontrar herda a categoria do fornecedor. Senão tenta
//      keyword matching. Senão marca status = "review".
//   3. Cria registros em transactions (com source_document, original_description,
//      account, supplier, import_hash).
//   4. Cria/atualiza document_imports com todos os contadores.
//   5. Retorna resumo: encontradas, importadas, duplicadas, pendentes.
routerAdd(
  'POST',
  '/backend/v1/documents/import',
  (e) => {
    try {
      const userId = e.auth && e.auth.id
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária.')
      }

      const body = e.requestInfo().body || {}
      const documentId = body.document_id || ''
      const bankAccountId = body.bank_account || ''
      const fileName = body.file_name || (documentId ? 'extrato.pdf' : 'extrato.pdf')
      const source = body.source || 'bank_statement'
      const periodStart = body.period_start || ''
      const periodEnd = body.period_end || ''
      const finalBalance = body.final_balance
      const transactionsToImport = body.transactions || []

      if (!transactionsToImport.length) {
        return e.badRequestError('Nenhuma transação para importar.')
      }

      // ---- helpers inline (escopo do callback, conforme exigido pelo JSVM) ----
      const levenshtein = function (a, b) {
        const m = a.length
        const n = b.length
        if (m === 0) return n
        if (n === 0) return m
        let prev = []
        let curr = []
        for (let j = 0; j <= n; j++) prev[j] = j
        for (let i = 1; i <= m; i++) {
          curr[0] = i
          for (let j = 1; j <= n; j++) {
            const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
            const del = prev[j] + 1
            const ins = curr[j - 1] + 1
            const sub = prev[j - 1] + cost
            curr[j] = del < ins ? (del < sub ? del : sub) : ins < sub ? ins : sub
          }
          const tmp = prev
          prev = curr
          curr = tmp
        }
        return prev[n]
      }

      const similarity = function (a, b) {
        const A = (a || '').toLowerCase().trim()
        const B = (b || '').toLowerCase().trim()
        if (!A || !B) return 0
        if (A === B) return 1
        const maxLen = A.length > B.length ? A.length : B.length
        const dist = levenshtein(A, B)
        return 1 - dist / maxLen
      }

      const norm = function (s) {
        return (s || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9 ]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      }

      const normDesc = function (s) {
        const n = norm(s)
        // remove prefixos padrão do C6
        return n
          .replace(/^pix (recebido de|enviado para|enviado de|recebido para)\s+/i, '')
          .replace(/^recorrencia pix enviada para\s+/i, '')
          .replace(/^pix /i, '')
          .trim()
      }

      const hash = function (s) {
        return $security.sha256(s)
      }

      // mapeia categoria do supplier (domínio suppliers) → categoria de transação
      const TX_CATEGORIES = [
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
      const mapSupplierCategory = function (cat) {
        if (!cat) return 'Outros'
        const c = cat.toLowerCase()
        if (c === 'veículo' || c === 'transporte') return 'Transporte'
        if (c === 'alimentação') return 'Alimentação'
        if (c === 'saúde') return 'Saúde'
        if (c === 'moradia') return 'Moradia'
        if (c === 'assinaturas') return 'Assinaturas'
        if (c === 'tecnologia') return 'Outros'
        if (c === 'business') return 'Outros'
        if (c === 'lazer') return 'Lazer'
        if (c === 'educação') return 'Educação'
        if (c === 'pet') return 'Outros'
        if (c === 'vestuário') return 'Outros'
        if (c === 'seguros') return 'Moradia'
        return 'Outros'
      }

      // keyword matching para categorização
      const KEYWORD_CATEGORIES = [
        {
          cat: 'Alimentação',
          words: [
            'ifood',
            'quitandas',
            'vovo tuta',
            'mercado',
            'supermercado',
            'padaria',
            'restaurante',
            'lanche',
            'pizzaria',
            'senhor parmesana',
            'senhor parmeggiana',
          ],
        },
        {
          cat: 'Transporte',
          words: [
            'posto',
            'shell',
            'ipiranga',
            'petrobras',
            'br',
            'estacionamento',
            'multiplan estacionamento',
            'uber',
            '99',
            'carro e cia',
            'combustivel',
            'abastece',
          ],
        },
        {
          cat: 'Saúde',
          words: [
            'farmacia',
            'drogasil',
            'drogaria',
            'pague menos',
            'consultorio',
            'dentista',
            'medico',
            'clinica',
            'laboratorio',
            'miss hanna',
          ],
        },
        {
          cat: 'Moradia',
          words: [
            'aluguel',
            'condominio',
            'iptu',
            'energia',
            'cpfl',
            'agua',
            'sabesp',
            'gas',
            'comgas',
            'internet',
            'net',
            'vivo',
            'claro',
            'seguro',
            'allianz',
            'portoseg',
            'porto seg',
            'consorcio',
            'financiamento',
            'portoseg',
          ],
        },
        {
          cat: 'Assinaturas',
          words: [
            'netflix',
            'spotify',
            'prime video',
            'amazon',
            'globoplay',
            'hbo',
            'disney',
            'youtube',
            'google',
            'apple',
            'icloud',
            'microsoft',
            'office',
            'chatgpt',
            'openai',
            'adobe',
            'canva',
          ],
        },
        {
          cat: 'Educação',
          words: ['escola', 'colegio', 'curso', 'udemy', 'alura', 'faculdade', 'aluno'],
        },
        {
          cat: 'Lazer',
          words: [
            'cinema',
            'teatro',
            'viagem',
            'hotel',
            'airbnb',
            'parque',
            'show',
            'ingresso',
            'multiplan',
          ],
        },
        {
          cat: 'Renda',
          words: [
            'resgate de cdb',
            'salario',
            'pro labore',
            'prolabore',
            'rendimento',
            'juros',
            'dividendo',
            'cashback',
            'credito boleto',
            'transluga',
            'km zero',
            'quilocentro zero',
            'quilometro zero',
          ],
        },
      ]

      const keywordCategory = function (desc) {
        const d = normDesc(desc)
        for (let i = 0; i < KEYWORD_CATEGORIES.length; i++) {
          const group = KEYWORD_CATEGORIES[i]
          for (let w = 0; w < group.words.length; w++) {
            if (d.indexOf(norm(group.words[w])) !== -1) return group.cat
          }
        }
        return ''
      }

      // ---- carrega suppliers do usuário para matching ----
      let suppliers = []
      try {
        suppliers = $app.findRecordsByFilter('suppliers', 'user = {:uid}', 'name', 500, 0, {
          uid: userId,
        })
      } catch (_) {
        suppliers = []
      }

      const matchSupplier = function (desc) {
        const d = normDesc(desc)
        if (!d) return null
        for (let i = 0; i < suppliers.length; i++) {
          const s = suppliers[i]
          const name = norm(s.getString('name'))
          if (!name) continue
          if (d.indexOf(name) !== -1 || name.indexOf(d) !== -1) {
            return s
          }
          let aliases = []
          try {
            aliases = JSON.parse(s.getString('aliases') || '[]')
          } catch (_) {
            aliases = []
          }
          for (let j = 0; j < aliases.length; j++) {
            const al = norm(aliases[j])
            if (!al) continue
            if (d.indexOf(al) !== -1 || al.indexOf(d) !== -1) return s
          }
        }
        // fuzzy: melhor similaridade ≥ 0.85
        let best = null
        let bestSim = 0.85
        for (let i = 0; i < suppliers.length; i++) {
          const s = suppliers[i]
          const name = norm(s.getString('name'))
          if (!name) continue
          const sim = similarity(d, name)
          if (sim > bestSim) {
            bestSim = sim
            best = s
          }
        }
        return best
      }

      // ---- carrega transações existentes do usuário (para anti-duplicata) ----
      let existingTx = []
      try {
        existingTx = $app.findRecordsByFilter('transactions', 'user = {:uid}', '-date', 2000, 0, {
          uid: userId,
        })
      } catch (_) {
        existingTx = []
      }

      const isDuplicate = function (date, amount, desc) {
        const nd = normDesc(desc)
        const amt = Math.abs(amount)
        for (let i = 0; i < existingTx.length; i++) {
          const t = existingTx[i]
          if (t.getString('date').indexOf(date.slice(0, 10)) === -1) continue
          const tAmt = Math.abs(t.getFloat('amount') || 0)
          if (Math.abs(tAmt - amt) > 0.02) continue
          const tDesc = normDesc(t.getString('original_description') || t.getString('description'))
          if (!tDesc) continue
          if (similarity(nd, tDesc) > 0.85) return true
        }
        return false
      }

      const txCol = $app.findCollectionByNameOrId('transactions')
      const diCol = $app.findCollectionByNameOrId('document_imports')

      // ---- cria/atualiza document_imports ----
      let importRecord = null
      if (body.document_import_id) {
        try {
          importRecord = $app.findRecordById('document_imports', body.document_import_id)
        } catch (_) {
          importRecord = null
        }
      }
      if (!importRecord) {
        importRecord = new Record(diCol)
        importRecord.set('user', userId)
        importRecord.set('file_name', fileName)
        importRecord.set('file_type', 'pdf')
        importRecord.set('source', source)
        if (bankAccountId) importRecord.set('bank_account', bankAccountId)
        importRecord.set('status', 'processing')
        importRecord.set('transactions_found', transactionsToImport.length)
        $app.save(importRecord)
      }

      // ---- processa cada transação ----
      let imported = 0
      let duplicated = 0
      let pending = 0
      const importedIds = []

      for (let i = 0; i < transactionsToImport.length; i++) {
        const item = transactionsToImport[i]
        if (!item.description || item.amount === undefined || item.amount === null) continue

        const amount = Math.abs(parseFloat(item.amount) || 0)
        const desc = String(item.description).trim()
        const originalDesc = String(item.original_description || desc).trim()
        const dateStr = item.date
          ? String(item.date).indexOf('T') !== -1
            ? String(item.date)
            : String(item.date) + ' 12:00:00.000Z'
          : new Date().toISOString()
        const dateOnly = dateStr.slice(0, 10)
        const type = item.type === 'income' ? 'income' : 'expense'

        const h = hash(
          dateOnly + '|' + amount.toFixed(2) + '|' + normDesc(originalDesc).slice(0, 80),
        )

        // anti-duplicata
        if (isDuplicate(dateOnly, amount, originalDesc)) {
          duplicated++
          continue
        }

        // categorização
        let category = 'Outros'
        let supplierId = ''
        let status = 'review'

        const matched = matchSupplier(originalDesc)
        if (matched) {
          category = mapSupplierCategory(matched.getString('category'))
          supplierId = matched.getId()
          status = 'categorized'
        } else {
          const kw = keywordCategory(originalDesc)
          if (kw) {
            category = kw
            status = 'categorized'
          }
        }

        // Renda: entradas sem supplier recebem categoria Renda
        if (status === 'review' && type === 'income') {
          category = 'Renda'
          status = 'categorized'
        }

        if (status === 'review') pending++

        const tx = new Record(txCol)
        tx.set('description', desc)
        tx.set('amount', amount)
        tx.set('type', type)
        tx.set('category', TX_CATEGORIES.indexOf(category) !== -1 ? category : 'Outros')
        tx.set('date', dateStr)
        if (bankAccountId) tx.set('account', bankAccountId)
        tx.set('source', 'pdf')
        tx.set('user', userId)
        tx.set('original_description', originalDesc)
        tx.set('source_document', fileName)
        tx.set('status', status)
        tx.set('import_hash', h)
        if (supplierId) tx.set('supplier', supplierId)
        $app.save(tx)

        importedIds.push(tx.getId())
        existingTx.push(tx) // evita duplicar dentro do mesmo lote
        imported++
      }

      // ---- atualiza document_imports ----
      importRecord.set('transactions_found', transactionsToImport.length)
      importRecord.set('transactions_imported', imported)
      importRecord.set('transactions_duplicated', duplicated)
      importRecord.set('transactions_pending', pending)
      importRecord.set('status', pending > 0 ? 'review' : 'imported')
      if (periodStart) importRecord.set('period_start', periodStart + ' 12:00:00.000Z')
      if (periodEnd) importRecord.set('period_end', periodEnd + ' 12:00:00.000Z')
      if (finalBalance !== undefined && finalBalance !== null) {
        importRecord.set('bank_balance', parseFloat(finalBalance) || 0)
      }
      try {
        importRecord.set(
          'raw_data',
          JSON.stringify({
            transactions: transactionsToImport,
            imported_ids: importedIds,
            period_start: periodStart,
            period_end: periodEnd,
            final_balance: finalBalance,
          }),
        )
      } catch (_) {}
      $app.save(importRecord)

      // ---- marca documento original como importado ----
      if (documentId) {
        try {
          const doc = $app.findRecordById('documents', documentId)
          if (doc.getString('user') === userId) {
            doc.set('status', 'imported')
            $app.save(doc)
          }
        } catch (_) {}
      }

      return e.json(200, {
        success: true,
        document_import_id: importRecord.getId(),
        transactions_found: transactionsToImport.length,
        transactions_imported: imported,
        transactions_duplicated: duplicated,
        transactions_pending: pending,
        message:
          imported + ' importadas, ' + duplicated + ' duplicadas, ' + pending + ' para revisão.',
      })
    } catch (err) {
      console.log('Error in document_import hook:', err)
      return e.json(500, { error: 'Erro ao importar transações do documento.' })
    }
  },
  $apis.requireAuth(),
)
