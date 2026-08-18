// Onda 4 (pós) — C1: Corrigir categorização baseada em suppliers.aliases.
//
// Problema: a migration 0010 categorizou transações reais do extrato C6 usando
// palavras-chave genéricas. Resultado: "QUILOMETRO ZERO CORRETORA" (renda de
// corretora) caiu em "Moradia"; "PORTOSEG" (consórcio) caiu em "Moradia"; etc.
// A causa raiz: os suppliers existentes não tinham aliases preenchidos, então o
// matchSupplier nunca casava, e o fallback de keywords errava a categoria.
//
// Esta migration:
//   1. Amplia os selects `transactions.category` e `suppliers.category` com as
//      categorias canônicas (Consórcio, Transferência, Tarifas, Pagamento de
//      Cartão, Investimento, Renda) — para que supplier e transaction usem o
//      MESMO domínio e o mapeamento seja 1:1.
//   2. Preenche `aliases` nos suppliers existentes e cria os suppliers faltantes
//      que aparecem no extrato C6 (Km Zero Corretora, Mercado Pago, Transluga,
//      C6 Bank, Pagaleve, Tuna, etc.).
//   3. Recategoriza TODAS as transações importadas do extrato C6
//      (source_document = 'extrato-c6-180-dias.pdf') reaplicando a regra de ouro:
//      supplier.aliases primeiro → keyword fallback → senão status 'review'.
//      A recategorização usa SQL direto (UPDATE) para não revalidar cada registro.
migrate(
  (app) => {
    const userId = 'flultn0n16u09bh'

    // ---- helpers inline (JSVM goja) ----
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
      return norm(s)
        .replace(/^pix (recebido de|enviado para|enviado de|recebido para)\s+/, '')
        .replace(/^recorrencia pix enviada para\s+/, '')
        .replace(/^pix /, '')
        .trim()
    }
    const levenshtein = function (a, b) {
      const m = a.length,
        n = b.length
      if (m === 0) return n
      if (n === 0) return m
      let prev = [],
        curr = []
      for (let j = 0; j <= n; j++) prev[j] = j
      for (let i = 1; i <= m; i++) {
        curr[0] = i
        for (let j = 1; j <= n; j++) {
          const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
          curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
        }
        const tmp = prev
        prev = curr
        curr = tmp
      }
      return prev[n]
    }
    const similarity = function (a, b) {
      const A = (a || '').toLowerCase().trim(),
        B = (b || '').toLowerCase().trim()
      if (!A || !B) return 0
      if (A === B) return 1
      return 1 - levenshtein(A, B) / Math.max(A.length, B.length)
    }

    // ---- 1. Amplia selects transactions.category e suppliers.category ----
    // fields.add() com o mesmo nome substitui o campo (mantém a coluna SQLite e
    // os dados existentes — apenas amplia os valores aceitos).
    const CANONICAL_CATEGORIES = [
      'Alimentação',
      'Transporte',
      'Moradia',
      'Saúde',
      'Lazer',
      'Educação',
      'Assinaturas',
      'Renda',
      'Outros',
      'Consórcio',
      'Transferência',
      'Tarifas',
      'Pagamento de Cartão',
      'Investimento',
      // categorias legadas de supplier (mantidas para suppliers antigos)
      'Veículo',
      'Tecnologia',
      'Business',
      'Pet',
      'Vestuário',
      'Seguros',
    ]

    const txCol = app.findCollectionByNameOrId('transactions')
    txCol.fields.add(
      new SelectField({
        name: 'category',
        required: true,
        values: CANONICAL_CATEGORIES,
        maxSelect: 1,
      }),
    )
    app.save(txCol)

    const supCol0 = app.findCollectionByNameOrId('suppliers')
    supCol0.fields.add(
      new SelectField({
        name: 'category',
        required: false,
        values: CANONICAL_CATEGORIES,
        maxSelect: 1,
      }),
    )
    app.save(supCol0)

    // ---- 2. Aliases + suppliers ----
    // supplier.category agora usa o MESMO domínio que transactions.category
    // (Renda, Transferência, Tarifas, etc.) — mapeamento 1:1, sem tradução.
    const mapSupplierCategory = function (cat) {
      if (!cat) return 'Outros'
      for (let i = 0; i < CANONICAL_CATEGORIES.length; i++) {
        if (CANONICAL_CATEGORIES[i] === cat) return cat
      }
      // aliases legados
      const c = cat.toLowerCase()
      if (c === 'veículo') return 'Transporte'
      return 'Outros'
    }

    // suppliers a garantir: [name, category, aliases[], payment_method]
    const SUPPLIERS_TO_ENSURE = [
      [
        'Km Zero Corretora',
        'Renda',
        [
          'QUILOMETRO ZERO',
          'KM ZERO',
          'KM ZERO CORRETORA',
          'QUILOMETRO ZERO CORRETORA',
          'KM ZERO CORRETORA DE SEGUROS',
          'QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA',
          'KM ZERO CORRETORA DE SEGUROS LTDA ME',
          'KM ZERO CORRETORA DE SEGUROS E CONSORCIOS LTDA',
        ],
        'Pix',
      ],
      [
        'Porto Seguro',
        'Consórcio',
        [
          'PORTOSEG',
          'PORTO SEGURO',
          'PORTO',
          'PORTO SEGURO CIA',
          'PORTO SEGURO SEGUROS',
          'PORTOSEG S/A',
          'PORTOSEG S/A CREDITO FINANCIAMENTO E INVESTIMENTO',
        ],
        'Débito C6',
      ],
      [
        'Mercado Pago',
        'Transferência',
        ['MERCADO PAGO', 'MERCADOPAGO', 'MP', 'MERCADO PAGO INSTITUICAO DE PAGAMENTO LTDA'],
        'Pix',
      ],
      ['Transluga', 'Renda', ['TRANSLUGA', 'TRANSLUGA ADMINISTRACAO DE VEICULOS LTDA'], 'Pix'],
      [
        'C6 Bank',
        'Tarifas',
        [
          'SEGURO CONTA C6',
          'IOF CHEQUE ESPECIAL',
          'PGTO FAT CARTAO C6',
          'TRIBUTOS FEDERAIS DARF',
          'PGTO DE BOLETO',
          'C6 BANK',
        ],
        'Débito automático',
      ],
      [
        'Resgate CDB',
        'Investimento',
        ['RESGATE DE CDB', 'RESGATE CDB', 'CASHBACK ATOMOS', 'CREDITO BOLETO PARCELADO NO CARTAO'],
        'Aplicação',
      ],
      [
        'Pagaleve',
        'Transferência',
        ['PAGALEVE', 'PAGALEVE INSTITUICAO DE PAGAMENTO LTDA', 'PAGALEVE FUNDO DE INVESTIMENTO'],
        'Pix',
      ],
      ['Tuna Pagamentos', 'Transferência', ['TUNA PAGAMENTOS', 'TUNA'], 'Pix'],
      [
        'Quitandas Vovó Tuta',
        'Alimentação',
        ['QUITANDAS VOVO TUTA', 'VOVO TUTA', 'QUITANDAS'],
        'Pix',
      ],
      [
        'iFood',
        'Alimentação',
        ['IFOOD', 'IFOOD.COM', 'IFOOD.COM AGENCIA DE RESTAURANTES ONLINE S.A.'],
        'Cartão/Pix',
      ],
      ['Miss Hanna', 'Saúde', ['MISS HANNA'], 'Pix'],
      [
        'Google Brasil',
        'Assinaturas',
        ['GOOGLE BRASIL', 'GOOGLE BRASIL PAGAMENTOS LTDA', 'GOOGLE CLOUD', 'GOOGLE'],
        'Cartão/Pix',
      ],
      ['Correios', 'Outros', ['CORREIOS', 'CORREIOS SEDE'], 'Pix'],
      [
        'Atacadão Pet',
        'Outros',
        [
          'ATACADAO PET',
          'ATACADAO PET E TRANSPORTES LTDA',
          'PETSUPERMARKET',
          'PETSUPERMARKET COMERCIO DE PRODUTOS PARA ANIMAIS LTDA',
        ],
        'Pix',
      ],
      [
        'Senhor Parmeggiana',
        'Alimentação',
        ['SENHOR PARMEGGIANA', 'SENHOR PARM', 'SENHOR PARMESANA'],
        'Pix',
      ],
      [
        'Multiplan Estacionamento',
        'Transporte',
        ['MULTIPLAN ESTACIONAMENTO', 'MULTIPLAN ESTACIONAMENTO LTDA'],
        'Cartão',
      ],
      ['Carro e Cia Veículos', 'Transporte', ['CARRO E CIA', 'CARRO E CIA VEICULOS'], 'Pix'],
      [
        'Allianz Seguros',
        'Consórcio',
        ['ALLIANZ', 'ALLIANZ SEGUROS', 'ALLIANZ SEGUROS S/A'],
        'Débito automático',
      ],
      ['NIC.br', 'Assinaturas', ['NIC BR', 'NIC.BR', 'REGISTRO BR', 'REGISTRO.BR'], 'Pix'],
      ['LEJ Materiais', 'Moradia', ['LEJ MATERIAIS', 'LEJ MATERIAIS PARA CONSTRUCAO'], 'Pix'],
    ]

    const supCol = app.findCollectionByNameOrId('suppliers')

    let existingSuppliers = []
    try {
      existingSuppliers = app.findRecordsByFilter('suppliers', 'user = {:uid}', 'name', 500, 0, {
        uid: userId,
      })
    } catch (_) {
      existingSuppliers = []
    }

    const findSupplierByName = function (name) {
      const n = norm(name)
      for (let i = 0; i < existingSuppliers.length; i++) {
        if (norm(existingSuppliers[i].getString('name')) === n) return existingSuppliers[i]
      }
      return null
    }

    const mergeAliases = function (currentRaw, toAdd) {
      let current = []
      try {
        const parsed = JSON.parse(currentRaw || '[]')
        if (parsed && typeof parsed === 'object' && typeof parsed.length === 'number') {
          current = parsed
        }
      } catch (_) {
        current = []
      }
      let changed = false
      for (let i = 0; i < toAdd.length; i++) {
        const a = norm(toAdd[i])
        let exists = false
        for (let j = 0; j < current.length; j++) {
          if (norm(current[j]) === a) {
            exists = true
            break
          }
        }
        if (!exists && a) {
          current.push(toAdd[i])
          changed = true
        }
      }
      return { aliases: current, changed: changed }
    }

    for (let i = 0; i < SUPPLIERS_TO_ENSURE.length; i++) {
      const def = SUPPLIERS_TO_ENSURE[i]
      const name = def[0]
      const cat = def[1]
      const aliases = def[2]
      const pm = def[3]
      let sup = findSupplierByName(name)
      if (sup) {
        const m = mergeAliases(sup.getString('aliases'), aliases)
        if (m.changed) {
          sup.set('aliases', m.aliases)
        }
        if (cat && sup.getString('category') !== cat) {
          sup.set('category', cat)
        }
        app.save(sup)
      } else {
        sup = new Record(supCol)
        sup.set('user', userId)
        sup.set('name', name)
        sup.set('category', cat)
        sup.set('aliases', aliases)
        sup.set('payment_method', pm)
        sup.set('auto_detect', true)
        app.save(sup)
        existingSuppliers.push(sup)
      }
    }

    // ---- matchSupplier (aliases primeiro, depois name, depois fuzzy) ----
    const matchSupplier = function (desc) {
      const d = normDesc(desc)
      if (!d || !existingSuppliers || !existingSuppliers.length) return null
      for (let i = 0; i < existingSuppliers.length; i++) {
        const s = existingSuppliers[i]
        if (!s) continue
        let aliases = []
        try {
          const raw = s.getString('aliases')
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed && typeof parsed === 'object' && typeof parsed.length === 'number') {
              aliases = parsed
            }
          }
        } catch (_) {}
        if (aliases && aliases.length) {
          for (let j = 0; j < aliases.length; j++) {
            const al = norm(aliases[j])
            if (al && (d.indexOf(al) !== -1 || al.indexOf(d) !== -1)) return s
          }
        }
      }
      for (let i = 0; i < existingSuppliers.length; i++) {
        const s = existingSuppliers[i]
        const name = norm(s.getString('name'))
        if (!name) continue
        if (d.indexOf(name) !== -1 || name.indexOf(d) !== -1) return s
      }
      let best = null,
        bestSim = 0.85
      for (let i = 0; i < existingSuppliers.length; i++) {
        const name = norm(existingSuppliers[i].getString('name'))
        if (!name) continue
        const sim = similarity(d, name)
        if (sim > bestSim) {
          bestSim = sim
          best = existingSuppliers[i]
        }
      }
      return best
    }

    // ---- keyword fallback (apenas quando supplier não casa) ----
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
          'senhor parm',
          'lanche',
          'pizzaria',
        ],
      },
      {
        cat: 'Transporte',
        words: [
          'posto',
          'shell',
          'ipiranga',
          'petrobras',
          'estacionamento',
          'multiplan estacionamento',
          'uber',
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
          'lej materiais',
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
          'nic br',
          'registro br',
        ],
      },
      {
        cat: 'Educação',
        words: ['escola', 'colegio', 'curso', 'udemy', 'alura', 'faculdade', 'aluno'],
      },
      {
        cat: 'Lazer',
        words: ['cinema', 'teatro', 'viagem', 'hotel', 'airbnb', 'parque', 'show', 'ingresso'],
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
        for (let w = 0; w < KEYWORD_CATEGORIES[i].words.length; w++) {
          if (d.indexOf(norm(KEYWORD_CATEGORIES[i].words[w])) !== -1)
            return KEYWORD_CATEGORIES[i].cat
        }
      }
      return ''
    }

    // ---- 3. Recategoriza transações do extrato C6 via SQL direto ----
    // (evita revalidar cada registro contra o select recém-ampliado)
    let txs = []
    try {
      txs = app.findRecordsByFilter(
        'transactions',
        'source_document = "extrato-c6-180-dias.pdf"',
        '-date',
        5000,
        0,
      )
    } catch (_) {
      txs = []
    }

    const db = app.db()
    let fixed = 0
    for (let i = 0; i < txs.length; i++) {
      const t = txs[i]
      const desc = t.getString('original_description') || t.getString('description')
      const type = t.getString('type')
      let category = 'Outros'
      let supplierId = ''
      let status = 'review'

      const matched = matchSupplier(desc)
      if (matched) {
        category = mapSupplierCategory(matched.getString('category'))
        supplierId = matched.id
        status = 'categorized'
      } else {
        const kw = keywordCategory(desc)
        if (kw) {
          category = kw
          status = 'categorized'
        }
      }
      if (status === 'review' && type === 'income') {
        category = 'Renda'
        status = 'categorized'
      }

      db.newQuery(
        'UPDATE transactions SET category = {:c}, supplier = {:s}, status = {:st} WHERE id = {:id}',
      )
        .bind({ c: category, s: supplierId, st: status, id: t.id })
        .execute()
      fixed++
    }

    console.log(
      'C1 - recategorizadas ' + fixed + ' transações do extrato C6 via suppliers.aliases.',
    )
  },
  (app) => {
    // down: não reversível deterministicamente (a categoria original errada não
    // faz sentido restaurar). A ampliação dos selects e os aliases são aditivos.
  },
)
