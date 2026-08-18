// Onda 5 — CRUD de Categorias.
//
// 1. Cria a coleção `categories` (nome, cor, ícone, is_default, user) e popula
//    com as categorias padrão do CATEGORY_META.
// 2. Converte `transactions.category` e `suppliers.category` de select -> text
//    para que categorias criadas dinamicamente pelo CRUD possam ser usadas.
//    (PocketBase preserva a coluna SQLite ao remover um campo, então os dados
//    existentes continuam intactos após a recriação como text.)
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // ---- 1. Cria coleção categories (se não existir) ----
    let catsCol
    try {
      catsCol = app.findCollectionByNameOrId('categories')
    } catch (_) {
      catsCol = new Collection({
        name: 'categories',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'color', type: 'text' },
          { name: 'icon', type: 'text' },
          { name: 'is_default', type: 'bool' },
          {
            name: 'user',
            type: 'relation',
            collectionId: usersCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_categories_name ON categories (name)'],
      })
      app.save(catsCol)
      catsCol = app.findCollectionByNameOrId('categories')
    }

    // ---- 2. Seed com as categorias padrão (idempotente por name) ----
    const SEED = [
      { name: 'Alimentação', color: '#FB923C', icon: 'UtensilsCrossed' },
      { name: 'Veículo', color: '#3B82F6', icon: 'Car' },
      { name: 'Saúde', color: '#EF4444', icon: 'HeartPulse' },
      { name: 'Moradia', color: '#A16207', icon: 'Home' },
      { name: 'Assinaturas', color: '#A855F7', icon: 'Repeat' },
      { name: 'Tecnologia', color: '#06B6D4', icon: 'Cpu' },
      { name: 'Business', color: '#EAB308', icon: 'Briefcase' },
      { name: 'Lazer', color: '#EC4899', icon: 'PartyPopper' },
      { name: 'Educação', color: '#22C55E', icon: 'GraduationCap' },
      { name: 'Pet', color: '#F59E0B', icon: 'PawPrint' },
      { name: 'Vestuário', color: '#8B5CF6', icon: 'Shirt' },
      { name: 'Transporte', color: '#14B8A6', icon: 'Bus' },
      { name: 'Seguros', color: '#0EA5E9', icon: 'Package' },
      { name: 'Consórcio', color: '#6366F1', icon: 'Landmark' },
      { name: 'Transferência', color: '#8B5CF6', icon: 'ArrowLeftRight' },
      { name: 'Tarifas', color: '#F43F5E', icon: 'Receipt' },
      { name: 'Pagamento de Cartão', color: '#D946EF', icon: 'CreditCard' },
      { name: 'Investimento', color: '#059669', icon: 'TrendingUp' },
      { name: 'Renda', color: '#10B981', icon: 'Briefcase' },
      { name: 'Outros', color: '#94A3B8', icon: 'Package' },
    ]

    for (let i = 0; i < SEED.length; i++) {
      const s = SEED[i]
      try {
        app.findFirstRecordByData('categories', 'name', s.name)
        continue
      } catch (_) {}
      const rec = new Record(catsCol)
      rec.set('name', s.name)
      rec.set('color', s.color)
      rec.set('icon', s.icon)
      rec.set('is_default', true)
      app.save(rec)
    }

    // ---- 3. Converte transactions.category: select -> text ----
    const txCol = app.findCollectionByNameOrId('transactions')
    const txCat = txCol.fields.getByName('category')
    if (txCat) {
      txCol.fields.removeById(txCat.id)
    }
    if (!txCol.fields.getByName('category')) {
      txCol.fields.add(new TextField({ name: 'category', required: true }))
    }
    app.save(txCol)

    // ---- 4. Converte suppliers.category: select -> text ----
    const supCol = app.findCollectionByNameOrId('suppliers')
    const supCat = supCol.fields.getByName('category')
    if (supCat) {
      supCol.fields.removeById(supCat.id)
    }
    if (!supCol.fields.getByName('category')) {
      supCol.fields.add(new TextField({ name: 'category' }))
    }
    app.save(supCol)

    console.log('Onda 5 - categories criada/seedada e campos category convertidos para text.')
  },
  (app) => {
    // downgrade: remove a coleção categories (não reverte select->text)
    try {
      const col = app.findCollectionByNameOrId('categories')
      app.delete(col)
    } catch (_) {}
  },
)
