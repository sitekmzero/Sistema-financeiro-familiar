/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Resolve owner user (Adriana) — all register records belong to her.
    let adriana
    try {
      adriana = app.findAuthRecordByEmail('_pb_users_auth_', 'adriana.araujo@kmzero.com.br')
    } catch (_) {
      return
    }
    const userId = adriana.id

    const suppliersCol = app.findCollectionByNameOrId('suppliers')
    const budgetsCol = app.findCollectionByNameOrId('budgets')
    const familyMembersCol = app.findCollectionByNameOrId('family_members')

    // ----------------------------------------------------------------
    // Family Members
    // ----------------------------------------------------------------
    const members = [
      {
        name: 'Adriana Araújo',
        email: 'adriana.araujo@kmzero.com.br',
        role: 'Titular',
        monthly_allowance: 0,
        card_number: '',
      },
      {
        name: 'Luiz Fernando Araújo',
        email: 'luiz.fernando@kmzero.com.br',
        role: 'Cônjuge',
        monthly_allowance: 0,
        card_number: '',
      },
      {
        name: 'Gabriel Araújo',
        email: 'gabriel-foa@hotmail.com',
        role: 'Filho(a)',
        monthly_allowance: 650,
        card_number: '*0463',
      },
    ]
    for (const m of members) {
      try {
        app.findFirstRecordByData('family_members', 'name', m.name)
      } catch (_) {
        const rec = new Record(familyMembersCol)
        rec.set('name', m.name)
        if (m.email) rec.set('email', m.email)
        rec.set('role', m.role)
        if (m.monthly_allowance) rec.set('monthly_allowance', m.monthly_allowance)
        if (m.card_number) rec.set('card_number', m.card_number)
        rec.set('user', userId)
        app.save(rec)
      }
    }

    // ----------------------------------------------------------------
    // Suppliers (fornecedores reais detectados nos PDFs)
    // ----------------------------------------------------------------
    const suppliers = [
      {
        name: 'Urca Motors',
        category: 'Veículo',
        recurrence: 'Esporádico',
        payment_method: 'Cartão Inter',
      },
      {
        name: 'Zebu Carnes',
        category: 'Alimentação',
        recurrence: 'Mensal',
        payment_method: 'Cartão C6 Carbon',
      },
      {
        name: 'RD Saúde',
        category: 'Saúde',
        recurrence: 'Mensal',
        payment_method: 'Cartão C6 Carbon',
      },
      {
        name: 'Drogasil',
        category: 'Saúde',
        recurrence: 'Esporádico',
        payment_method: 'Cartão Porto Visa',
      },
      {
        name: 'Porto Seguro',
        category: 'Seguros',
        recurrence: 'Mensal',
        payment_method: 'Débito Inter',
      },
      {
        name: 'Facebook Ads',
        category: 'Business',
        recurrence: 'Mensal',
        payment_method: 'Cartão C6 Carbon',
      },
      {
        name: 'Google Cloud',
        category: 'Tecnologia',
        recurrence: 'Mensal',
        payment_method: 'Cartão C6 Carbon',
      },
      {
        name: 'Amazon',
        category: 'Assinaturas',
        recurrence: 'Mensal',
        payment_method: 'Cartão Inter',
      },
      {
        name: 'GloboPlay',
        category: 'Assinaturas',
        recurrence: 'Mensal',
        payment_method: 'Cartão Inter',
      },
      {
        name: 'Netflix',
        category: 'Assinaturas',
        recurrence: 'Mensal',
        payment_method: 'Cartão Inter',
      },
      {
        name: 'Apple',
        category: 'Assinaturas',
        recurrence: 'Mensal',
        payment_method: 'Cartão C6 Carbon',
      },
      {
        name: 'PetLove',
        category: 'Pet',
        recurrence: 'Mensal',
        payment_method: 'Cartão C6 Carbon',
      },
      {
        name: 'PAC Academia Biotech',
        category: 'Saúde',
        recurrence: 'Mensal',
        payment_method: 'Débito Inter',
      },
      {
        name: 'Abastece Aí',
        category: 'Transporte',
        recurrence: 'Semanal',
        payment_method: 'Cartão Porto Master',
      },
      {
        name: 'Zara / Inditex',
        category: 'Vestuário',
        recurrence: 'Esporádico',
        payment_method: 'Cartão C6 Carbon',
      },
      {
        name: 'Hering',
        category: 'Vestuário',
        recurrence: 'Esporádico',
        payment_method: 'Cartão Inter',
      },
      {
        name: 'C&A',
        category: 'Vestuário',
        recurrence: 'Esporádico',
        payment_method: 'Cartão Porto Visa',
      },
      {
        name: 'Nike',
        category: 'Vestuário',
        recurrence: 'Esporádico',
        payment_method: 'Cartão C6 Carbon',
      },
      {
        name: 'DELL',
        category: 'Tecnologia',
        recurrence: 'Esporádico',
        payment_method: 'Cartão C6 Carbon',
      },
    ]
    for (const s of suppliers) {
      try {
        app.findFirstRecordByData('suppliers', 'name', s.name)
      } catch (_) {
        const rec = new Record(suppliersCol)
        rec.set('name', s.name)
        rec.set('category', s.category)
        rec.set('recurrence', s.recurrence)
        rec.set('payment_method', s.payment_method)
        rec.set('user', userId)
        app.save(rec)
      }
    }

    // ----------------------------------------------------------------
    // Budgets (orçamento inicial sugerido)
    // ----------------------------------------------------------------
    const currentMonth = new Date().toISOString().slice(0, 7)
    const budgets = [
      { category: 'Alimentação', monthly_limit: 2000 },
      { category: 'Veículo', monthly_limit: 4000 },
      { category: 'Moradia', monthly_limit: 11000 },
      { category: 'Assinaturas', monthly_limit: 800 },
      { category: 'Vestuário', monthly_limit: 1500 },
      { category: 'Saúde', monthly_limit: 1500 },
      { category: 'Lazer', monthly_limit: 2000 },
    ]
    for (const b of budgets) {
      try {
        app.findFirstRecordByData('budgets', 'category', b.category)
      } catch (_) {
        const rec = new Record(budgetsCol)
        rec.set('category', b.category)
        rec.set('monthly_limit', b.monthly_limit)
        rec.set('month', currentMonth)
        rec.set('alert_threshold', 80)
        rec.set('user', userId)
        app.save(rec)
      }
    }
  },
  (app) => {
    const cols = ['family_members', 'suppliers', 'budgets']
    for (const name of cols) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.truncateCollection(col)
      } catch (_) {}
    }
  },
)
