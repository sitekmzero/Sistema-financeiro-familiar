/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. bank_accounts
    const bankAccounts = new Collection({
      name: 'bank_accounts',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'bank_name', type: 'text' },
        { name: 'balance', type: 'number' },
        { name: 'color', type: 'text' },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_bank_accounts_user ON bank_accounts (user)'],
    })
    app.save(bankAccounts)

    // 2. transactions
    const transactions = new Collection({
      name: 'transactions',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        { name: 'description', type: 'text', required: true },
        { name: 'amount', type: 'number', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['income', 'expense'],
          maxSelect: 1,
        },
        {
          name: 'category',
          type: 'select',
          required: true,
          values: [
            'Alimentação',
            'Transporte',
            'Moradia',
            'Saúde',
            'Lazer',
            'Educação',
            'Assinaturas',
            'Renda',
            'Outros',
          ],
          maxSelect: 1,
        },
        { name: 'date', type: 'date', required: true },
        { name: 'account', type: 'relation', collectionId: bankAccounts.id, maxSelect: 1 },
        {
          name: 'source',
          type: 'select',
          values: ['manual', 'pdf', 'whatsapp', 'agent'],
          maxSelect: 1,
        },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_tx_user_date ON transactions (user, date DESC)',
        'CREATE INDEX idx_tx_category ON transactions (category)',
        'CREATE INDEX idx_tx_type ON transactions (type)',
      ],
    })
    app.save(transactions)

    // 3. debts
    const debts = new Collection({
      name: 'debts',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'creditor', type: 'text' },
        { name: 'total_amount', type: 'number', required: true },
        { name: 'remaining_amount', type: 'number', required: true },
        { name: 'interest_rate', type: 'number' },
        { name: 'monthly_payment', type: 'number' },
        { name: 'due_date', type: 'date' },
        { name: 'status', type: 'select', values: ['em_dia', 'atrasada', 'paga'], maxSelect: 1 },
        { name: 'strategy', type: 'select', values: ['snowball', 'avalanche'], maxSelect: 1 },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_debts_user_status ON debts (user, status)',
        'CREATE INDEX idx_debts_due_date ON debts (due_date)',
      ],
    })
    app.save(debts)

    // 4. debt_payments
    const debtPayments = new Collection({
      name: 'debt_payments',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'debt',
          type: 'relation',
          required: true,
          collectionId: debts.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'amount', type: 'number', required: true },
        { name: 'date', type: 'date' },
        { name: 'note', type: 'text' },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_debt_payments_user_debt ON debt_payments (user, debt)'],
    })
    app.save(debtPayments)

    // 5. reserve_goals
    const reserveGoals = new Collection({
      name: 'reserve_goals',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'target_amount', type: 'number', required: true },
        { name: 'monthly_contribution', type: 'number' },
        { name: 'deadline', type: 'date' },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_reserve_goals_user ON reserve_goals (user)'],
    })
    app.save(reserveGoals)

    // 6. reserve_contributions
    const reserveContributions = new Collection({
      name: 'reserve_contributions',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'goal',
          type: 'relation',
          required: true,
          collectionId: reserveGoals.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'amount', type: 'number', required: true },
        { name: 'date', type: 'date' },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_reserve_contrib_user_goal ON reserve_contributions (user, goal)'],
    })
    app.save(reserveContributions)

    // 7. trips
    const trips = new Collection({
      name: 'trips',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        { name: 'destination', type: 'text', required: true },
        { name: 'start_date', type: 'date' },
        { name: 'end_date', type: 'date' },
        { name: 'budget', type: 'number', required: true },
        { name: 'saved_amount', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['planejando', 'reservado', 'finalizada'],
          maxSelect: 1,
        },
        { name: 'checklist', type: 'json' },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_trips_user_start ON trips (user, start_date)'],
    })
    app.save(trips)

    // 8. trip_items
    const tripItems = new Collection({
      name: 'trip_items',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'trip',
          type: 'relation',
          required: true,
          collectionId: trips.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'description', type: 'text' },
        {
          name: 'category',
          type: 'select',
          values: ['transporte', 'hospedagem', 'alimentacao', 'passeios', 'extras'],
          maxSelect: 1,
        },
        { name: 'amount', type: 'number' },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_trip_items_user_trip ON trip_items (user, trip)'],
    })
    app.save(tripItems)

    // 9. documents
    const documents = new Collection({
      name: 'documents',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        { name: 'filename', type: 'text' },
        {
          name: 'file',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ['application/pdf'],
        },
        {
          name: 'status',
          type: 'select',
          values: ['parsing', 'review', 'imported', 'failed'],
          maxSelect: 1,
        },
        { name: 'parsed_text', type: 'text' },
        { name: 'import_data', type: 'json' },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_documents_user ON documents (user)'],
    })
    app.save(documents)

    // 10. chat_messages
    const chatMessages = new Collection({
      name: 'chat_messages',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        { name: 'role', type: 'select', required: true, values: ['user', 'agent'], maxSelect: 1 },
        { name: 'content', type: 'text', required: true },
        { name: 'command', type: 'text' },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_chat_messages_user_created ON chat_messages (user, created DESC)',
      ],
    })
    app.save(chatMessages)

    // 11. weekly_reports
    const weeklyReports = new Collection({
      name: 'weekly_reports',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        { name: 'week_start', type: 'date' },
        { name: 'week_end', type: 'date' },
        { name: 'total_income', type: 'number' },
        { name: 'total_expense', type: 'number' },
        { name: 'net', type: 'number' },
        { name: 'insight', type: 'text' },
        { name: 'tip', type: 'text' },
        { name: 'vector', type: 'vector', dimensions: 1536, distance: 'cosine' },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_weekly_reports_user_week ON weekly_reports (user, week_start DESC)',
      ],
    })
    app.save(weeklyReports)
  },
  (app) => {
    const toDelete = [
      'weekly_reports',
      'chat_messages',
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
    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
