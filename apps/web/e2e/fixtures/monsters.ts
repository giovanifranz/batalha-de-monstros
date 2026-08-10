import type { Monster } from '@arena/domain/monster';

/** Arte inline: um `<img src="https://…">` seria uma requisição cross-origin, e o `arena.ts` reprova o teste. */
function art(fill: string): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" fill="${fill}"/>` +
      `<circle cx="24" cy="26" r="5" fill="#101418"/>` +
      `<circle cx="40" cy="26" r="5" fill="#101418"/>` +
      `</svg>`,
  )}`;
}

/**
 * Todos os números passam pelo `monsterSchema`, incluindo o orçamento de 250 —
 * um só que violasse faria o seeding lançar e a tela abrir vazia.
 *
 * São OITO porque `PAGE_SIZE` é 6: a paginação só existe acima de seis.
 *
 * ARMADILHA DE DURAÇÃO: o playback custa `1200 + turnos × 1700` ms em 1x, e
 * Ferrolix × Golemis se batem no piso de dano 1 por **360 turnos** (2min33s
 * mesmo em 4x). Quem escrever um cenário novo precisa conferir o par antes.
 */
export const ROSTER: readonly Monster[] = [
  {
    id: 'e2e-aurox',
    name: 'Aurox',
    attack: 100,
    defense: 55,
    speed: 60,
    hp: 105,
    imageUrl: art('#e2572a'),
  },
  {
    id: 'e2e-brontor',
    name: 'Brontor',
    attack: 50,
    defense: 60,
    speed: 40,
    hp: 150,
    imageUrl: art('#4c5a6b'),
  },
  {
    id: 'e2e-cindral',
    name: 'Cindral',
    attack: 70,
    defense: 40,
    speed: 55,
    hp: 120,
    imageUrl: art('#b8443f'),
  },
  {
    id: 'e2e-dracarn',
    name: 'Dracarn',
    attack: 80,
    defense: 45,
    speed: 65,
    hp: 150,
    imageUrl: art('#3f7d4f'),
  },
  {
    id: 'e2e-ferrolix',
    name: 'Ferrolix',
    attack: 45,
    defense: 90,
    speed: 30,
    hp: 180,
    imageUrl: art('#7a6a4f'),
  },
  {
    id: 'e2e-golemis',
    name: 'Golemis',
    attack: 40,
    defense: 100,
    speed: 20,
    hp: 210,
    imageUrl: art('#5b6470'),
  },
  {
    id: 'e2e-hydrivo',
    name: 'Hydrivo',
    attack: 65,
    defense: 50,
    speed: 75,
    hp: 135,
    imageUrl: art('#1f7f86'),
  },
  {
    id: 'e2e-ignivor',
    name: 'Ignivor',
    attack: 90,
    defense: 35,
    speed: 85,
    hp: 120,
    imageUrl: art('#8a4fb0'),
  },
];

const byName = (name: string): Monster => {
  const found = ROSTER.find((monster) => monster.name === name);
  if (!found) throw new Error(`Monstro de fixture ausente: ${name}`);

  return found;
};

/** Os dois lutadores do cenário principal. */
export const AUROX = byName('Aurox');
export const BRONTOR = byName('Brontor');

/**
 * O resultado de `Aurox × Brontor`, conferido com `simulateBattle`. O par
 * exercita AS DUAS regras de dano no mesmo duelo e ainda cabe no
 * timeout: 7 turnos são 13,1s em 1x e 3,275s em 4x.
 */
export const DUELO = {
  vencedor: 'Aurox',
  perdedor: 'Brontor',
  golpes: 7,
  rounds: 4,
  danoDoAurox: 150,
  danoDoBrontor: 3,
  hpFinalDoAurox: 102,
  hpFinalDoBrontor: 0,
} as const;

/**
 * O MESMO par com os lados trocados, e não por simetria: sem um duelo em que
 * `first` e `winner` caem na DIREITA, um `VictoryPanel` que sempre coroasse o
 * Lutador 1 deixaria a suíte inteira verde.
 */
export const DUELO_ESPELHADO = {
  vencedor: 'Aurox',
  perdedor: 'Brontor',
  golpes: 7,
  rounds: 4,
  danoDoBrontor: 3,
  danoDoAurox: 150,
  hpFinalDoBrontor: 0,
  hpFinalDoAurox: 102,
} as const;

/**
 * O monstro que o cenário de cadastro DIGITA no formulário. Não entra no
 * `ROSTER` de propósito: ele tem que nascer do formulário. Orçamento
 * 90 + 60 + 65 + ⌊105/3⌋ = 250, exatamente no teto.
 */
export const SOMBRASTRO = {
  nome: 'Sombrastro',
  ataque: '90',
  defesa: '60',
  velocidade: '65',
  hp: '105',
  imagem: art('#2b1d4a'),
} as const;

/**
 * `Sombrastro × Brontor`, conferido com `simulateBattle`. QUEM é o Lutador 1 é
 * determinístico: o cadastro chega por um documento NOVO, a `battleSetupMachine`
 * nasce com `activeSlot: 'left'` e o `nanoid` sorteia o id, nunca o lado.
 */
export const DUELO_DO_CADASTRO = {
  vencedor: SOMBRASTRO.nome,
  golpes: 9,
  rounds: 5,
  danoDoSombrastro: 150,
  danoDoBrontor: 4,
} as const;
