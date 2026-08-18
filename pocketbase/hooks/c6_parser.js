// Backend Hook: c6_parser.js
// Router POST /backend/v1/c6/parse
//
// Recebe o texto bruto extraído de um extrato C6 Bank (PDF) e devolve um array
// estruturado de transações [{ date, description, original_description, amount,
// type, type_keyword, balance }] além do saldo final e do período coberto.
//
// O PocketBase JSVM (goja) não roda módulos Node como pdf-parse, então a extração
// de texto do PDF acontece no cliente (pdf.js) e este hook faz o parsing do
// formato C6 propriamente dito.
routerAdd(
  'POST',
  '/backend/v1/c6/parse',
  (e) => {
    try {
      const userId = e.auth && e.auth.id
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária.')
      }

      const body = e.requestInfo().body || {}
      let text = (body.text || '').toString()

      // Permite reprocessar o texto já salvo em um documento.
      if (!text && body.document_id) {
        try {
          const doc = $app.findRecordById('documents', body.document_id)
          if (doc.getString('user') !== userId) {
            return e.forbiddenError('Acesso negado a este documento.')
          }
          text = doc.getString('parsed_text') || ''
        } catch (_) {
          return e.badRequestError('Documento não encontrado.')
        }
      }

      if (!text.trim()) {
        return e.badRequestError('Texto do extrato é obrigatório.')
      }

      // ---- helpers inline (escopo do callback, conforme exigido pelo JSVM) ----
      const parseBRL = function (s) {
        if (s === null || s === undefined) return null
        let str = String(s).trim().replace(/\s/g, '').replace(/^-/, '')
        str = str.replace(/^R\$/, '')
        if (!/^\d{1,3}(\.\d{3})*,\d{2}$/.test(str) && !/^\d+,\d{2}$/.test(str)) {
          return null
        }
        const parts = str.split(',')
        const intPart = parts[0].replace(/\./g, '')
        return parseFloat(intPart + '.' + parts[1])
      }

      const MONTHS = {
        janeiro: 1,
        fevereiro: 2,
        marco: 3,
        março: 3,
        abril: 4,
        maio: 5,
        junho: 6,
        julho: 7,
        agosto: 8,
        setembro: 9,
        outubro: 10,
        novembro: 11,
        dezembro: 12,
      }

      const pad = function (n) {
        return n < 10 ? '0' + n : '' + n
      }

      const parseMonthName = function (nm) {
        const key = nm
          .toLowerCase()
          .normalize('NFD')
          .replace(/[^a-z]/g, '')
        return MONTHS[key] || null
      }

      // ---- período & ano ----
      let periodYear = new Date().getFullYear()
      const periodMatch = text.match(
        /de\s+(\d{1,2})\s+de\s+([a-zA-ZçÇ]+)\s+de\s+(\d{4})\s+at[eé]\s+(\d{1,2})\s+de\s+([a-zA-ZçÇ]+)\s+de\s+(\d{4})/i,
      )
      let periodStart = ''
      let periodEnd = ''
      if (periodMatch) {
        const y1 = parseInt(periodMatch[3])
        const y2 = parseInt(periodMatch[6])
        periodYear = y2
        const m1 = parseMonthName(periodMatch[2])
        const m2 = parseMonthName(periodMatch[5])
        if (m1) periodStart = y1 + '-' + pad(m1) + '-' + pad(parseInt(periodMatch[1]))
        if (m2) periodEnd = y2 + '-' + pad(m2) + '-' + pad(parseInt(periodMatch[4]))
      } else {
        const ym = text.match(/at[eé]\s+\d{1,2}\s+de\s+[a-zA-ZçÇ]+\s+de\s+(\d{4})/i)
        if (ym) periodYear = parseInt(ym[1])
      }

      // ---- saldo final (cabeçalho "Saldo do dia • ... • R$ X") ----
      let finalBalance = null
      const fbMatches = text.match(/Saldo do dia[^\n]*?R\$\s*([\d.,]+)/gi)
      if (fbMatches && fbMatches.length) {
        const last = fbMatches[fbMatches.length - 1].match(/R\$\s*([\d.,]+)/)
        if (last) finalBalance = parseBRL(last[1])
      }

      // ---- mapa de saldo por dia (dd/mm) ----
      const saldoMap = {}
      const saldoRe = /Saldo do dia\s+(\d{2})\/(\d{2})\/\d+\s+R\$\s*([\d.,]+)/gi
      let sm
      while ((sm = saldoRe.exec(text)) !== null) {
        const dd = sm[1]
        const mm = sm[2]
        const val = parseBRL(sm[3])
        if (val !== null) saldoMap[mm + '-' + dd] = val
      }

      // ---- keywords de tipo ----
      const TYPE_KEYWORDS = [
        'Entrada PIX',
        'Saída PIX',
        'Saida PIX',
        'Salda PIX',
        'Entradas',
        'Entradai',
        'Pagamento',
        'Outros gastos',
        'Débito de Cartão',
        'Debito de Cartao',
        'Entrada',
        'Saída',
        'Saida',
      ]
      const typeAlt = TYPE_KEYWORDS.slice()
        .sort(function (a, b) {
          return b.length - a.length
        })
        .map(function (k) {
          return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        })
        .join('|')
      const typeRe = new RegExp('(' + typeAlt + ')', 'i')

      const lineRe = /^(\d{2}\/\d{2})(?:\s+\d{2}\/\d{2})?\s+(.+?)\s+(-?R\$\s*[\d.,]+)\s*$/

      const lines = text.split(/\r?\n/)
      const transactions = []

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].replace(/\|/g, ' ').replace(/\s+/g, ' ').trim()
        if (!line) continue
        if (!/^\d{2}\/\d{2}/.test(line)) continue
        // apenas linhas com exatamente UM valor R$ (evita linhas mescladas pelo OCR)
        const rCount = (line.match(/R\$/g) || []).length
        if (rCount !== 1) continue

        const m = line.match(lineRe)
        if (!m) continue

        const dateDM = m[1]
        const rest = m[2]
        const valStr = m[3].trim()

        const numStr = valStr.replace(/^(-?)R\$\s*/, '$1')
        const isNeg = /^-/.test(numStr)
        const amount = parseBRL(numStr.replace(/^-/, ''))
        if (amount === null) continue

        const tm = rest.match(typeRe)
        const typeKeyword = tm ? tm[1] : ''
        const description = tm ? rest.slice(tm.index + tm[0].length).trim() : rest.trim()
        if (!description) continue

        let type
        if (isNeg) type = 'expense'
        else if (/entrada|entradas|entradai/i.test(typeKeyword)) type = 'income'
        else if (/sa[ií]da|salda|pagamento|outros gastos|d[eé]bito/i.test(typeKeyword))
          type = 'expense'
        else type = amount >= 0 ? 'income' : 'expense'

        const parts = dateDM.split('/')
        const dd = parts[0]
        const mm = parts[1]
        const date = periodYear + '-' + mm + '-' + dd

        transactions.push({
          date: date,
          description: description,
          original_description: line,
          amount: Math.abs(amount),
          type: type,
          type_keyword: typeKeyword,
          balance: saldoMap[mm + '-' + dd] !== undefined ? saldoMap[mm + '-' + dd] : null,
        })
      }

      return e.json(200, {
        success: true,
        bank: 'C6 Bank',
        period_start: periodStart,
        period_end: periodEnd,
        final_balance: finalBalance,
        transactions_found: transactions.length,
        transactions: transactions,
      })
    } catch (err) {
      console.log('Error in c6_parser hook:', err)
      return e.json(500, { error: 'Erro ao processar extrato C6.' })
    }
  },
  $apis.requireAuth(),
)
