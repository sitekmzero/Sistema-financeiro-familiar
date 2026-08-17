/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const bankAccountsCol = app.findCollectionByNameOrId('bank_accounts')
    const transactionsCol = app.findCollectionByNameOrId('transactions')
    const debtsCol = app.findCollectionByNameOrId('debts')
    const debtPaymentsCol = app.findCollectionByNameOrId('debt_payments')
    const reserveGoalsCol = app.findCollectionByNameOrId('reserve_goals')
    const reserveContribCol = app.findCollectionByNameOrId('reserve_contributions')
    const tripsCol = app.findCollectionByNameOrId('trips')
    const tripItemsCol = app.findCollectionByNameOrId('trip_items')
    const weeklyReportsCol = app.findCollectionByNameOrId('weekly_reports')
    const chatMessagesCol = app.findCollectionByNameOrId('chat_messages')

    // 1. Seed user: adriana.araujo@kmzero.com.br
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'adriana.araujo@kmzero.com.br')
    } catch (_) {
      userRecord = new Record(usersCol)
      userRecord.setEmail('adriana.araujo@kmzero.com.br')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Adriana Araújo')
      app.save(userRecord)
    }

    const userId = userRecord.id

    // 2. Seed bank_accounts
    let bbAccount, nubankAccount
    try {
      bbAccount = app.findFirstRecordByData(
        'bank_accounts',
        'name',
        'Banco do Brasil - Conta Corrente',
      )
    } catch (_) {
      bbAccount = new Record(bankAccountsCol)
      bbAccount.set('name', 'Banco do Brasil - Conta Corrente')
      bbAccount.set('bank_name', 'Banco do Brasil')
      bbAccount.set('balance', 3450.0)
      bbAccount.set('color', '#F59E0B')
      bbAccount.set('user', userId)
      app.save(bbAccount)
    }

    try {
      nubankAccount = app.findFirstRecordByData('bank_accounts', 'name', 'Nubank - Conta Digital')
    } catch (_) {
      nubankAccount = new Record(bankAccountsCol)
      nubankAccount.set('name', 'Nubank - Conta Digital')
      nubankAccount.set('bank_name', 'Nubank')
      nubankAccount.set('balance', 1820.5)
      nubankAccount.set('color', '#8B5CF6')
      nubankAccount.set('user', userId)
      app.save(nubankAccount)
    }

    // 3. Seed transactions
    const now = new Date()
    const d = (daysAgo) => {
      const target = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      return target.toISOString().split('T')[0] + ' 12:00:00.000Z'
    }

    const sampleTransactions = [
      {
        description: 'Salário Mensal - Empresa',
        amount: 6800.0,
        type: 'income',
        category: 'Renda',
        date: d(3),
        account: bbAccount.id,
        source: 'manual',
      },
      {
        description: 'Consultoria Extra',
        amount: 1500.0,
        type: 'income',
        category: 'Renda',
        date: d(18),
        account: nubankAccount.id,
        source: 'manual',
      },
      {
        description: 'Supermercado Pão de Açúcar',
        amount: 684.3,
        type: 'expense',
        category: 'Alimentação',
        date: d(2),
        account: nubankAccount.id,
        source: 'manual',
      },
      {
        description: 'Aluguel Apartamento',
        amount: 2200.0,
        type: 'expense',
        category: 'Moradia',
        date: d(5),
        account: bbAccount.id,
        source: 'manual',
      },
      {
        description: 'Combustível Posto Ipiranga',
        amount: 240.0,
        type: 'expense',
        category: 'Transporte',
        date: d(7),
        account: nubankAccount.id,
        source: 'manual',
      },
      {
        description: 'Academia Smart Fit',
        amount: 129.9,
        type: 'expense',
        category: 'Saúde',
        date: d(9),
        account: nubankAccount.id,
        source: 'manual',
      },
      {
        description: 'Assinaturas Netflix e Spotify',
        amount: 79.8,
        type: 'expense',
        category: 'Assinaturas',
        date: d(11),
        account: nubankAccount.id,
        source: 'manual',
      },
      {
        description: 'Jantar Restaurante Família',
        amount: 312.0,
        type: 'expense',
        category: 'Lazer',
        date: d(14),
        account: nubankAccount.id,
        source: 'manual',
      },
      {
        description: 'Farmácia Drogasil',
        amount: 145.5,
        type: 'expense',
        category: 'Saúde',
        date: d(16),
        account: bbAccount.id,
        source: 'manual',
      },
      {
        description: 'Feira Orgânica Semanal',
        amount: 180.0,
        type: 'expense',
        category: 'Alimentação',
        date: d(21),
        account: nubankAccount.id,
        source: 'manual',
      },
      {
        description: 'Curso Online de Finanças',
        amount: 297.0,
        type: 'expense',
        category: 'Educação',
        date: d(25),
        account: nubankAccount.id,
        source: 'manual',
      },
    ]

    for (const item of sampleTransactions) {
      try {
        app.findFirstRecordByData('transactions', 'description', item.description)
      } catch (_) {
        const rec = new Record(transactionsCol)
        rec.set('description', item.description)
        rec.set('amount', item.amount)
        rec.set('type', item.type)
        rec.set('category', item.category)
        rec.set('date', item.date)
        rec.set('account', item.account)
        rec.set('source', item.source)
        rec.set('user', userId)
        app.save(rec)
      }
    }

    // 4. Seed debts
    const futureDate = (daysAhead) => {
      const target = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
      return target.toISOString().split('T')[0] + ' 00:00:00.000Z'
    }

    let debtCard, debtCar, debtLoan
    try {
      debtCard = app.findFirstRecordByData('debts', 'name', 'Cartão de Crédito Nubank')
    } catch (_) {
      debtCard = new Record(debtsCol)
      debtCard.set('name', 'Cartão de Crédito Nubank')
      debtCard.set('creditor', 'Nubank')
      debtCard.set('total_amount', 4200.0)
      debtCard.set('remaining_amount', 1850.0)
      debtCard.set('interest_rate', 12.5)
      debtCard.set('monthly_payment', 450.0)
      debtCard.set('due_date', futureDate(8))
      debtCard.set('status', 'em_dia')
      debtCard.set('strategy', 'snowball')
      debtCard.set('user', userId)
      app.save(debtCard)
    }

    try {
      debtCar = app.findFirstRecordByData('debts', 'name', 'Financiamento do Carro')
    } catch (_) {
      debtCar = new Record(debtsCol)
      debtCar.set('name', 'Financiamento do Carro')
      debtCar.set('creditor', 'Banco Santander')
      debtCar.set('total_amount', 28000.0)
      debtCar.set('remaining_amount', 14200.0)
      debtCar.set('interest_rate', 1.89)
      debtCar.set('monthly_payment', 890.0)
      debtCar.set('due_date', futureDate(15))
      debtCar.set('status', 'em_dia')
      debtCar.set('strategy', 'avalanche')
      debtCar.set('user', userId)
      app.save(debtCar)
    }

    try {
      debtLoan = app.findFirstRecordByData('debts', 'name', 'Empréstimo Pessoal')
    } catch (_) {
      debtLoan = new Record(debtsCol)
      debtLoan.set('name', 'Empréstimo Pessoal')
      debtLoan.set('creditor', 'Banco do Brasil')
      debtLoan.set('total_amount', 8500.0)
      debtLoan.set('remaining_amount', 3100.0)
      debtLoan.set('interest_rate', 3.2)
      debtLoan.set('monthly_payment', 520.0)
      debtLoan.set('due_date', futureDate(24))
      debtLoan.set('status', 'em_dia')
      debtLoan.set('strategy', 'snowball')
      debtLoan.set('user', userId)
      app.save(debtLoan)
    }

    // 4b. Seed debt payment
    try {
      app.findFirstRecordByData('debt_payments', 'note', 'Pagamento parcela adiantada')
    } catch (_) {
      const dp = new Record(debtPaymentsCol)
      dp.set('debt', debtCard.id)
      dp.set('amount', 450.0)
      dp.set('date', d(10))
      dp.set('note', 'Pagamento parcela adiantada')
      dp.set('user', userId)
      app.save(dp)
    }

    // 5. Seed reserve_goals & contributions
    let reserveGoal
    try {
      reserveGoal = app.findFirstRecordByData(
        'reserve_goals',
        'title',
        'Reserva de Emergência Familiar',
      )
    } catch (_) {
      reserveGoal = new Record(reserveGoalsCol)
      reserveGoal.set('title', 'Reserva de Emergência Familiar')
      reserveGoal.set('target_amount', 12000.0)
      reserveGoal.set('monthly_contribution', 400.0)
      reserveGoal.set('deadline', futureDate(180))
      reserveGoal.set('user', userId)
      app.save(reserveGoal)
    }

    const sampleContribs = [
      { amount: 1500.0, date: d(45) },
      { amount: 1900.0, date: d(15) },
    ]
    for (const c of sampleContribs) {
      try {
        app.findFirstRecordByData('reserve_contributions', 'amount', c.amount)
      } catch (_) {
        const rec = new Record(reserveContribCol)
        rec.set('goal', reserveGoal.id)
        rec.set('amount', c.amount)
        rec.set('date', c.date)
        rec.set('user', userId)
        app.save(rec)
      }
    }

    // 6. Seed trip & trip_items
    let noronhaTrip
    try {
      noronhaTrip = app.findFirstRecordByData('trips', 'destination', 'Fernando de Noronha - PE')
    } catch (_) {
      noronhaTrip = new Record(tripsCol)
      noronhaTrip.set('destination', 'Fernando de Noronha - PE')
      noronhaTrip.set('start_date', futureDate(90))
      noronhaTrip.set('end_date', futureDate(97))
      noronhaTrip.set('budget', 9000.0)
      noronhaTrip.set('saved_amount', 3400.0)
      noronhaTrip.set('status', 'planejando')
      noronhaTrip.set('checklist', [
        { id: '1', task: 'Comprar passagens aéreas', done: true },
        { id: '2', task: 'Reservar pousada em Vila dos Remédios', done: true },
        { id: '3', task: 'Pagar taxa de preservação ambiental (TPA)', done: false },
        { id: '4', task: 'Agendar passeio de barco e mergulho', done: false },
        { id: '5', task: 'Separar roupas e equipamentos de snorkel', done: false },
      ])
      noronhaTrip.set('user', userId)
      app.save(noronhaTrip)
    }

    const sampleTripItems = [
      { description: 'Passagens Aéreas Ida e Volta', category: 'transporte', amount: 3200.0 },
      { description: 'Pousada Suíte Familiar (7 diárias)', category: 'hospedagem', amount: 3500.0 },
      { description: 'Restaurantes e Alimentação', category: 'alimentacao', amount: 1400.0 },
      {
        description: 'Mergulho de batismo + Passeio de Barco',
        category: 'passeios',
        amount: 900.0,
      },
    ]
    for (const item of sampleTripItems) {
      try {
        app.findFirstRecordByData('trip_items', 'description', item.description)
      } catch (_) {
        const rec = new Record(tripItemsCol)
        rec.set('trip', noronhaTrip.id)
        rec.set('description', item.description)
        rec.set('category', item.category)
        rec.set('amount', item.amount)
        rec.set('user', userId)
        app.save(rec)
      }
    }

    // 7. Seed initial weekly_reports
    try {
      app.findFirstRecordByData(
        'weekly_reports',
        'insight',
        'Excelente controle esta semana! Gastos fixos dentro da meta prevista.',
      )
    } catch (_) {
      const report = new Record(weeklyReportsCol)
      report.set('week_start', d(7))
      report.set('week_end', d(0))
      report.set('total_income', 6800.0)
      report.set('total_expense', 3968.7)
      report.set('net', 2831.3)
      report.set('insight', 'Excelente controle esta semana! Gastos fixos dentro da meta prevista.')
      report.set(
        'tip',
        "Abraham Hicks: 'A gratidão pelo que você já tem é o imã mais potente para a abundância.'\n\nJames: Você conseguiu manter suas despesas variáveis 18% abaixo da média. Esse excedente de R$ 2.831 abre caminho para amortizar a dívida com juros mais altos!",
      )
      report.set('user', userId)
      app.save(report)
    }

    // 8. Seed initial chat messages
    try {
      app.findFirstRecordByData(
        'chat_messages',
        'content',
        'Olá Adriana! Sou o James, seu consultor financeiro pessoal.',
      )
    } catch (_) {
      const m1 = new Record(chatMessagesCol)
      m1.set('role', 'agent')
      m1.set(
        'content',
        'Olá Adriana! Sou o James, seu consultor financeiro pessoal. Estou aqui 24 horas para ajudar sua família a eliminar dívidas, blindar a reserva de emergência e realizar a viagem dos sonhos em perfeita sintonia e paz de espírito. Como posso te ajudar hoje?',
      )
      m1.set('user', userId)
      app.save(m1)
    }
  },
  (app) => {
    // down migration
  },
)
