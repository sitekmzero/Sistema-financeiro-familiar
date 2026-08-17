import type { MentorQuote } from '@/types/finance'

export const MENTOR_QUOTES: MentorQuote[] = [
  {
    quote:
      'Aquilo em que você foca e sente, você atrai. Mantenha sua atenção na abundância e no fluxo, nunca na falta.',
    author: 'Abraham Hicks',
    theme: 'Atração & Foco',
  },
  {
    quote:
      'Siga a sua maior paixão e alegria a cada momento, com o máximo de integridade e sem apego ao resultado.',
    author: 'Bachar',
    theme: 'Ação Inspirada',
  },
  {
    quote:
      'O dinheiro é apenas um espelho do seu estado de permissão interior. Pagar com gratidão abre as portas para receber mais.',
    author: 'Abraham Hicks',
    theme: 'Gratidão & Permissão',
  },
  {
    quote:
      'As circunstâncias não importam. Apenas o seu estado de ser importa — ele é quem cria a sua realidade financeira.',
    author: 'Bachar',
    theme: 'Estado de Ser',
  },
  {
    quote:
      'Entre no vórtice de alinhamento primeiro, depois aja. Ações alinhadas trazem resultados com leveza e precisão.',
    author: 'Abraham Hicks',
    theme: 'Alinhamento',
  },
  {
    quote:
      'A abundância é a habilidade natural de fazer o que você precisa fazer, exatamente no momento em que precisa.',
    author: 'Bachar',
    theme: 'Definição de Abundância',
  },
  {
    quote:
      'Você não pode vibrar preocupação com contas a pagar e esperar receber fartura. Sinta o alívio da prosperidade agora.',
    author: 'Abraham Hicks',
    theme: 'Frequência Vibracional',
  },
  {
    quote:
      'Confie no timing perfeito do universo enquanto você cuida da sua organização material com disciplina e amor.',
    author: 'Bachar',
    theme: 'Confiança & Ritmo',
  },
]

export function getRandomMentorQuote(): MentorQuote {
  const index = Math.floor(Math.random() * MENTOR_QUOTES.length)
  return MENTOR_QUOTES[index]
}
