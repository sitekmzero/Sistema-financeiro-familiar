/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Add fields to users if missing
    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'member'],
          maxSelect: 1,
        }),
      )
    }
    app.save(usersCol)

    // 2. Wipe ALL old records from all collections to start absolute clean zero
    const collectionsToClear = [
      'chat_messages',
      'weekly_reports',
      'documents',
      'trip_items',
      'trips',
      'reserve_contributions',
      'reserve_goals',
      'debt_payments',
      'debts',
      'transactions',
      'bank_accounts',
    ]

    for (const colName of collectionsToClear) {
      try {
        const col = app.findCollectionByNameOrId(colName)
        app.truncateCollection(col)
      } catch (e) {
        console.log(`Collection ${colName} clear skipped or not found:`, e)
      }
    }

    // Update collection rules so logged in members can list/view, but owners or admins can manage
    // Or simpler: for family office, allow all auth users in the family to list/view all bank_accounts, debts, transactions, etc.
    const familyCollections = [
      'bank_accounts',
      'transactions',
      'debts',
      'debt_payments',
      'reserve_goals',
      'reserve_contributions',
      'trips',
      'trip_items',
      'documents',
      'chat_messages',
      'weekly_reports',
    ]

    for (const name of familyCollections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id != ''"
        col.deleteRule = "@request.auth.id != ''"
        app.save(col)
      } catch (e) {
        console.log(`Failed setting rules for ${name}:`, e)
      }
    }

    // 3. Ensure Multi-Profile Users
    // Users:
    // a) Adriana Araújo (admin) - adriana.araujo@kmzero.com.br
    // b) Luiz Fernando - luiz.fernando@kmzero.com.br
    // c) Gabriel Araújo - gabriel-foa@hotmail.com

    let adrianaUser, luizUser, gabrielUser

    // Adriana
    try {
      adrianaUser = app.findAuthRecordByEmail('_pb_users_auth_', 'adriana.araujo@kmzero.com.br')
    } catch (_) {
      adrianaUser = new Record(usersCol)
      adrianaUser.setEmail('adriana.araujo@kmzero.com.br')
      adrianaUser.setPassword('Skip@Pass')
      adrianaUser.setVerified(true)
    }
    adrianaUser.set('name', 'Adriana Araújo')
    adrianaUser.set('role', 'admin')
    app.save(adrianaUser)

    // Luiz Fernando
    try {
      luizUser = app.findAuthRecordByEmail('_pb_users_auth_', 'luiz.fernando@kmzero.com.br')
    } catch (_) {
      luizUser = new Record(usersCol)
      luizUser.setEmail('luiz.fernando@kmzero.com.br')
      luizUser.setPassword('Skip@Pass')
      luizUser.setVerified(true)
    }
    luizUser.set('name', 'Luiz Fernando')
    luizUser.set('role', 'admin')
    app.save(luizUser)

    // Gabriel Araújo
    try {
      gabrielUser = app.findAuthRecordByEmail('_pb_users_auth_', 'gabriel-foa@hotmail.com')
    } catch (_) {
      gabrielUser = new Record(usersCol)
      gabrielUser.setEmail('gabriel-foa@hotmail.com')
      gabrielUser.setPassword('Skip@Pass')
      gabrielUser.setVerified(true)
    }
    gabrielUser.set('name', 'Gabriel Araújo')
    gabrielUser.set('role', 'member')
    app.save(gabrielUser)

    // 4. Create Real Bank Accounts
    // Inter (Ag 0001-9, CC 1612420-0): +R$ 488,71
    // C6 (Ag 0001, CC 398265607): -R$ 913,69 (limite R$ 8.160)
    const bankAccountsCol = app.findCollectionByNameOrId('bank_accounts')

    const interAccount = new Record(bankAccountsCol)
    interAccount.set('name', 'Banco Inter (Ag 0001-9 / CC 1612420-0)')
    interAccount.set('bank_name', 'Inter')
    interAccount.set('balance', 488.71)
    interAccount.set('color', '#FF7A00')
    interAccount.set('user', adrianaUser.id)
    app.save(interAccount)

    const c6Account = new Record(bankAccountsCol)
    c6Account.set('name', 'C6 Bank (Ag 0001 / CC 398265607)')
    c6Account.set('bank_name', 'C6 Bank')
    c6Account.set('balance', -913.69)
    c6Account.set('color', '#242424')
    c6Account.set('user', adrianaUser.id)
    app.save(c6Account)

    // 5. Create 6 Real Credit Cards as Bank Accounts / Credit Card Accounts or Debts / Accounts
    // Inter (*0066), Porto Visa (*158), C6 Carbon (*0463), Porto Master (*7113), SICOOB (*8848), Mercado Pago (*9733)
    const creditCards = [
      { name: 'Cartão Inter (*0066)', bank_name: 'Inter', balance: 0, color: '#FF7A00' },
      {
        name: 'Cartão Porto Visa (*0158)',
        bank_name: 'Porto Seguro',
        balance: 0,
        color: '#0047BB',
      },
      { name: 'Cartão C6 Carbon (*0463)', bank_name: 'C6 Bank', balance: 0, color: '#1A1A1A' },
      {
        name: 'Cartão Porto Master (*7113)',
        bank_name: 'Porto Seguro',
        balance: 0,
        color: '#002868',
      },
      { name: 'Cartão SICOOB (*8848)', bank_name: 'Sicoob', balance: 0, color: '#003641' },
      {
        name: 'Cartão Mercado Pago (*9733)',
        bank_name: 'Mercado Pago',
        balance: 0,
        color: '#00A9E0',
      },
    ]

    for (const card of creditCards) {
      const cardRecord = new Record(bankAccountsCol)
      cardRecord.set('name', card.name)
      cardRecord.set('bank_name', card.bank_name)
      cardRecord.set('balance', card.balance)
      cardRecord.set('color', card.color)
      cardRecord.set('user', adrianaUser.id)
      app.save(cardRecord)
    }

    // 6. Create 3 Structural Debts
    // - Caixa (Contrato 144442055097-9): Saldo R$ 897.639,80, Parcela R$ 7.501,77, 336/360 meses, 10,24% a.a.
    // - Consórcio Porto A (Cota 0114-00): R$ 700k crédito, Parcela R$ 1.936,90, 13/200 pagas.
    // - Consórcio Porto B (Cota 0242-00): R$ 295k crédito, Parcela R$ 1.334,19, 09/200 pagas.
    const debtsCol = app.findCollectionByNameOrId('debts')

    const caixaDebt = new Record(debtsCol)
    caixaDebt.set('name', 'Financiamento Caixa (Contrato 144442055097-9)')
    caixaDebt.set('creditor', 'Caixa Econômica Federal')
    caixaDebt.set('total_amount', 880000.0)
    caixaDebt.set('remaining_amount', 897639.8)
    caixaDebt.set('interest_rate', 10.24) // % a.a.
    caixaDebt.set('monthly_payment', 7501.77)
    caixaDebt.set('due_date', '2026-09-03 00:00:00.000Z')
    caixaDebt.set('status', 'em_dia')
    caixaDebt.set('strategy', 'avalanche')
    caixaDebt.set('user', adrianaUser.id)
    app.save(caixaDebt)

    const consorcioA = new Record(debtsCol)
    consorcioA.set('name', 'Consórcio Porto A (Cota 0114-00) - R$ 700k Crédito')
    consorcioA.set('creditor', 'Porto Seguro Consórcios')
    consorcioA.set('total_amount', 362241.3) // estimated 187 remaining * 1936.90
    consorcioA.set('remaining_amount', 362241.3)
    consorcioA.set('interest_rate', 0.0)
    consorcioA.set('monthly_payment', 1936.9)
    consorcioA.set('due_date', '2026-04-15 00:00:00.000Z')
    consorcioA.set('status', 'em_dia')
    consorcioA.set('strategy', 'snowball')
    consorcioA.set('user', adrianaUser.id)
    app.save(consorcioA)

    const consorcioB = new Record(debtsCol)
    consorcioB.set('name', 'Consórcio Porto B (Cota 0242-00) - R$ 295k Crédito')
    consorcioB.set('creditor', 'Porto Seguro Consórcios')
    consorcioB.set('total_amount', 254830.29) // estimated 191 remaining * 1334.19
    consorcioB.set('remaining_amount', 254830.29)
    consorcioB.set('interest_rate', 0.0)
    consorcioB.set('monthly_payment', 1334.19)
    consorcioB.set('due_date', '2026-04-15 00:00:00.000Z')
    consorcioB.set('status', 'em_dia')
    consorcioB.set('strategy', 'snowball')
    consorcioB.set('user', adrianaUser.id)
    app.save(consorcioB)

    // 7. Initial real transactions / sample representative records if needed
    // Add real expense records for Facebook Ads, Jaguar / veículos, and Gabriel's expenses for testing queries
    const transactionsCol = app.findCollectionByNameOrId('transactions')

    const realTransactions = [
      {
        description: 'Retirada Pró-labore - Transluga',
        amount: 15000.0,
        type: 'income',
        category: 'Renda',
        date: '2025-03-01 10:00:00.000Z',
        account: interAccount.id,
        user: adrianaUser.id,
      },
      {
        description: 'Anúncios Facebook Ads (Transluga / Marketing)',
        amount: 1450.0,
        type: 'expense',
        category: 'Outros',
        date: '2025-03-02 14:00:00.000Z',
        account: interAccount.id,
        user: adrianaUser.id,
      },
      {
        description: 'Manutenção e Combustível Jaguar',
        amount: 2850.0,
        type: 'expense',
        category: 'Transporte',
        date: '2025-03-03 16:00:00.000Z',
        account: interAccount.id,
        user: adrianaUser.id,
      },
      {
        description: 'Seguro Veicular Jaguar',
        amount: 1200.0,
        type: 'expense',
        category: 'Transporte',
        date: '2025-03-05 11:00:00.000Z',
        account: interAccount.id,
        user: adrianaUser.id,
      },
      {
        description: 'Faculdade Gabriel',
        amount: 1800.0,
        type: 'expense',
        category: 'Educação',
        date: '2025-03-04 09:00:00.000Z',
        account: interAccount.id,
        user: gabrielUser.id,
      },
      {
        description: 'Supermercado e Gastos Gabriel',
        amount: 650.0,
        type: 'expense',
        category: 'Alimentação',
        date: '2025-03-06 18:00:00.000Z',
        account: interAccount.id,
        user: gabrielUser.id,
      },
    ]

    for (const item of realTransactions) {
      const rec = new Record(transactionsCol)
      rec.set('description', item.description)
      rec.set('amount', item.amount)
      rec.set('type', item.type)
      rec.set('category', item.category)
      rec.set('date', item.date)
      rec.set('account', item.account)
      rec.set('source', 'manual')
      rec.set('user', item.user)
      app.save(rec)
    }

    // Initial welcome message from James
    const chatMessagesCol = app.findCollectionByNameOrId('chat_messages')
    const initialChat = new Record(chatMessagesCol)
    initialChat.set('role', 'agent')
    initialChat.set(
      'content',
      'Olá Adriana e família! Eu sou o James, seu consultor e mentor do James Family Office.\n\nO plano de implantação real foi executado com sucesso! Zerei os dados legados, cataloguei suas contas do Inter e C6 Bank, seus 6 cartões reais e as 3 Dívidas Estruturais (Caixa + Consórcios Porto).\n\nExperimente os comandos:\n• /resumo - Consolidado da família\n• /retirada - Motor de Pró-labore necessário\n• /gabriel - Gastos específicos do Gabriel\n• Perguntas sobre Facebook Ads ou custos do Jaguar!\n\nLembre-se: "Tudo o que você foca com sentimento, expande." Vamos juntos rumo ao patrimônio exponencial!',
    )
    initialChat.set('user', adrianaUser.id)
    app.save(initialChat)
  },
  (app) => {
    // down migration
  },
)
