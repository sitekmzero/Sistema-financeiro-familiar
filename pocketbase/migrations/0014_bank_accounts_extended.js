// Onda 5 — Tela de Contas & Cartões.
//
// Adiciona à coleção `bank_accounts` os campos necessários para o cadastro
// detalhado por tipo de conta (corrente, poupança, cartão, investimento, consórcio).
// Todos os novos campos são opcionais — registros antigos continuam funcionando.
// NÃO migra o schema existente, apenas estende.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('bank_accounts')
    const banksCol = app.findCollectionByNameOrId('banks')
    const membersCol = app.findCollectionByNameOrId('family_members')

    const addField = (field) => {
      if (!col.fields.getByName(field.name)) {
        col.fields.add(field)
      }
    }

    // Relation -> banks
    addField(
      new RelationField({
        name: 'bank',
        collectionId: banksCol.id,
        cascadeDelete: false,
        maxSelect: 1,
      }),
    )

    // Conta corrente / poupança
    addField(new TextField({ name: 'agency' }))
    addField(new TextField({ name: 'account_number' }))
    addField(new NumberField({ name: 'overdraft_limit' }))
    addField(new NumberField({ name: 'interest_rate' }))
    addField(new NumberField({ name: 'savings_rate' }))

    // Cartão de crédito
    addField(new NumberField({ name: 'credit_limit' }))
    addField(
      new SelectField({
        name: 'card_holder_type',
        values: ['titular', 'adicional'],
        maxSelect: 1,
      }),
    )
    addField(
      new RelationField({
        name: 'card_holder',
        collectionId: membersCol.id,
        cascadeDelete: false,
        maxSelect: 1,
      }),
    )
    addField(new NumberField({ name: 'closing_day' }))
    addField(new NumberField({ name: 'due_day' }))

    // Investimento
    addField(
      new SelectField({
        name: 'investment_type',
        values: [
          'CDB',
          'Tesouro',
          'Ações',
          'FIIs',
          'LCI-LCA',
          'Previdência',
          'Fundos',
          'Poupança',
          'Cripto',
          'Outros',
        ],
        maxSelect: 1,
      }),
    )
    addField(new NumberField({ name: 'invested_amount' }))
    addField(new TextField({ name: 'yield_description' }))
    addField(new NumberField({ name: 'yield_rate' }))
    addField(
      new SelectField({
        name: 'liquidity',
        values: ['Diária', 'No vencimento', 'D+30', 'D+90', 'Indefinida'],
        maxSelect: 1,
      }),
    )
    addField(new DateField({ name: 'maturity_date' }))
    addField(
      new SelectField({
        name: 'indexer',
        values: ['CDI', 'IPCA', 'Selic', 'Prefixado', 'IGP-M'],
        maxSelect: 1,
      }),
    )

    // Consórcio
    addField(new TextField({ name: 'consortium_admin' }))
    addField(new NumberField({ name: 'consortium_quota' }))
    addField(new NumberField({ name: 'consortium_credit' }))
    addField(new NumberField({ name: 'installments_paid' }))
    addField(new NumberField({ name: 'installments_total' }))

    // Status
    addField(
      new SelectField({
        name: 'status',
        values: ['active', 'inactive', 'blocked'],
        maxSelect: 1,
      }),
    )

    app.save(col)

    console.log(
      'Onda 5 - bank_accounts estendida com campos de contas/cartões/investimentos/consórcios.',
    )
  },
  (app) => {
    // downgrade: remove apenas os campos adicionados (best-effort)
    const col = app.findCollectionByNameOrId('bank_accounts')
    const names = [
      'bank',
      'agency',
      'account_number',
      'overdraft_limit',
      'interest_rate',
      'savings_rate',
      'credit_limit',
      'card_holder_type',
      'card_holder',
      'closing_day',
      'due_day',
      'investment_type',
      'invested_amount',
      'yield_description',
      'yield_rate',
      'liquidity',
      'maturity_date',
      'indexer',
      'consortium_admin',
      'consortium_quota',
      'consortium_credit',
      'installments_paid',
      'installments_total',
      'status',
    ]
    names.forEach((n) => {
      const f = col.fields.getByName(n)
      if (f) col.fields.removeById(f.id)
    })
    app.save(col)
  },
)
