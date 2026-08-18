// Onda 4 — Processa o extrato real do C6 Bank (180 dias, até 18/08/2026).
// Conta: Ag 0001, CC 398265607. Titular: Adriana de Freitas Oliveira Araújo.
//
// As transações abaixo foram extraídas da leitura do PDF do extrato C6.
// Cada linha: "dd/mm|tipo|descrição|valor" onde tipo = + (entrada) ou - (saída).
// O pipeline aplica anti-duplicata + categorização automática (igual ao hook
// document_import.js). Nenhum número é inventado — todos vêm do PDF.
migrate(
  (app) => {
    const userId = 'flultn0n16u09bh'
    const c6AccountId = 'urnya4codhkyqwk'

    // Verifica se já foi importado (idempotente)
    try {
      app.findFirstRecordByData('document_imports', 'file_name', 'extrato-c6-180-dias.pdf')
      return // já processado
    } catch (_) {}

    // ---- helpers inline ----
    const pad = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    const norm = function (s) {
      return (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }
    const normDesc = function (s) {
      return norm(s)
        .replace(/^pix (recebido de|enviado para|enviado de|recebido para)\s+/, '')
        .replace(/^recorrencia pix enviada para\s+/, '')
        .replace(/^pix /, '')
        .trim()
    }
    const levenshtein = function (a, b) {
      const m = a.length,
        n = b.length
      if (m === 0) return n
      if (n === 0) return m
      let prev = [],
        curr = []
      for (let j = 0; j <= n; j++) prev[j] = j
      for (let i = 1; i <= m; i++) {
        curr[0] = i
        for (let j = 1; j <= n; j++) {
          const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
          curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
        }
        const tmp = prev
        prev = curr
        curr = tmp
      }
      return prev[n]
    }
    const similarity = function (a, b) {
      const A = (a || '').toLowerCase().trim(),
        B = (b || '').toLowerCase().trim()
      if (!A || !B) return 0
      if (A === B) return 1
      return 1 - levenshtein(A, B) / Math.max(A.length, B.length)
    }

    const TX_CATEGORIES = [
      'Alimentação',
      'Transporte',
      'Moradia',
      'Saúde',
      'Lazer',
      'Educação',
      'Assinaturas',
      'Renda',
      'Outros',
    ]
    const mapSupplierCategory = function (cat) {
      if (!cat) return 'Outros'
      const c = cat.toLowerCase()
      if (c === 'veículo' || c === 'transporte') return 'Transporte'
      if (c === 'alimentação') return 'Alimentação'
      if (c === 'saúde') return 'Saúde'
      if (c === 'moradia' || c === 'seguros') return 'Moradia'
      if (c === 'assinaturas') return 'Assinaturas'
      if (c === 'lazer') return 'Lazer'
      if (c === 'educação') return 'Educação'
      return 'Outros'
    }

    const KEYWORD_CATEGORIES = [
      {
        cat: 'Alimentação',
        words: [
          'ifood',
          'quitandas',
          'vovo tuta',
          'mercado',
          'supermercado',
          'padaria',
          'restaurante',
          'senhor parm',
          'lanche',
          'pizzaria',
        ],
      },
      {
        cat: 'Transporte',
        words: [
          'posto',
          'shell',
          'ipiranga',
          'petrobras',
          'estacionamento',
          'multiplan estacionamento',
          'uber',
          'carro e cia',
          'combustivel',
          'abastece',
        ],
      },
      {
        cat: 'Saúde',
        words: [
          'farmacia',
          'drogasil',
          'drogaria',
          'consultorio',
          'dentista',
          'medico',
          'clinica',
          'laboratorio',
          'miss hanna',
        ],
      },
      {
        cat: 'Moradia',
        words: [
          'aluguel',
          'condominio',
          'iptu',
          'energia',
          'cpfl',
          'agua',
          'sabesp',
          'gas',
          'internet',
          'seguro',
          'allianz',
          'portoseg',
          'porto seg',
          'consorcio',
          'financiamento',
        ],
      },
      {
        cat: 'Assinaturas',
        words: [
          'netflix',
          'spotify',
          'prime video',
          'amazon',
          'globoplay',
          'hbo',
          'disney',
          'youtube',
          'google',
          'apple',
          'icloud',
          'microsoft',
          'office',
          'chatgpt',
          'openai',
          'adobe',
          'canva',
          'nic br',
          'registro br',
        ],
      },
      {
        cat: 'Educação',
        words: ['escola', 'colegio', 'curso', 'udemy', 'alura', 'faculdade', 'aluno'],
      },
      {
        cat: 'Lazer',
        words: ['cinema', 'teatro', 'viagem', 'hotel', 'airbnb', 'parque', 'show', 'ingresso'],
      },
      {
        cat: 'Renda',
        words: [
          'resgate de cdb',
          'salario',
          'pro labore',
          'prolabore',
          'rendimento',
          'juros',
          'dividendo',
          'cashback',
          'credito boleto',
          'transluga',
          'km zero',
          'quilocentro zero',
          'quilometro zero',
        ],
      },
    ]
    const keywordCategory = function (desc) {
      const d = normDesc(desc)
      for (let i = 0; i < KEYWORD_CATEGORIES.length; i++) {
        for (let w = 0; w < KEYWORD_CATEGORIES[i].words.length; w++) {
          if (d.indexOf(norm(KEYWORD_CATEGORIES[i].words[w])) !== -1)
            return KEYWORD_CATEGORIES[i].cat
        }
      }
      return ''
    }

    // ---- suppliers do usuário ----
    let suppliers = []
    try {
      suppliers = app.findRecordsByFilter('suppliers', 'user = {:uid}', 'name', 500, 0, {
        uid: userId,
      })
    } catch (_) {}
    const matchSupplier = function (desc) {
      const d = normDesc(desc)
      if (!d) return null
      for (let i = 0; i < suppliers.length; i++) {
        const s = suppliers[i]
        const name = norm(s.getString('name'))
        if (!name) continue
        if (d.indexOf(name) !== -1 || name.indexOf(d) !== -1) return s
        let aliases = []
        try {
          aliases = JSON.parse(s.getString('aliases') || '[]')
        } catch (_) {}
        for (let j = 0; j < aliases.length; j++) {
          const al = norm(aliases[j])
          if (al && (d.indexOf(al) !== -1 || al.indexOf(d) !== -1)) return s
        }
      }
      let best = null,
        bestSim = 0.85
      for (let i = 0; i < suppliers.length; i++) {
        const name = norm(suppliers[i].getString('name'))
        if (!name) continue
        const sim = similarity(d, name)
        if (sim > bestSim) {
          bestSim = sim
          best = suppliers[i]
        }
      }
      return best
    }

    // ---- transações existentes (anti-dup) ----
    let existingTx = []
    try {
      existingTx = app.findRecordsByFilter('transactions', 'user = {:uid}', '-date', 5000, 0, {
        uid: userId,
      })
    } catch (_) {}
    const isDuplicate = function (date, amount, desc) {
      const nd = normDesc(desc),
        amt = Math.abs(amount)
      for (let i = 0; i < existingTx.length; i++) {
        const t = existingTx[i]
        if (t.getString('date').indexOf(date) === -1) continue
        if (Math.abs(Math.abs(t.getFloat('amount') || 0) - amt) > 0.02) continue
        const tDesc = normDesc(t.getString('original_description') || t.getString('description'))
        if (!tDesc) continue
        if (similarity(nd, tDesc) > 0.85) return true
      }
      return false
    }

    // ---- transações extraídas do PDF ----
    // Formato: "dd/mm|+ou-|descrição|valor"
    const raw = [
      // Fevereiro 2026
      '19/02|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|7000.00',
      '19/02|-|Pix enviado para PORTOSEG S/A CREDITO FINANCIAMENTO E INVESTIMENTO|8237.06',
      '19/02|-|PGTO FAT CARTAO C6|1000.00',
      '19/02|-|Pix enviado para LEANDRO MENDES PARREIRA|40.00',
      '20/02|-|Pix enviado para JOSE CARLOS MENDONCA TREVELIN|120.00',
      '20/02|-|Pix enviado para MISS HANNA|208.76',
      '20/02|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|2600.00',
      '20/02|-|Pix enviado para MERCADO PAGO INSTITUICAO DE PAGAMENTO LTDA|3100.00',
      '21/02|-|Pix enviado para GABRIEL DE FREITAS OLIVEIRA ARAUJO|138.00',
      '23/02|-|SEGURO CONTA C6|20.00',
      '23/02|-|Pix enviado para QUITANDAS VOVO TUTA|82.90',
      '23/02|-|Pix enviado para Juliana Tartari De Almeida|630.00',
      '23/02|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|500.00',
      '24/02|-|Pix enviado para GABRIEL DE FREITAS OLIVEIRA ARAUJO|87.00',
      // Março 2026
      '04/03|-|Pix enviado para QUITANDAS VOVO TUTA|77.59',
      '04/03|-|Pix enviado para PAGALEVE FUNDO DE INVESTIMENTO EM DIREITOS CREDITORIOS COMERCIAIS DE RESPONSABILIDADE LIMITADA|78.24',
      '05/03|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|500.00',
      '05/03|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|10500.00',
      '05/03|+|Pix recebido de TRANSLUGA ADMINISTRACAO DE VEICULOS LTDA|11370.00',
      '05/03|-|Pix enviado para PORTOSEG S/A CREDITO FINANCIAMENTO E INVESTIMENTO|21968.20',
      '06/03|-|Pix enviado para MISS HANNA|514.00',
      '07/03|-|Pix enviado para CORREIOS SEDE|224.52',
      '08/03|-|Pix enviado para GOOGLE BRASIL PAGAMENTOS LTDA.|54.99',
      '08/03|-|Pix enviado para GOOGLE BRASIL PAGAMENTOS LTDA.|54.99',
      '09/03|+|RESGATE DE CDB|1000.29',
      '09/03|-|Pix enviado para ANTONIO ILSON DA SILVA|200.00',
      '10/03|-|Recorrência Pix enviada para CLAUDIA REGINA RODRIGUES CHILINQUE|300.00',
      '10/03|-|TRIBUTOS FEDERAIS DARF NUMERADO|286.49',
      '10/03|-|Pix enviado para CLAUDIA REGINA RODRIGUES CHILINQUE|300.00',
      '10/03|+|RESGATE DE CDB|4000.87',
      '10/03|-|PGTO FAT CARTAO C6|3121.13',
      '10/03|+|Pix recebido de CLAUDIA REGINA RODRIGUES CHILINQUE|300.00',
      '10/03|-|Pix enviado para QUITANDAS VOVO TUTA|47.82',
      '10/03|-|Pix enviado para MARIA EDIVANIA GALDINO SILVA|1629.86',
      '10/03|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|1500.00',
      '11/03|-|Pix enviado para CAMILA GONCALVES DE OLIVEIRA|185.00',
      '11/03|-|Pix enviado para CARRO E CIA VEICULOS|5.00',
      '11/03|-|Pix enviado para CARRO E CIA VEICULOS|5.00',
      '11/03|-|Pix enviado para PAGALEVE INSTITUICAO DE PAGAMENTO LTDA|83.01',
      '14/03|-|Pix enviado para QUITANDAS VOVO TUTA|44.10',
      '14/03|-|Pix enviado para IFOOD.COM AGENCIA DE RESTAURANTES ONLINE S.A.|159.79',
      '16/03|-|Pix enviado para ATACADAO PET E TRANSPORTES LTDA|120.00',
      '18/03|-|Pix enviado para IFOOD.COM AGENCIA DE RESTAURANTES ONLINE S.A.|63.87',
      '18/03|-|Pix enviado para VIVIANE FERREIRA DA SILVA MANZAN|40.00',
      '18/03|-|Pix enviado para PAGALEVE FUNDO DE INVESTIMENTO EM DIREITOS CREDITORIOS COMERCIAIS DE RESPONSABILIDADE LIMITADA|78.24',
      '18/03|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|10600.00',
      '18/03|-|Pix enviado para PORTOSEG S/A CREDITO FINANCIAMENTO E INVESTIMENTO|10331.10',
      '19/03|-|Pix enviado para TUNA PAGAMENTOS|71.02',
      '21/03|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|500.00',
      '21/03|-|Pix enviado para POLLYANNA ESTEVES DA SILVA|370.00',
      '22/03|-|Pix enviado para QUITANDAS VOVO TUTA|88.85',
      '23/03|+|RESGATE DE CDB|1216.97',
      '23/03|-|SEGURO CONTA C6 Marco 26|20.00',
      '28/03|-|Pix enviado para QUITANDAS VOVO TUTA|69.86',
      '29/03|-|Pix enviado para TUNA PAGAMENTOS|70.00',
      '30/03|-|Pix enviado para QUITANDAS VOVO TUTA|23.88',
      // Abril 2026
      '01/04|-|Pix enviado para VIVIANE FERREIRA DA SILVA MANZAN|40.00',
      '02/04|-|Pix enviado para PAGALEVE FUNDO DE INVESTIMENTO EM DIREITOS CREDITORIOS COMERCIAIS DE RESPONSABILIDADE LIMITADA|225.22',
      '03/04|-|Pix enviado para IFOOD.COM AGENCIA DE RESTAURANTES ONLINE S.A.|47.97',
      '06/04|+|Pix recebido de TRANSLUGA ADMINISTRACAO DE VEICULOS LTDA|1744.32',
      '06/04|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|23000.00',
      '06/04|-|Pix enviado para PORTOSEG S/A CREDITO FINANCIAMENTO E INVESTIMENTO|22695.17',
      '06/04|-|Pix enviado para MARIA EDIVANIA GALDINO SILVA|1744.32',
      '08/04|-|Pix enviado para CAMILA GONCALVES DE OLIVEIRA|235.00',
      '08/04|-|Pix enviado para MATHEUS GOMES|180.00',
      '09/04|-|Pix enviado para MERCADO PAGO INSTITUICAO DE PAGAMENTO LTDA|161.49',
      '10/04|+|RESGATE DE CDB|4000.36',
      '10/04|-|Recorrência Pix enviada para CLAUDIA REGINA RODRIGUES CHILINQUE|300.00',
      '10/04|-|PGTO FAT CARTAO C6|3774.59',
      '10/04|-|ALLIANZ SEGUROS S/A|52.70',
      '11/04|-|Pix enviado para SENHOR PARMEGGIANA|116.00',
      '15/04|-|Pix enviado para PAGALEVE FUNDO DE INVESTIMENTO EM DIREITOS CREDITORIOS COMERCIAIS DE RESPONSABILIDADE LIMITADA|82.98',
      '15/04|-|Pix enviado para VIVIANE FERREIRA DA SILVA MANZAN|40.00',
      '20/04|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|10000.00',
      '20/04|-|Pix enviado para PORTOSEG S/A CREDITO FINANCIAMENTO E INVESTIMENTO|8458.23',
      '20/04|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|4500.00',
      '20/04|-|Pix enviado para MERCADO PAGO INSTITUICAO DE PAGAMENTO LTDA|4463.73',
      '22/04|+|RESGATE DE CDB|5062.70',
      '23/04|-|SEGURO CONTA C6 Abr 26|20.00',
      '23/04|-|Pix enviado para QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA ME|6000.00',
      '24/04|-|Pix enviado para ANTONIO ILSON DA SILVA|226.50',
      '25/04|-|Pix enviado para TUNA PAGAMENTOS|121.75',
      '29/04|-|Pix enviado para PAGALEVE FUNDO DE INVESTIMENTO EM DIREITOS CREDITORIOS COMERCIAIS DE RESPONSABILIDADE LIMITADA|82.98',
      '29/04|-|Pix enviado para VIVIANE FERREIRA DA SILVA MANZAN|40.00',
      // Maio 2026
      '01/05|-|Pix enviado para IFOOD.COM AGENCIA DE RESTAURANTES ONLINE S.A.|82.99',
      '02/05|-|Pix enviado para NIC BR|40.00',
      '03/05|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|500.00',
      '03/05|-|Pix enviado para QUITANDAS VOVO TUTA|91.46',
      '05/05|-|Pix enviado para LARISSA JUNIA ROSA SOUZA|120.00',
      '05/05|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|22000.00',
      '05/05|-|Pix enviado para PORTOSEG S/A CREDITO FINANCIAMENTO E INVESTIMENTO|22028.41',
      '06/05|-|Pix enviado para TUNA PAGAMENTOS|89.39',
      '06/05|-|Pix enviado para CAMILA GONCALVES DE OLIVEIRA|235.00',
      '08/05|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|600.00',
      '08/05|-|Pix enviado para KENIA MONTIEL ALMEIDA DA ROCHA|400.00',
      '08/05|+|Pix recebido de TRANSLUGA ADMINISTRACAO DE VEICULOS LTDA|1662.42',
      '11/05|-|PGTO FAT CARTAO C6|3624.15',
      '11/05|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|2000.00',
      '11/05|-|Pix enviado para CLAUDIA REGINA RODRIGUES CHILINQUE|300.00',
      '12/05|-|Pix enviado para MARIA EDIVANIA GALDINO SILVA|1662.42',
      '12/05|-|Pix enviado para QUITANDAS VOVO TUTA|23.27',
      '13/05|-|Pix enviado para VIVIANE FERREIRA DA SILVA MANZAN|40.00',
      '13/05|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|1700.00',
      '13/05|+|Pix recebido de ADRIANA DE FREITAS OLIVEIRA ARAUJO|500.00',
      '18/05|+|Pix recebido de TRANSLUGA ADMINISTRACAO DE VEICULOS LTDA|3000.00',
      '18/05|-|Pix enviado para PORTOSEG S/A CREDITO FINANCIAMENTO E INVESTIMENTO|3909.80',
      '18/05|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|500.00',
      '20/05|-|Pix enviado para MERCADO PAGO INSTITUICAO DE PAGAMENTO LTDA|4267.80',
      '20/05|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|4500.00',
      '23/05|-|SEGURO CONTA C6 Mai 26|20.00',
      '30/05|-|Pix enviado para VIVIANE FERREIRA DA SILVA MANZAN|40.00',
      // Junho 2026
      '02/06|-|IOF CHEQUE ESPECIAL|5.82',
      '05/06|-|Pix enviado para CAMILA GONCALVES DE OLIVEIRA|185.00',
      '05/06|+|Pix recebido de TRANSLUGA ADMINISTRACAO DE VEICULOS LTDA|9000.00',
      '05/06|+|Pix recebido de KM ZERO CORRETORA DE SEGUROS E CONSORCIOS LTDA|8300.00',
      '05/06|-|Pix enviado para PORTOSEG S/A CREDITO FINANCIAMENTO E INVESTIMENTO|17204.15',
      '06/06|-|Pix enviado para QUITANDAS VOVO TUTA|62.81',
      '09/06|+|Pix recebido de TRANSLUGA ADMINISTRACAO DE VEICULOS LTDA|1662.42',
      '09/06|-|Pix enviado para MARIA EDIVANIA GALDINO SILVA|1662.42',
      '10/06|-|Pix enviado para ALBA MARIA DE FREITAS|685.00',
      '10/06|-|PGTO FAT CARTAO C6|7021.05',
      '10/06|+|Pix recebido de KM ZERO CORRETORA DE SEGUROS E CONSORCIOS LTDA|7500.00',
      '11/06|-|Recorrência Pix enviada para CLAUDIA REGINA RODRIGUES CHILINQUE|300.00',
      '11/06|-|Pix enviado para Tania Aparecida de Oliveira Bregieiro|50.00',
      '11/06|+|Pix recebido de KM ZERO CORRETORA DE SEGUROS E CONSORCIOS LTDA|1000.00',
      '11/06|+|Pix recebido de TRANSLUGA ADMINISTRACAO DE VEICULOS LTDA|2450.00',
      '12/06|-|Pix enviado para VIVIANE FERREIRA DA SILVA MANZAN|40.00',
      '14/06|-|Pix enviado para QUITANDAS VOVO TUTA|47.69',
      '16/06|+|Pix recebido de LUIZ FERNANDO RODRIGUES DE ARAUJO|1700.00',
      '16/06|-|Pix enviado para MARIA EDIVANIA GALDINO SILVA|2793.52',
      '17/06|-|Pix enviado para ALBA MARIA DE FREITAS|180.00',
      '17/06|-|Pix enviado para QUITANDAS VOVO TUTA|37.31',
      '18/06|-|Pix enviado para KENIA MONTIEL ALMEIDA DA ROCHA|400.00',
      '20/06|-|Pix enviado para QUITANDAS VOVO TUTA|48.59',
      '20/06|-|Pix enviado para DLUC MEIRE DE SOUSA|900.00',
      '21/06|-|Pix enviado para QUITANDAS VOVO TUTA|51.47',
      '23/06|-|SEGURO CONTA C6 Jun 26|20.00',
      '25/06|-|Pix enviado para MISS HANNA|245.00',
      '25/06|-|Pix enviado para Winpay IP|50.00',
      '26/06|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|1500.00',
      '26/06|-|Pix enviado para VIVIANE FERREIRA DA SILVA MANZAN|115.00',
      '26/06|-|Pix enviado para ANTONIO ILSON DA SILVA|290.00',
      '26/06|-|Pix enviado para Marcelo Rodrigues de Oliveira|80.00',
      '28/06|-|Pix enviado para QUITANDAS VOVO TUTA|75.38',
      '29/06|-|Pix enviado para LEJ MATERIAIS PARA CONSTRUCAO|822.00',
      // Julho 2026
      '01/07|-|Pix enviado para Petsupermarket Comercio de Produtos para Animais Ltda|34.80',
      '02/07|-|Pix enviado para CAMILA GONCALVES DE OLIVEIRA|185.00',
      '02/07|-|Pix enviado para CAMILA GONCALVES DE OLIVEIRA|50.00',
      '02/07|+|Pix recebido de LUIZ FERNANDO RODRIGUES DE ARAUJO|3000.00',
      '06/07|+|Pix recebido de TRANSLUGA ADMINISTRACAO DE VEICULOS LTDA|606.07',
      '06/07|-|Pix enviado para LORETA CANVILLO SALES|2920.00',
      '06/07|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|17000.00',
      '06/07|-|Pix enviado para PORTOSEG S/A CREDITO FINANCIAMENTO E INVESTIMENTO|16044.27',
      '07/07|-|Pix enviado para ELIAS MARTINS ALVES|25.00',
      '07/07|-|Pix enviado para ESTHER ILUSA DA SILVA HERCOS FATURETO|100.00',
      '08/07|-|Pix enviado para MARIA EDIVANIA GALDINO SILVA|606.07',
      '09/07|-|Pix enviado para QUITANDAS VOVO TUTA|47.35',
      '10/07|-|Recorrência Pix enviada para ALBA MARIA DE FREITAS|685.00',
      '10/07|-|PGTO FAT CARTAO C6|6149.89',
      '10/07|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|100.00',
      '10/07|+|Pix recebido de LUIZ FERNANDO RODRIGUES ARAUJO|800.00',
      '10/07|+|Pix recebido de KM ZERO CORRETORA DE SEGUROS E CONSORCIOS LTDA|500.00',
      '11/07|-|Recorrência Pix enviada para Tania Aparecida de Oliveira Bregieiro|50.00',
      '13/07|-|Pix enviado para CLAUDIA REGINA RODRIGUES CHILINQUE|300.00',
      '14/07|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|500.00',
      '14/07|-|Pix enviado para VIVIANE FERREIRA DA SILVA MANZAN|40.00',
      '15/07|-|Pix enviado para QUITANDAS VOVO TUTA|65.11',
      '16/07|-|Pix enviado para MARCELO RODRIGUES DE OLIVEIRA|80.00',
      '17/07|-|Recorrência Pix enviada para ALBA MARIA DE FREITAS|180.00',
      '17/07|-|Pix enviado para FRANCISCO JOSE VIEIRA PEREIRA|85.00',
      '20/07|+|CASHBACK ATOMOS|361.24',
      '21/07|-|Pix enviado para MARCO ANTONIO DE OLIVEIRA|100.00',
      '23/07|-|SEGURO CONTA C6 Jul 26|20.00',
      '24/07|-|Pix enviado para VIVIANE FERREIRA DA SILVA MANZAN|40.00',
      '25/07|-|Pix enviado para QUITANDAS VOVO TUTA|37.83',
      '27/07|-|Pix enviado para QUITANDAS VOVO TUTA|71.75',
      '29/07|-|Pix enviado para CAMILA GONCALVES DE OLIVEIRA|235.00',
      '31/07|+|Credito Boleto parcelado no cartao|766.14',
      '31/07|-|PGTO DE BOLETO|766.14',
      '31/07|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|500.00',
      // Agosto 2026
      '01/08|-|Pix enviado para MULTIPLAN ESTACIONAMENTO LTDA|26.50',
      '01/08|-|PP2 SALES OLIVEIRA SERTAOZINHO BRA|15.00',
      '04/08|-|IOF CHEQUE ESPECIAL|0.59',
      '05/08|-|Pix enviado para MARCO ANTONIO DE OLIVEIRA|100.00',
      '05/08|+|Pix recebido de TRANSLUGA ADMINISTRACAO DE VEICULOS LTDA|9500.00',
      '05/08|+|Pix recebido de KM ZERO CORRETORA DE SEGUROS E CONSORCIOS LTDA|800.00',
      '05/08|+|Pix recebido de QUILOMETRO ZERO CORRETORA DE SEGUROS LTDA|4000.00',
      '05/08|-|Pix enviado para PORTOSEG S/A CREDITO FINANCIAMENTO E INVESTIMENTO|14165.80',
      '06/08|-|Pix enviado para FRANCISCO JOSE VIEIRA PEREIRA|80.00',
      '08/08|-|Pix enviado para QUITANDAS VOVO TUTA|67.93',
      '10/08|-|Recorrência Pix enviada para ALBA MARIA DE FREITAS|685.00',
      '11/08|-|Recorrência Pix enviada para Tania Aparecida de Oliveira Bregieiro|50.00',
      '11/08|-|Pix enviado para KENIA MONTIEL ALMEIDA DA ROCHA|400.00',
      '12/08|+|Pix recebido de LUIZ FERNANDO RODRIGUES DE ARAUJO|1662.42',
    ]

    const txCol = app.findCollectionByNameOrId('transactions')
    const diCol = app.findCollectionByNameOrId('document_imports')
    const docCol = app.findCollectionByNameOrId('documents')

    // ---- cria documento ----
    const doc = new Record(docCol)
    doc.set('filename', 'extrato-c6-180-dias.pdf')
    doc.set('status', 'imported')
    doc.set('parsed_text', 'Extrato C6 Bank - 19/02/2026 a 18/08/2026 - Processado via Onda 4')
    doc.set('user', userId)
    app.save(doc)

    // ---- cria document_imports ----
    const imp = new Record(diCol)
    imp.set('user', userId)
    imp.set('file_name', 'extrato-c6-180-dias.pdf')
    imp.set('file_type', 'pdf')
    imp.set('source', 'bank_statement')
    imp.set('bank_account', c6AccountId)
    imp.set('status', 'processing')
    imp.set('transactions_found', raw.length)
    imp.set('period_start', '2026-02-19 12:00:00.000Z')
    imp.set('period_end', '2026-08-18 12:00:00.000Z')
    imp.set('bank_balance', 145.78)
    app.save(imp)

    // ---- processa transações ----
    let imported = 0,
      duplicated = 0,
      pending = 0
    const importedIds = []
    const parsedForRaw = []

    for (let i = 0; i < raw.length; i++) {
      const parts = raw[i].split('|')
      if (parts.length < 4) continue
      const dm = parts[0].split('/')
      const dd = dm[0],
        mm = dm[1]
      const isIncome = parts[1] === '+'
      const desc = parts[2]
      const amount = parseFloat(parts[3]) || 0
      const dateOnly = '2026-' + mm + '-' + dd
      const dateStr = dateOnly + ' 12:00:00.000Z'

      if (isDuplicate(dateOnly, amount, desc)) {
        duplicated++
        continue
      }

      // categorização
      let category = 'Outros',
        supplierId = '',
        status = 'review'
      const matched = matchSupplier(desc)
      if (matched) {
        category = mapSupplierCategory(matched.getString('category'))
        supplierId = matched.id
        status = 'categorized'
      } else {
        const kw = keywordCategory(desc)
        if (kw) {
          category = kw
          status = 'categorized'
        }
      }
      if (status === 'review' && isIncome) {
        category = 'Renda'
        status = 'categorized'
      }
      if (status === 'review') pending++

      const tx = new Record(txCol)
      tx.set('description', desc)
      tx.set('amount', amount)
      tx.set('type', isIncome ? 'income' : 'expense')
      tx.set('category', TX_CATEGORIES.indexOf(category) !== -1 ? category : 'Outros')
      tx.set('date', dateStr)
      tx.set('account', c6AccountId)
      tx.set('source', 'pdf')
      tx.set('user', userId)
      tx.set('original_description', desc)
      tx.set('source_document', 'extrato-c6-180-dias.pdf')
      tx.set('status', status)
      tx.set(
        'import_hash',
        $security.sha256(dateOnly + '|' + amount.toFixed(2) + '|' + normDesc(desc).slice(0, 80)),
      )
      if (supplierId) tx.set('supplier', supplierId)
      app.save(tx)

      importedIds.push(tx.id)
      existingTx.push(tx)
      parsedForRaw.push({
        date: dateOnly,
        description: desc,
        amount: amount,
        type: isIncome ? 'income' : 'expense',
      })
      imported++
    }

    // ---- atualiza document_imports ----
    imp.set('transactions_found', raw.length)
    imp.set('transactions_imported', imported)
    imp.set('transactions_duplicated', duplicated)
    imp.set('transactions_pending', pending)
    imp.set('status', pending > 0 ? 'review' : 'imported')
    try {
      imp.set(
        'raw_data',
        JSON.stringify({
          transactions: parsedForRaw,
          imported_ids: importedIds,
          period_start: '2026-02-19',
          period_end: '2026-08-18',
          final_balance: 145.78,
        }),
      )
    } catch (_) {}
    app.save(imp)

    // ---- atualiza saldo da conta C6 ----
    try {
      const acc = app.findRecordById('bank_accounts', c6AccountId)
      acc.set('balance', 145.78)
      app.save(acc)
    } catch (_) {}

    console.log(
      'Onda 4 - C6 extrato processado: ' +
        raw.length +
        ' encontradas, ' +
        imported +
        ' importadas, ' +
        duplicated +
        ' duplicadas, ' +
        pending +
        ' para revisão.',
    )
  },
  (app) => {
    // down: remove transações importadas deste documento
    try {
      const txs = app.findRecordsByFilter(
        'transactions',
        'source_document = "extrato-c6-180-dias.pdf"',
        '-date',
        5000,
        0,
      )
      for (let i = 0; i < txs.length; i++) app.delete(txs[i])
    } catch (_) {}
    try {
      const imp = app.findFirstRecordByData(
        'document_imports',
        'file_name',
        'extrato-c6-180-dias.pdf',
      )
      app.delete(imp)
    } catch (_) {}
    try {
      const doc = app.findFirstRecordByData('documents', 'filename', 'extrato-c6-180-dias.pdf')
      app.delete(doc)
    } catch (_) {}
  },
)
