// Backend Hook: weekly_report_cron.js
// Runs daily to generate weekly reports for active users if not already created for current week
cronAdd('weekly_report_cron', '0 6 * * *', () => {
  try {
    const users = $app.findRecordsByFilter('users', '', '', 100, 0)
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekStartStr = oneWeekAgo.toISOString().split('T')[0] + ' 00:00:00.000Z'
    const weekEndStr = now.toISOString().split('T')[0] + ' 23:59:59.999Z'

    const tips = [
      {
        quote:
          "Abraham Hicks: 'Aquilo em que você foca e sente, você atrai — mantenha sua atenção na abundância e na solução.'",
        note: 'James: Cada real direcionado com intenção aproxima você da total tranquilidade familiar.',
      },
      {
        quote:
          "Bachar: 'A abundância é a habilidade de fazer o que você precisa fazer, quando precisa fazer.'",
        note: 'James: A clareza dos seus números é o alicerce para escolhas conscientes e inspiradas.',
      },
      {
        quote:
          "Abraham Hicks: 'A gratidão pelo que você já tem é a ponte direta para o fluxo de tudo o que deseja.'",
        note: 'James: Reconheça suas conquistas desta semana, por menores que pareçam.',
      },
      {
        quote: "Bachar: 'Siga a sua maior alegria e paixão sem insistir em um resultado fixo.'",
        note: 'James: Seu planejamento de viagem e reserva permite viver momentos inesquecíveis sem culpa.',
      },
    ]

    for (const user of users) {
      try {
        // Check if report already exists for this week
        const filter =
          "user = '" + user.id + "' && week_start >= '" + weekStartStr.split('T')[0] + "'"
        const existing = $app.findRecordsByFilter('weekly_reports', filter, '-created', 1, 0)
        if (existing && existing.length > 0) {
          continue
        }

        // Aggregate transactions for the week
        const txFilter =
          "user = '" +
          user.id +
          "' && date >= '" +
          weekStartStr +
          "' && date <= '" +
          weekEndStr +
          "'"
        const txs = $app.findRecordsByFilter('transactions', txFilter, 'date', 200, 0)

        let totalIncome = 0
        let totalExpense = 0
        for (const tx of txs) {
          const type = tx.getString('type')
          const amt = tx.getFloat('amount')
          if (type === 'income') {
            totalIncome += amt
          } else {
            totalExpense += amt
          }
        }

        const net = totalIncome - totalExpense
        const randomTip = tips[Math.floor(Math.random() * tips.length)]
        const fullTip = randomTip.quote + '\n\n' + randomTip.note

        let insight = ''
        if (net > 0) {
          insight =
            'Saldo positivo de R$ ' +
            net.toFixed(2) +
            ' nesta semana. Excelente momento para amortizar dívidas ou reforçar a reserva!'
        } else if (net === 0) {
          insight =
            'Receitas e despesas equilibradas nesta semana. Mantenha a vigilância nos pequenos gastos.'
        } else {
          insight =
            'Despesas superaram as receitas em R$ ' +
            Math.abs(net).toFixed(2) +
            '. Vale revisar categorias como lazer e assinaturas.'
        }

        const reportsCol = $app.findCollectionByNameOrId('weekly_reports')
        const reportRec = new Record(reportsCol)
        reportRec.set('week_start', weekStartStr)
        reportRec.set('week_end', weekEndStr)
        reportRec.set('total_income', totalIncome)
        reportRec.set('total_expense', totalExpense)
        reportRec.set('net', net)
        reportRec.set('insight', insight)
        reportRec.set('tip', fullTip)
        reportRec.set('user', user.id)
        $app.save(reportRec)
      } catch (err) {
        console.log('Error generating weekly report for user ' + user.id, err)
      }
    }
  } catch (globalErr) {
    console.log('Error in weekly_report_cron', globalErr)
  }
})
