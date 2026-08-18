// Insights vibracionais do dia — James com princípios Abraham Hicks & Bachar.
// Cada insight referencia um dos 20 princípios e pode ser combinado com dados
// dinâmicos do mês corrente (categoria que mais cresceu, dias sem impulso, etc.).

export interface VibrationalInsight {
  text: string
  principle: number
  author: 'Abraham Hicks' | 'Bachar'
}

export const VIBRATIONAL_INSIGHTS: VibrationalInsight[] = [
  {
    text: 'Adriana, seus gastos com saúde cresceram — isso é investimento no seu templo, não despesa. Sinta a gratidão por cuidar de si.',
    principle: 10,
    author: 'Abraham Hicks',
  },
  {
    text: 'Você está a poucos dias sem compras por impulso. Seu vórtice de abundância está se expandindo.',
    principle: 5,
    author: 'Abraham Hicks',
  },
  {
    text: 'Cada conta paga com gratidão abre as portas para receber mais. Agradeça o serviço recebido e sinta o alívio.',
    principle: 2,
    author: 'Abraham Hicks',
  },
  {
    text: 'Sintonize a abundância — ela não é algo que você adquire, é algo que você vibra. Seus números estão apenas refletindo seu alinhamento.',
    principle: 4,
    author: 'Abraham Hicks',
  },
  {
    text: 'Aja com integridade, sem apego ao resultado. Seus gastos alinhados de hoje são sementes de prosperidade exponencial.',
    principle: 14,
    author: 'Bachar',
  },
  {
    text: 'Riqueza é precisar de pouco e ter tudo que precisa. Seus gastos essenciais são a prova de que você já é próspero.',
    principle: 16,
    author: 'Bachar',
  },
  {
    text: 'O medo financeiro é apenas excitação sem foco. Redirecione essa energia para criar, não para temer.',
    principle: 17,
    author: 'Bachar',
  },
  {
    text: 'Confie no timing do Universo. Cada conta paga no prazo certo é prova de sincronicidade.',
    principle: 19,
    author: 'Bachar',
  },
  {
    text: 'Cada decisão financeira é um voto ao Universo sobre quem você é. Vote em abundância hoje.',
    principle: 10,
    author: 'Abraham Hicks',
  },
  {
    text: 'A gratidão é o atalho mais rápido para a abundância. Agradeça cada centavo que entra e cada centavo que sai.',
    principle: 6,
    author: 'Abraham Hicks',
  },
  {
    text: 'Sua mais alta excitação é o GPS da sua alma para a abundância. Siga-a nas escolhas financeiras de hoje.',
    principle: 13,
    author: 'Bachar',
  },
  {
    text: 'A verdadeira segurança financeira vem de saber que você é infinito, não de acumular finitos.',
    principle: 20,
    author: 'Bachar',
  },
]

// Rotação que varia a cada acesso — mistura o índice do dia com um salto pseudoaleatório
// baseado no momento de carregamento, para que cada visita ao dashboard mostre um insight diferente.
export function getVibrationalInsight(seed: number = Date.now()): VibrationalInsight {
  const idx = Math.abs(Math.floor(seed / (1000 * 60 * 15))) % VIBRATIONAL_INSIGHTS.length
  return VIBRATIONAL_INSIGHTS[idx]
}

// Frases de gratidão para a resposta do James ao registrar gratidão financeira.
export const GRATITUDE_RESPONSES: string[] = [
  'A gratidão é o atalho mais rápido para a abundância. (Princípio 6 — Abraham Hicks)',
  'Agradeça cada centavo que entra e cada centavo que sai — seu vórtice se expande. (Princípio 6)',
  'Cada voto de gratidão ao Universo fortalece sua vibração de prosperidade. (Princípio 10)',
  'Você está alinhado com o fluxo — a abundância é sintonizada, não adquirida. (Princípio 4)',
]

export function getRandomGratitudeResponse(): string {
  return GRATITUDE_RESPONSES[Math.floor(Math.random() * GRATITUDE_RESPONSES.length)]
}

// Frase curta do dia para o termômetro vibracional.
export function getVibrationalPhrase(score: number): string {
  if (score >= 70) return 'Você está em fluxo de prosperidade'
  if (score >= 40) return 'Atenção plena aos seus gastos'
  return 'Hora de realinhar sua vibração financeira'
}
