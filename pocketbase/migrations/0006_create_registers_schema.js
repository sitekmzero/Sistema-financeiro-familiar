/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // ----------------------------------------------------------------
    // 1. suppliers (fornecedores)
    // ----------------------------------------------------------------
    const suppliers = new Collection({
      name: 'suppliers',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'cnpj', type: 'text' },
        {
          name: 'category',
          type: 'select',
          values: [
            'Veículo',
            'Alimentação',
            'Saúde',
            'Moradia',
            'Assinaturas',
            'Tecnologia',
            'Business',
            'Lazer',
            'Educação',
            'Pet',
            'Vestuário',
            'Transporte',
            'Seguros',
            'Outros',
          ],
          maxSelect: 1,
        },
        {
          name: 'recurrence',
          type: 'select',
          values: ['Mensal', 'Semanal', 'Esporádico', 'Anual'],
          maxSelect: 1,
        },
        { name: 'payment_method', type: 'text' },
        { name: 'notes', type: 'text' },
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
      indexes: ['CREATE INDEX idx_suppliers_user ON suppliers (user)'],
    })
    app.save(suppliers)

    // ----------------------------------------------------------------
    // 2. budgets (orçamentos)
    // ----------------------------------------------------------------
    const budgets = new Collection({
      name: 'budgets',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        { name: 'category', type: 'text', required: true },
        { name: 'monthly_limit', type: 'number', required: true },
        { name: 'month', type: 'text' },
        { name: 'alert_threshold', type: 'number' },
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
      indexes: ['CREATE INDEX idx_budgets_user_month ON budgets (user, month)'],
    })
    app.save(budgets)

    // ----------------------------------------------------------------
    // 3. family_members (membros da família)
    // ----------------------------------------------------------------
    const familyMembers = new Collection({
      name: 'family_members',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email' },
        {
          name: 'role',
          type: 'select',
          values: ['Titular', 'Cônjuge', 'Filho(a)'],
          maxSelect: 1,
        },
        { name: 'monthly_allowance', type: 'number' },
        { name: 'card_number', type: 'text' },
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
      indexes: ['CREATE INDEX idx_family_members_user ON family_members (user)'],
    })
    app.save(familyMembers)

    // ----------------------------------------------------------------
    // 4. Relax users list/view rules so family members can be listed
    //    (needed by the reports filter & cadastros pages to resolve
    //    transaction.user -> name).
    // ----------------------------------------------------------------
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    app.save(usersCol)
  },
  (app) => {
    const toDelete = ['family_members', 'budgets', 'suppliers']
    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      usersCol.listRule = 'id = @request.auth.id'
      usersCol.viewRule = 'id = @request.auth.id'
      app.save(usersCol)
    } catch (_) {}
  },
)
