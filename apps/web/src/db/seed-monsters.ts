import { monsterSchema, type Monster } from '@arena/domain/monster';
import { seedIfEmpty, type RosterCollection } from '@arena/infra/roster/collection';
import { z } from 'zod';

type SeedStorage = Pick<Storage, 'getItem'>;

function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function creatureArt(fundo: string, corpo: string, olho: string, silhueta: string): string {
  return svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      `<rect width="64" height="64" fill="${fundo}"/>` +
      `<path d="${silhueta}" fill="${corpo}"/>` +
      `<circle cx="26" cy="32" r="3.5" fill="${olho}"/>` +
      `<circle cx="38" cy="32" r="3.5" fill="${olho}"/>` +
      '</svg>',
  );
}

const AUREVANTO_ART = creatureArt(
  '#b8860b',
  '#ffe08a',
  '#3a2a05',
  'M32 8l10 14h10l-8 12 6 18H16l6-18-8-12h10z',
);
const BRUMALGO_ART = creatureArt(
  '#3f4b5b',
  '#c4d3e4',
  '#1b2129',
  'M32 12c14 0 20 10 20 20s-6 20-20 20-20-10-20-20 6-20 20-20z',
);
const CRAVENOR_ART = creatureArt('#7a1f2b', '#ff9aa2', '#2b0409', 'M32 6l22 20-10 32H20L10 26z');
const DRAKONIR_ART = creatureArt(
  '#1f5c3a',
  '#9df0bf',
  '#062114',
  'M32 10c12 4 20 12 20 22 0 12-9 20-20 20s-20-8-20-20c0-10 8-18 20-22z',
);
const FENRISCO_ART = creatureArt(
  '#8a4a12',
  '#ffcf9a',
  '#2a1403',
  'M14 20l10-8 8 8 8-8 10 8v22a10 10 0 0 1-10 10H24a10 10 0 0 1-10-10z',
);
const GELIDRON_ART = creatureArt(
  '#215a70',
  '#bfeaf7',
  '#062a36',
  'M32 6l8 14 14-2-6 14 6 14-14-2-8 14-8-14-14 2 6-14-6-14 14 2z',
);
const HIDRARGO_ART = creatureArt(
  '#15616d',
  '#8ee6d5',
  '#04262b',
  'M32 8c10 10 18 18 18 28a18 18 0 0 1-36 0c0-10 8-18 18-28z',
);
const LUMAVOR_ART = creatureArt(
  '#5b2a86',
  '#e6c8ff',
  '#1d0a2e',
  'M32 8l6 16 16-4-10 14 10 14-16-4-6 16-6-16-16 4 10-14-10-14 16 4z',
);

const IGNARUK_ART = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" fill="#e2572a"/>' +
    '<path d="M32 8c10 12 18 18 18 28a18 18 0 0 1-36 0c0-10 8-16 18-28z" fill="#ffd25e"/>' +
    '<circle cx="25" cy="38" r="4" fill="#3b1205"/>' +
    '<circle cx="39" cy="38" r="4" fill="#3b1205"/>' +
    '<path d="M25 48h14" stroke="#3b1205" stroke-width="3" stroke-linecap="round"/>' +
    '</svg>',
);

const PETRAGON_ART = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" fill="#4c5a6b"/>' +
    '<polygon points="32,8 54,22 54,44 32,58 10,44 10,22" fill="#c9d3dd"/>' +
    '<polygon points="32,18 44,26 44,40 32,48 20,40 20,26" fill="#8b9aa9"/>' +
    '<circle cx="27" cy="31" r="3" fill="#1d242c"/>' +
    '<circle cx="37" cy="31" r="3" fill="#1d242c"/>' +
    '</svg>',
);

const UMBRAFEL_ART = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" fill="#4a3170"/>' +
    '<path d="M32 10a18 18 0 0 1 18 18v26l-9-7-9 7-9-7-9 7V28a18 18 0 0 1 18-18z" fill="#d9ccff"/>' +
    '<circle cx="25" cy="29" r="4" fill="#241638"/>' +
    '<circle cx="39" cy="29" r="4" fill="#241638"/>' +
    '</svg>',
);

const ZEFIRION_ART = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" fill="#1f7f86"/>' +
    '<path d="M8 22h34a8 8 0 1 0-8-8" stroke="#d8fbff" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<path d="M8 38h28a7 7 0 1 1-7 7" stroke="#d8fbff" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="46" cy="30" r="3" fill="#0b3b3f"/>' +
    '<circle cx="56" cy="30" r="3" fill="#0b3b3f"/>' +
    '</svg>',
);

/** Todos respeitam o orçamento `attack + defense + speed + ⌊hp/3⌋ ≤ 250` do `monsterSchema`. */
export const SEED_MONSTERS: readonly Monster[] = [
  {
    id: 'fbf7c1e0-5448-448f-9c63-de6ad2de75ff',
    name: 'Aurevanto',
    hp: 100,
    attack: 88,
    defense: 40,
    speed: 80,
    imageUrl: AUREVANTO_ART,
  },
  {
    id: '1d0c5b07-b951-43ab-a062-47ae51db8031',
    name: 'Brumalgo',
    hp: 180,
    attack: 35,
    defense: 62,
    speed: 45,
    imageUrl: BRUMALGO_ART,
  },
  {
    id: 'd1f5d0e8-63d8-4462-a071-3d85ddf9aaae',
    name: 'Cravenor',
    hp: 110,
    attack: 95,
    defense: 30,
    speed: 70,
    imageUrl: CRAVENOR_ART,
  },
  {
    id: '509bab17-8f40-4730-8aa9-2a8b877581ee',
    name: 'Drakonir',
    hp: 150,
    attack: 80,
    defense: 55,
    speed: 60,
    imageUrl: DRAKONIR_ART,
  },
  {
    id: 'd08bed8c-1318-453a-a5f8-903460c25d01',
    name: 'Fenrisco',
    hp: 120,
    attack: 72,
    defense: 48,
    speed: 88,
    imageUrl: FENRISCO_ART,
  },
  {
    id: '18c33a5e-d5db-4bd9-95f5-dad6b5890f18',
    name: 'Gelidron',
    hp: 200,
    attack: 50,
    defense: 90,
    speed: 25,
    imageUrl: GELIDRON_ART,
  },
  {
    id: 'e3ea33b6-0cba-441d-87a5-eee02f69ad85',
    name: 'Hidrargo',
    hp: 135,
    attack: 66,
    defense: 52,
    speed: 74,
    imageUrl: HIDRARGO_ART,
  },
  {
    id: '165478d7-3a02-49ec-a7b2-17e1948ece78',
    name: 'Ignaruk',
    hp: 105,
    attack: 88,
    defense: 52,
    speed: 75,
    imageUrl: IGNARUK_ART,
  },
  {
    id: 'cb0ba100-77c0-4b53-acc5-53494b96d07c',
    name: 'Lumavor',
    hp: 100,
    attack: 90,
    defense: 30,
    speed: 90,
    imageUrl: LUMAVOR_ART,
  },
  {
    id: '0410b728-ccf7-4d70-b9c0-460589dbcad4',
    name: 'Petragon',
    hp: 150,
    attack: 48,
    defense: 58,
    speed: 76,
    imageUrl: PETRAGON_ART,
  },
  {
    id: '7a7448f4-1625-4d52-ba7c-e2d4fe1d1f11',
    name: 'Umbrafel',
    hp: 140,
    attack: 76,
    defense: 64,
    speed: 60,
    imageUrl: UMBRAFEL_ART,
  },
  {
    id: 'f1616620-bee6-460a-88cb-3de11393e34a',
    name: 'Zefirion',
    hp: 100,
    attack: 92,
    defense: 25,
    speed: 100,
    imageUrl: ZEFIRION_ART,
  },
];

export const SEED_OVERRIDE_KEY = 'arena:seed';

const seedOverrideSchema = z.array(monsterSchema);

export function readSeedOverride(storage: SeedStorage): readonly Monster[] | null {
  if (!import.meta.env.DEV) {
    return null;
  }

  const raw = storage.getItem(SEED_OVERRIDE_KEY);

  if (raw === null) {
    return null;
  }

  try {
    const parsed = seedOverrideSchema.safeParse(JSON.parse(raw));

    if (!parsed.success || parsed.data.length === 0) {
      console.warn(`Semente em ${SEED_OVERRIDE_KEY} ignorada: não é uma lista de monstros válida.`);

      return null;
    }

    return parsed.data;
  } catch {
    console.warn(`Semente em ${SEED_OVERRIDE_KEY} ignorada: JSON inválido.`);

    return null;
  }
}

export function seedRoster(
  target: RosterCollection,
  storage: SeedStorage = window.localStorage,
): Promise<boolean> {
  return seedIfEmpty(target, readSeedOverride(storage) ?? SEED_MONSTERS);
}

export function seedExamples(target: RosterCollection): Promise<boolean> {
  return seedIfEmpty(target, SEED_MONSTERS);
}
