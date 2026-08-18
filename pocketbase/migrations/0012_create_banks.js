// Onda 4 (pós) — C3: Criar tabela `banks`.
//
// Cria a coleção `banks` (instituições financeiras) com nome, código Febraban,
// ISPB, logo e cor. Popula com os bancos que a Adriana já usa (C6, Inter, SICOOB).
//
// NÃO migra `bank_accounts` — isso será feito numa etapa futura (D1/D2).
// A tabela é pré-requisito (C3) para o parser multi-banco (C4).
migrate(
  (app) => {
    const userId = 'flultn0n16u09bh'
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // ---- 1. Cria coleção banks ----
    const banks = new Collection({
      name: 'banks',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'code', type: 'text', required: true },
        { name: 'ispb', type: 'text' },
        { name: 'logo_url', type: 'text' },
        { name: 'color', type: 'text' },
        {
          name: 'user',
          type: 'relation',
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_banks_code ON banks (code)'],
    })
    app.save(banks)

    // ---- 2. Popula com os bancos da Adriana ----
    const banksCol = app.findCollectionByNameOrId('banks')

    const SEED = [
      {
        name: 'C6 Bank',
        code: '336',
        ispb: '31872495',
        logo_url: 'https://img.usecurling.com/i?q=c6%20bank',
        color: '#111923',
      },
      {
        name: 'Banco Inter',
        code: '077',
        ispb: '01639292',
        logo_url: 'https://img.usecurling.com/i?q=banco%20inter',
        color: '#FF7A00',
      },
      {
        name: 'SICOOB',
        code: '756',
        ispb: '02233588',
        logo_url: 'https://img.usecurling.com/i?q=sicoob',
        color: '#00A859',
      },
    ]

    for (let i = 0; i < SEED.length; i++) {
      const b = SEED[i]
      // idempotente: pula se já existe (índice unique em code)
      try {
        app.findFirstRecordByData('banks', 'code', b.code)
        continue
      } catch (_) {}
      const rec = new Record(banksCol)
      rec.set('name', b.name)
      rec.set('code', b.code)
      rec.set('ispb', b.ispb)
      rec.set('logo_url', b.logo_url)
      rec.set('color', b.color)
      rec.set('user', userId)
      app.save(rec)
    }

    console.log('C3 - tabela banks criada e populada com ' + SEED.length + ' bancos.')
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('banks')
      app.delete(col)
    } catch (_) {}
  },
)
