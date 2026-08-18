// Onda 4 — Conciliação bancária: adiciona campos de anti-duplicata,
// categorização automática e conciliação às coleções existentes.
migrate(
  (app) => {
    // ---- transactions: status (review/imported/categorized), supplier, import_hash ----
    const txCol = app.findCollectionByNameOrId('transactions')
    if (!txCol.fields.getByName('status')) {
      txCol.fields.add(
        new SelectField({
          name: 'status',
          values: ['review', 'imported', 'categorized'],
          maxSelect: 1,
        }),
      )
    }
    if (!txCol.fields.getByName('supplier')) {
      txCol.fields.add(
        new RelationField({
          name: 'supplier',
          collectionId: app.findCollectionByNameOrId('suppliers').id,
          maxSelect: 1,
        }),
      )
    }
    if (!txCol.fields.getByName('import_hash')) {
      txCol.fields.add(new TextField({ name: 'import_hash' }))
    }
    txCol.addIndex('idx_tx_import_hash', false, 'import_hash', '')
    txCol.addIndex('idx_tx_status', false, 'status', '')
    app.save(txCol)

    // ---- document_imports: transactions_duplicated, bank_balance, period_start, period_end ----
    const diCol = app.findCollectionByNameOrId('document_imports')
    if (!diCol.fields.getByName('transactions_duplicated')) {
      diCol.fields.add(new NumberField({ name: 'transactions_duplicated' }))
    }
    if (!diCol.fields.getByName('bank_balance')) {
      diCol.fields.add(new NumberField({ name: 'bank_balance' }))
    }
    if (!diCol.fields.getByName('period_start')) {
      diCol.fields.add(new DateField({ name: 'period_start' }))
    }
    if (!diCol.fields.getByName('period_end')) {
      diCol.fields.add(new DateField({ name: 'period_end' }))
    }
    app.save(diCol)
  },
  (app) => {
    const txCol = app.findCollectionByNameOrId('transactions')
    try {
      txCol.removeIndex('idx_tx_import_hash')
    } catch (_) {}
    try {
      txCol.removeIndex('idx_tx_status')
    } catch (_) {}
    ;['status', 'supplier', 'import_hash'].forEach((n) => {
      const f = txCol.fields.getByName(n)
      if (f) txCol.fields.remove(f)
    })
    app.save(txCol)

    const diCol = app.findCollectionByNameOrId('document_imports')
    ;['transactions_duplicated', 'bank_balance', 'period_start', 'period_end'].forEach((n) => {
      const f = diCol.fields.getByName(n)
      if (f) diCol.fields.remove(f)
    })
    app.save(diCol)
  },
)
