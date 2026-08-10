import type { Monster } from '@arena/domain/monster';

function art(fill: string): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" fill="${fill}"/>` +
      `<circle cx="24" cy="26" r="5" fill="#101418"/>` +
      `<circle cx="40" cy="26" r="5" fill="#101418"/>` +
      `</svg>`,
  )}`;
}

export const ROSTER: readonly Monster[] = [
  {
    id: '2251ab8c-3f5f-4ce2-ab74-b71c1a375d02',
    name: 'Aurox',
    attack: 100,
    defense: 55,
    speed: 60,
    hp: 105,
    imageUrl: art('#e2572a'),
  },
  {
    id: '03fbdc9c-5fab-4dd8-9f61-93b21009a242',
    name: 'Brontor',
    attack: 50,
    defense: 60,
    speed: 40,
    hp: 150,
    imageUrl: art('#4c5a6b'),
  },
  {
    id: '8e7e511d-d97c-4534-aebe-f81ab8b4b16a',
    name: 'Cindral',
    attack: 70,
    defense: 40,
    speed: 55,
    hp: 120,
    imageUrl: art('#b8443f'),
  },
  {
    id: '865151f6-329e-4dad-a463-958f6ced79c5',
    name: 'Dracarn',
    attack: 80,
    defense: 45,
    speed: 65,
    hp: 150,
    imageUrl: art('#3f7d4f'),
  },
  {
    id: 'c57c31f7-731c-4a31-abf5-91a44fcd202c',
    name: 'Ferrolix',
    attack: 45,
    defense: 90,
    speed: 30,
    hp: 180,
    imageUrl: art('#7a6a4f'),
  },
  {
    id: '7c53bdb8-b8d5-4ed7-8742-49f868d05418',
    name: 'Golemis',
    attack: 40,
    defense: 100,
    speed: 20,
    hp: 210,
    imageUrl: art('#5b6470'),
  },
  {
    id: '172af089-d920-4d3c-af18-2ead0dc06478',
    name: 'Hydrivo',
    attack: 65,
    defense: 50,
    speed: 75,
    hp: 135,
    imageUrl: art('#1f7f86'),
  },
  {
    id: 'a6f5471a-b731-4bcf-9dc7-47d3dbbfb7a8',
    name: 'Ignivor',
    attack: 90,
    defense: 35,
    speed: 85,
    hp: 120,
    imageUrl: art('#8a4fb0'),
  },
  {
    id: '6d7bf641-b8dc-4ee7-a2e2-f63d3e9bd983',
    name: 'Jelmoro',
    attack: 60,
    defense: 70,
    speed: 50,
    hp: 160,
    imageUrl: art('#2f6f4f'),
  },
  {
    id: 'ecf8a599-0ef9-455e-8fe5-6c81d894b4bd',
    name: 'Kraveln',
    attack: 85,
    defense: 40,
    speed: 78,
    hp: 120,
    imageUrl: art('#a8552f'),
  },
];

const byName = (name: string): Monster => {
  const found = ROSTER.find((monster) => monster.name === name);
  if (!found) throw new Error(`Monstro de fixture ausente: ${name}`);

  return found;
};

export const AUROX = byName('Aurox');
export const BRONTOR = byName('Brontor');

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

export const SOMBRASTRO = {
  nome: 'Sombrastro',
  ataque: '90',
  defesa: '60',
  velocidade: '65',
  hp: '105',
  imagem: art('#2b1d4a'),
} as const;

export const DUELO_DO_CADASTRO = {
  vencedor: SOMBRASTRO.nome,
  golpes: 9,
  rounds: 5,
  danoDoSombrastro: 150,
  danoDoBrontor: 4,
} as const;
