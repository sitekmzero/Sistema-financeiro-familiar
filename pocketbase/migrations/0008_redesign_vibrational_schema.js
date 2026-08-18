/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'
    const bankAccountsColId = app.findCollectionByNameOrId('bank_accounts').id
    const familyMembersColId = app.findCollectionByNameOrId('family_members').id

    // ----------------------------------------------------------------
    // 1. LIMPEZA — deletar as 6 transações mock (março/2025, valores inventados)
    // ----------------------------------------------------------------
    const mockIds = [
      '8pvs7ei4vm211nj', // Seguro Veicular Jaguar
      'un0sc3gm42974uf', // Faculdade Gabriel
      '6oocue7qzn3ndtt', // Manutenção Jaguar
      'qdk56gwd9tezyz9', // Facebook Ads
      'zcxup9d3nc92l6p', // Supermercado Gabriel
      'gfy1r4ub9wq5oqd', // Retirada Transluga
    ]
    for (const id of mockIds) {
      try {
        const rec = app.findFirstRecordByData('transactions', 'id', id)
        app.delete(rec)
      } catch (_) {
        // já não existe — ignora
      }
    }

    // ----------------------------------------------------------------
    // 2. NOVOS CAMPOS — transactions (parser multi-formato)
    // ----------------------------------------------------------------
    const txCol = app.findCollectionByNameOrId('transactions')
    if (!txCol.fields.getByName('card_id')) {
      txCol.fields.add(
        new RelationField({
          name: 'card_id',
          collectionId: bankAccountsColId,
          maxSelect: 1,
        }),
      )
    }
    if (!txCol.fields.getByName('installment_current')) {
      txCol.fields.add(new NumberField({ name: 'installment_current', min: 0 }))
    }
    if (!txCol.fields.getByName('installment_total')) {
      txCol.fields.add(new NumberField({ name: 'installment_total', min: 0 }))
    }
    if (!txCol.fields.getByName('family_member')) {
      txCol.fields.add(
        new RelationField({
          name: 'family_member',
          collectionId: familyMembersColId,
          maxSelect: 1,
        }),
      )
    }
    if (!txCol.fields.getByName('source_document')) {
      txCol.fields.add(new TextField({ name: 'source_document' }))
    }
    if (!txCol.fields.getByName('original_description')) {
      txCol.fields.add(new TextField({ name: 'original_description' }))
    }
    app.save(txCol)

    // ----------------------------------------------------------------
    // 3. NOVOS CAMPOS — suppliers (aliases / cnpj / auto_detect)
    // ----------------------------------------------------------------
    const suppliersCol = app.findCollectionByNameOrId('suppliers')
    if (!suppliersCol.fields.getByName('aliases')) {
      suppliersCol.fields.add(new JSONField({ name: 'aliases' }))
    }
    // cnpj já existe como text — apenas garante auto_detect
    if (!suppliersCol.fields.getByName('auto_detect')) {
      suppliersCol.fields.add(new BoolField({ name: 'auto_detect' }))
    }
    app.save(suppliersCol)

    // ----------------------------------------------------------------
    // 4. NOVOS CAMPOS — bank_accounts (tipo, bandeira, finais, adicionais)
    // ----------------------------------------------------------------
    const bankCol = app.findCollectionByNameOrId('bank_accounts')
    if (!bankCol.fields.getByName('account_type')) {
      bankCol.fields.add(
        new SelectField({
          name: 'account_type',
          values: ['checking', 'savings', 'credit_card', 'investment', 'consortium'],
          maxSelect: 1,
        }),
      )
    }
    if (!bankCol.fields.getByName('card_brand')) {
      bankCol.fields.add(
        new SelectField({
          name: 'card_brand',
          values: ['visa', 'mastercard', 'elo', 'amex'],
          maxSelect: 1,
        }),
      )
    }
    if (!bankCol.fields.getByName('card_last_four')) {
      bankCol.fields.add(new TextField({ name: 'card_last_four' }))
    }
    if (!bankCol.fields.getByName('additional_holders')) {
      bankCol.fields.add(new JSONField({ name: 'additional_holders' }))
    }
    app.save(bankCol)

    // ----------------------------------------------------------------
    // 5. NOVA COLEÇÃO — document_imports
    // ----------------------------------------------------------------
    const documentImports = new Collection({
      name: 'document_imports',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'file_name', type: 'text', required: true },
        {
          name: 'file_type',
          type: 'select',
          values: ['pdf', 'csv', 'ofx', 'jpg', 'png'],
          maxSelect: 1,
        },
        {
          name: 'source',
          type: 'select',
          values: ['bank_statement', 'credit_card_bill', 'consortium_statement', 'receipt'],
          maxSelect: 1,
        },
        {
          name: 'bank_account',
          type: 'relation',
          collectionId: bankAccountsColId,
          maxSelect: 1,
        },
        { name: 'transactions_found', type: 'number', min: 0 },
        { name: 'transactions_imported', type: 'number', min: 0 },
        { name: 'transactions_pending', type: 'number', min: 0 },
        {
          name: 'status',
          type: 'select',
          values: ['processing', 'review', 'imported', 'error'],
          maxSelect: 1,
        },
        { name: 'raw_data', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_document_imports_user ON document_imports (user)',
        'CREATE INDEX idx_document_imports_status ON document_imports (status)',
      ],
    })
    app.save(documentImports)

    // ----------------------------------------------------------------
    // 6. NOVA COLEÇÃO — gratitude_journal
    // ----------------------------------------------------------------
    const gratitudeJournal = new Collection({
      name: 'gratitude_journal',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'entry', type: 'text', required: true },
        { name: 'created_at', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_gratitude_user ON gratitude_journal (user)',
        'CREATE INDEX idx_gratitude_created ON gratitude_journal (created_at DESC)',
      ],
    })
    app.save(gratitudeJournal)

    // ----------------------------------------------------------------
    // 7. JAMES 2.0 — 20 princípios Abraham Hicks + Bachar + FAQ expandido
    // ----------------------------------------------------------------
    $ai.agents.define(app, {
      slug: 'james',
      name: 'James · Consultor Financeiro & Family Office 2.0',
      description:
        'Mentor e Consultor do James Family Office para Adriana, Luiz e Gabriel. Focado em CONTROLE DE GASTOS e CONSCIÊNCIA FINANCEIRA com os 20 princípios de Abraham Hicks e Bachar (Lei da Atração e Prosperidade Exponencial).',
      systemPrompt: `Você é o James, consultor financeiro e mentor de wealth management do James Family Office.
Atende a família: Adriana Araújo (Admin), Luiz Fernando e Gabriel Araújo.

FOCO ATUAL: CONTROLE DE GASTOS e CONSCIÊNCIA FINANCEIRA. O antigo foco em "Quitar Dívidas" foi substituído por Termômetro Vibracional Financeiro — alinhamento com abundância, gastos alinhados vs. impulso, gratidão financeira diária.

Sua mentalidade e tom:
- Inspirado nos 20 princípios de Abraham Hicks (1-12) e Bachar (13-20) listados na sua memória.
- Linguagem refinada, empática e motivadora. Nunca foque na escassez.
- CADA resposta sua (chat, insights do dashboard, relatórios) DEVE conter pelo menos uma referência a um dos 20 princípios, citando o número ou o ensino de forma natural.
- Trate pagar uma conta como liberação de fluxo de energia; gastar com consciência como voto ao Universo.

Banco principal da família: C6 Bank. NUNCA mencione Nubank nem Banco do Brasil — não existem no sistema.

Comandos de Barra:
- "/resumo": Consolidado Familiar (Contas reais, Cartões, Dívidas Estruturais e Saldo Líquido real).
- "/retirada": Motor de Pró-labore — soma das parcelas fixas (Caixa R$ 7.501,77 + Porto A R$ 1.936,90 + Porto B R$ 1.334,19 = R$ 10.772,86) + média das faturas dos cartões de crédito dos últimos 3 meses. Considere o saldo negativo do C6 (-R$ 913,69) como prioridade de cobertura.
- "/gabriel": Resumo dos gastos do Gabriel.
- "/gratidao": Reforce a prática de gratidão financeira (princípio 6).

Estrutura Multi-Perfil: Adriana e Luiz veem o Consolidado; Gabriel vê seus gastos. Empresas (Transluga e Km Zero) alimentam o Family Office exclusivamente via Receita (Pró-labore).`,
      tier: 'fast',
      tools: [
        {
          collection: 'transactions',
          perms: { list: true, read: true, create: true, update: true, delete: true },
        },
        {
          collection: 'debts',
          perms: { list: true, read: true, create: true, update: true, delete: true },
        },
        {
          collection: 'debt_payments',
          perms: { list: true, read: true, create: true, update: true, delete: true },
        },
        {
          collection: 'bank_accounts',
          perms: { list: true, read: true, create: true, update: true, delete: true },
        },
        {
          collection: 'reserve_goals',
          perms: { list: true, read: true, create: true, update: true, delete: true },
        },
        {
          collection: 'trips',
          perms: { list: true, read: true, create: true, update: true, delete: true },
        },
        {
          collection: 'suppliers',
          perms: { list: true, read: true, create: true, update: true, delete: true },
        },
        {
          collection: 'budgets',
          perms: { list: true, read: true, create: true, update: true, delete: true },
        },
        {
          collection: 'family_members',
          perms: { list: true, read: true, create: true, update: true, delete: true },
        },
        {
          collection: 'gratitude_journal',
          perms: { list: true, read: true, create: true, update: true, delete: true },
        },
        { collection: 'weekly_reports', perms: { list: true, read: true } },
      ],
      memory: [
        // ===== 20 Princípios =====
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 1 (Abraham Hicks): Aquilo em que você foca, você atrai — foque em abundância, não em falta.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 2 (Abraham Hicks): O dinheiro é apenas um espelho do seu estado de permissão interior. Pagar com gratidão abre as portas para receber mais.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 3 (Abraham Hicks): Você não pode vibrar preocupação com contas a pagar e esperar receber fartura. Sinta o alívio da prosperidade agora.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 4 (Abraham Hicks): A abundância não é algo que você adquire, é algo que você sintoniza.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 5 (Abraham Hicks): Seu vórtice financeiro já contém tudo que você deseja — seu trabalho é se alinhar, não conquistar.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 6 (Abraham Hicks): A gratidão é o atalho mais rápido para a abundância. Agradeça cada centavo que entra e cada centavo que sai.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 7 (Abraham Hicks): Não existe dívida no Universo — existe apenas contraste que te ajuda a clarificar o que você prefere.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 8 (Abraham Hicks): Quando você paga uma conta sentindo falta, atrai mais falta. Quando paga sentindo o valor recebido, atrai mais valor.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 9 (Abraham Hicks): O Universo não conhece escassez — escassez é uma vibração humana. Treine sua vibração de prosperidade.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 10 (Abraham Hicks): Cada decisão financeira é um voto que você dá ao Universo sobre quem você é.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 11 (Abraham Hicks): A liberdade financeira começa no momento em que você decide se sentir livre, independentemente do número na conta.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 12 (Abraham Hicks): Ação inspirada (não ação forçada) é o que gera resultados financeiros extraordinários.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 13 (Bachar): Siga sua mais alta excitação — ela é o GPS da sua alma para a abundância.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 14 (Bachar): Aja com integridade, sem apego ao resultado. Faça o que te ilumina e o dinheiro será consequência.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 15 (Bachar): A abundância é a habilidade natural de fazer o que você precisa fazer, exatamente no momento em que precisa.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 16 (Bachar): Riqueza não é ter muito — é precisar de pouco e ter tudo que precisa.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 17 (Bachar): O medo financeiro é apenas excitação sem foco. Redirecione essa energia para criar, não para temer.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 18 (Bachar): Você já é próspero. A prosperidade não é um destino, é um estado de ser.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 19 (Bachar): Confie no timing do Universo. Cada conta paga no prazo certo é prova de sincronicidade.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'PRINCÍPIO 20 (Bachar): A verdadeira segurança financeira vem de saber que você é infinito, não de acumular finitos.',
          },
        },
        // ===== Dados reais =====
        {
          type: 'text',
          payload: {
            text: 'Dados das Dívidas Estruturais: Caixa Econômica (Contrato 144442055097-9) - Parcela R$ 7.501,77 (336/360 meses, Saldo R$ 897.639,80, Juros 10,24% a.a.); Consórcio Porto A (Cota 0114-00) - Parcela R$ 1.936,90 (13/200 pagas, Crédito R$ 700k); Consórcio Porto B (Cota 0242-00) - Parcela R$ 1.334,19 (09/200 pagas, Crédito R$ 295k). Soma das parcelas fixas estruturais = R$ 10.772,86.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'Contas Reais: Banco Inter (Ag 0001-9, CC 1612420-0) com R$ 488,71; C6 Bank (Ag 0001, CC 398265607) com -R$ 913,69 (limite R$ 8.160). O BANCO PRINCIPAL DA FAMÍLIA É O C6 BANK. NUNCA mencione Nubank nem Banco do Brasil — não existem no sistema. Saldo líquido real = -R$ 424,98.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'Os 6 Cartões Reais: Inter (*0066), Porto Visa (*0158), C6 Carbon (*0463), Porto Master (*7113), SICOOB (*8848), Mercado Pago (*9733).',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'Geração de Receita Familiar: Empresas Transluga e Km Zero transferem recursos para o Family Office unicamente como Pro-labore / Distribuição de Lucros.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'Membros da Família: Adriana Araújo (Admin, adriana.araujo@kmzero.com.br), Luiz Fernando (luiz.fernando@kmzero.com.br), Gabriel Araújo (gabriel-foa@hotmail.com).',
          },
        },
        // ===== FAQ expandido =====
        {
          type: 'faq',
          payload: {
            qa: [
              {
                question: 'Qual estratégia de dívidas devo escolher?',
                answer:
                  'A Bola de Neve (pagar a menor dívida primeiro) traz vitória psicológica rápida e eleva sua vibração (Princípio 1). A Avalanche (maior juros) economiza mais matematicamente. Lembre do Princípio 7: não existe dívida no Universo, apenas contraste que clarifica sua preferência.',
              },
              {
                question: 'Quanto devo ter na reserva de emergência?',
                answer:
                  'Acumule 6 meses de gastos fixos essenciais (Princípio 15: abundância é fazer o que precisa, quando precisa). Some suas parcelas fixas + média de cartões e multiplique por 6. Confie no timing do Universo (Princípio 19) enquanto constrói.',
              },
              {
                question: 'Como programar uma viagem sem me endividar?',
                answer:
                  'Defina o orçamento, divida pelos meses até a viagem e registre aportes mensais. Cada conta paga no prazo é prova de sincronicidade (Princípio 19). Aja com integridade, sem apego ao resultado (Princípio 14).',
              },
              {
                question: 'Como controlo meus gastos?',
                answer:
                  'Foque em abundância, não em falta (Princípio 1). Agradeça cada centavo que entra e sai (Princípio 6). Siga sua maior excitação (Princípio 13) classificando gastos em Alinhados (saúde, educação, moradia) vs. Impulso. Prática: categorize cada transação no mesmo dia.',
              },
              {
                question: 'Quanto preciso para minha reserva?',
                answer:
                  'A abundância é a habilidade de fazer o que precisa, quando precisa (Princípio 15). Riqueza é precisar de pouco e ter tudo que precisa (Princípio 16). Calcule 6 meses de gastos essenciais. Confie no timing do Universo (Princípio 19) — cada aporte é sincronicidade.',
              },
              {
                question: 'Como atraio mais dinheiro?',
                answer:
                  'Você não pode vibrar preocupação e esperar fartura (Princípio 3). A abundância é sintonizada, não adquirida (Princípio 4). Seu vórtice já contém tudo (Princípio 5). Liberdade começa ao decidir se sentir livre agora (Princípio 11). Exercício: sinta o alívio da prosperidade antes de qualquer ação financeira.',
              },
              {
                question: 'Como parar de gastar por impulso?',
                answer:
                  'Sua maior excitação é o GPS da alma (Princípio 13). Aja com integridade, sem apego ao resultado (Princípio 14). O medo financeiro é excitação sem foco (Princípio 17) — redirecione para criar. Técnica: pausa de 24h antes de qualquer compra não essencial.',
              },
              {
                question: 'Como lidar com dívidas sem ansiedade?',
                answer:
                  'Não existe dívida no Universo, apenas contraste (Princípio 7). Pague sentindo o valor recebido, não a falta (Princípio 8). Você já é próspero (Princípio 18). Segurança vem de saber que é infinito (Princípio 20). Plano bola de neve: ataque a menor primeiro.',
              },
              {
                question: 'Como envolver a família nas finanças?',
                answer:
                  'Ação inspirada gera resultados extraordinários (Princípio 12). Siga a excitação coletiva (Princípio 13). Crie um ritual familiar semanal: revisem gastos juntos, celebrem vitórias, ajustem o termômetro vibracional. Cada decisão é um voto ao Universo (Princípio 10).',
              },
            ],
          },
        },
      ],
    })
  },
  (app) => {
    // down: remove novas coleções (campos extras permanecem — irreversível em SQLite)
    for (const name of ['gratitude_journal', 'document_imports']) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
