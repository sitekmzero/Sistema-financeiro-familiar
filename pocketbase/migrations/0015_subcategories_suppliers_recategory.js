// Onda 6 — Subcategorias, suppliers de pessoas físicas e recategorização
// das transações em "review".
//
// 1. Adiciona campo `subcategory` (text, opcional, default "") em
//    `transactions` e `suppliers`.
// 2. Adiciona campo `subcategories` (json array) na coleção `categories`
//    (já criada em 0013 — apenas estende).
// 3. Garante as categorias "Financiamento", "Serviços Pessoais" e "Família"
//    na coleção `categories` (Seguros já existe). Os campos `category` de
//    transactions/suppliers são text desde 0013, então não há select a ampliar
//    — basta garantir os registros canônicos.
// 4. Cria suppliers para pessoas físicas (Maria Edivania, Claudia, Viviane,
//    Camila, Miss Hanna, Juliana, Antonio Ilson, Leandro, Matheus, Marco
//    Antonio, Gustavo, Gabriel) com category + aliases + auto_detect=true.
// 5. Separa os produtos Porto Seguro / Porto Bank:
//    - Porto Seguro existente vira "Porto Seguro Consórcio" (Consórcio).
//    - Cria Porto Seguro Auto / Celular / Equipamento (Seguros) e
//      Porto Bank Financiamento (Financiamento).
//    - Atualiza Pagaleve → Vestuário.
// 6. Recategoriza TODAS as transações com status="review" reaplicando a
//    regra de ouro do hook document_import.js (matchSupplier por aliases →
//    name → fuzzy 0.85). Onde casar: category = supplier.category,
//    supplier = match.id, status = "imported". Senão mantém "review".
//    raw_data de document_imports NÃO é tocado (verdade imutável).
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

    const db = app.db()

    // ---- 1. subcategory em transactions e suppliers ----
    const txCol = app.findCollectionByNameOrId('transactions')
    if (!txCol.fields.getByName('subcategory')) {
      txCol.fields.add(new TextField({ name: 'subcategory' }))
    }
    app.save(txCol)
    db.newQuery("UPDATE transactions SET subcategory = '' WHERE subcategory IS NULL").execute()

    const supCol = app.findCollectionByNameOrId('suppliers')
    if (!supCol.fields.getByName('subcategory')) {
      supCol.fields.add(new TextField({ name: 'subcategory' }))
    }
    app.save(supCol)
    db.newQuery("UPDATE suppliers SET subcategory = '' WHERE subcategory IS NULL").execute()

    // ---- 2. subcategories (json) em categories ----
    const catsCol = app.findCollectionByNameOrId('categories')
    if (!catsCol.fields.getByName('subcategories')) {
      catsCol.fields.add(new JSONField({ name: 'subcategories' }))
    }
    app.save(catsCol)

    // ---- 3. Garante categorias canônicas novas (idempotente por name) ----
    const NEW_CATEGORIES = [
      { name: 'Financiamento', color: '#DC2626', icon: 'Landmark' },
      { name: 'Serviços Pessoais', color: '#0891B2', icon: 'Wrench' },
      { name: 'Família', color: '#DB2777', icon: 'Baby' },
    ]
    for (let i = 0; i < NEW_CATEGORIES.length; i++) {
      const c = NEW_CATEGORIES[i]
      try {
        app.findFirstRecordByData('categories', 'name', c.name)
        continue
      } catch (_) {}
      const rec = new Record(catsCol)
      rec.set('name', c.name)
      rec.set('color', c.color)
      rec.set('icon', c.icon)
      rec.set('is_default', true)
      app.save(rec)
    }

    // ---- 4. Suppliers de pessoas físicas ----
    const PESSOAS = [
      {
        name: 'Maria Edivania Galdino Silva',
        category: 'Moradia',
        aliases: ['MARIA EDIVANIA GALDINO SILVA', 'MARIA EDIVANIA', 'EDIVANIA'],
      },
      {
        name: 'Claudia Regina Rodrigues Chilinque',
        category: 'Educação',
        aliases: ['CLAUDIA REGINA RODRIGUES CHILINQUE', 'CLAUDIA REGINA', 'CLAUDIA CHILINQUE'],
      },
      {
        name: 'Viviane Ferreira da Silva Manzan',
        category: 'Serviços Pessoais',
        aliases: ['VIVIANE FERREIRA DA SILVA MANZAN', 'VIVIANE FERREIRA', 'VIVIANE MANZAN'],
      },
      {
        name: 'Camila Goncalves de Oliveira',
        category: 'Serviços Pessoais',
        aliases: ['CAMILA GONCALVES DE OLIVEIRA', 'CAMILA GONCALVES', 'CAMILA OLIVEIRA'],
      },
      {
        name: 'Miss Hanna',
        category: 'Vestuário',
        aliases: ['Miss Hanna', 'MISS HANNA', 'HANNA'],
      },
      {
        name: 'Juliana Tartari De Almeida',
        category: 'Vestuário',
        aliases: ['Juliana Tartari De Almeida', 'JULIANA TARTARI', 'JULIANA ALMEIDA'],
      },
      {
        name: 'Antonio Ilson da Silva',
        category: 'Moradia',
        aliases: ['ANTONIO ILSON DA SILVA', 'ANTONIO ILSON', 'ILSON'],
      },
      {
        name: 'Leandro Mendes Parreira',
        category: 'Alimentação',
        aliases: ['LEANDRO MENDES PARREIRA', 'LEANDRO MENDES', 'LEANDRO PARREIRA'],
      },
      {
        name: 'Matheus Gomes',
        category: 'Serviços Pessoais',
        aliases: ['MATHEUS GOMES', 'MATHEUS'],
      },
      {
        name: 'Marco Antonio de Oliveira',
        category: 'Veículo',
        aliases: ['MARCO ANTONIO DE OLIVEIRA', 'MARCO ANTONIO', 'MARCO OLIVEIRA'],
      },
      {
        name: 'Gustavo Abdalla do Amaral',
        category: 'Vestuário',
        aliases: ['GUSTAVO ABDALLA DO AMARAL', 'GUSTAVO ABDALLA', 'GUSTAVO AMARAL'],
      },
      {
        name: 'Gabriel de Freitas Oliveira Araujo',
        category: 'Família',
        aliases: ['GABRIEL DE FREITAS OLIVEIRA ARAUJO', 'GABRIEL FREITAS', 'GABRIEL ARAUJO'],
      },
    ]

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

    // carrega suppliers do usuário
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

    const ensureSupplier = function (name, category, aliases, paymentMethod) {
      let sup = findSupplierByName(name)
      if (sup) {
        const m = mergeAliases(sup.getString('aliases'), aliases)
        if (m.changed) sup.set('aliases', m.aliases)
        if (category && sup.getString('category') !== category) sup.set('category', category)
        if (!sup.getBool('auto_detect')) sup.set('auto_detect', true)
        app.save(sup)
        return sup
      }
      sup = new Record(supCol)
      sup.set('user', userId)
      sup.set('name', name)
      sup.set('category', category)
      sup.set('aliases', aliases)
      sup.set('auto_detect', true)
      if (paymentMethod) sup.set('payment_method', paymentMethod)
      app.save(sup)
      existingSuppliers.push(sup)
      return sup
    }

    for (let i = 0; i < PESSOAS.length; i++) {
      const p = PESSOAS[i]
      ensureSupplier(p.name, p.category, p.aliases, 'Pix')
    }

    // ---- 5. Porto Seguro / Porto Bank ----
    // 5a. Porto Seguro existente → Porto Seguro Consórcio
    const portoConsorcio = findSupplierByName('Porto Seguro Consórcio')
    const portoSeguroOld = findSupplierByName('Porto Seguro')
    const consorcioAliases = ['PORTO SEGURO', 'PORTOSEG', 'PORTO SEGURO CONSORCIO']
    if (portoConsorcio) {
      const m = mergeAliases(portoConsorcio.getString('aliases'), consorcioAliases)
      if (m.changed) portoConsorcio.set('aliases', m.aliases)
      portoConsorcio.set('category', 'Consórcio')
      portoConsorcio.set('auto_detect', true)
      app.save(portoConsorcio)
    } else if (portoSeguroOld) {
      portoSeguroOld.set('name', 'Porto Seguro Consórcio')
      portoSeguroOld.set('category', 'Consórcio')
      portoSeguroOld.set('aliases', consorcioAliases)
      portoSeguroOld.set('auto_detect', true)
      app.save(portoSeguroOld)
    } else {
      ensureSupplier('Porto Seguro Consórcio', 'Consórcio', consorcioAliases, 'Débito automático')
    }

    // 5b. Demais produtos Porto
    ensureSupplier(
      'Porto Seguro Auto',
      'Seguros',
      ['PORTO SEGURO AUTO', 'SEGURO AUTO PORTO', 'PORTO SEGURO JAGUAR'],
      '',
    )
    ensureSupplier(
      'Porto Seguro Celular',
      'Seguros',
      ['PORTO SEGURO CELULAR', 'SEGURO CELULAR PORTO'],
      '',
    )
    ensureSupplier(
      'Porto Seguro Equipamento',
      'Seguros',
      ['PORTO SEGURO EQUIPAMENTO', 'SEGURO EQUIPAMENTO PORTO', 'SEGURO NUTRICAO'],
      '',
    )
    ensureSupplier(
      'Porto Bank Financiamento',
      'Financiamento',
      ['PORTO BANK', 'FINANCIAMENTO PORTO', 'PORTO FINANCIAMENTO', 'FINANCIAMENTO JAGUAR'],
      '',
    )

    // 5c. Pagaleve → Vestuário
    const pagaleve = findSupplierByName('Pagaleve')
    if (pagaleve) {
      const m = mergeAliases(pagaleve.getString('aliases'), [
        'PAGALEVE',
        'PAG*LEVE',
        'PAGALEVE PAGAMENTOS',
      ])
      if (m.changed) pagaleve.set('aliases', m.aliases)
      pagaleve.set('category', 'Vestuário')
      app.save(pagaleve)
    }

    // ---- recarrega suppliers (pós-criações) ----
    try {
      existingSuppliers = app.findRecordsByFilter('suppliers', 'user = {:uid}', 'name', 500, 0, {
        uid: userId,
      })
    } catch (_) {
      existingSuppliers = []
    }

    // ---- matchSupplier (réplica do hook document_import.js) ----
    const matchSupplier = function (desc) {
      const d = normDesc(desc)
      if (!d || !existingSuppliers || !existingSuppliers.length) return null
      // 1. aliases (substring em qualquer direção)
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
      // 2. name (substring)
      for (let i = 0; i < existingSuppliers.length; i++) {
        const s = existingSuppliers[i]
        const name = norm(s.getString('name'))
        if (!name) continue
        if (d.indexOf(name) !== -1 || name.indexOf(d) !== -1) return s
      }
      // 3. fuzzy no name (similaridade ≥ 0.85)
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

    // ---- 6. Recategoriza transações em "review" ----
    let reviewTxs = []
    try {
      reviewTxs = app.findRecordsByFilter('transactions', 'status = "review"', '-date', 5000, 0)
    } catch (_) {
      reviewTxs = []
    }

    let matched = 0
    let stillReview = 0
    for (let i = 0; i < reviewTxs.length; i++) {
      const t = reviewTxs[i]
      const desc = t.getString('original_description') || t.getString('description')
      const m = matchSupplier(desc)
      if (m) {
        const cat = m.getString('category') || 'Outros'
        db.newQuery(
          'UPDATE transactions SET category = {:c}, supplier = {:s}, status = "imported" WHERE id = {:id}',
        )
          .bind({ c: cat, s: m.id, id: t.id })
          .execute()
        matched++
      } else {
        // mantém status = "review" (não inventa categoria)
        stillReview++
      }
    }

    console.log(
      'Onda 6 - subcategory/subcategories adicionados, ' +
        PESSOAS.length +
        ' suppliers de pessoas físicas, produtos Porto separados, Pagaleve→Vestuário. ' +
        'Review recategorizadas: ' +
        matched +
        ' importadas, ' +
        stillReview +
        ' continuam em review.',
    )
  },
  (app) => {
    // down: não reversível deterministicamente. Campos e categorias são
    // aditivos; a recategorização alterou status/category/supplier de
    // transações que estavam em review (estado anterior = review sem
    // categoria), o que não faz sentido restaurar.
  },
)
