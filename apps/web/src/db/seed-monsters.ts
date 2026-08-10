import type { Monster } from '@arena/domain/monster';
import { seedIfEmpty, type RosterCollection } from '@arena/infra/roster/collection';

/**
 * Arte inline: a semente vai inteira para o `localStorage` (teto de ~5 MB) e
 * nenhum card pode depender de um host de terceiro. `encodeURIComponent` e não
 * base64 porque o resultado passa no `z.url()` do `monsterSchema`.
 */
function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

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

/**
 * Os números não são decorativos: todos precisam passar pelo `monsterSchema`
 * (orçamento `attack + defense + speed + ⌊hp/3⌋ ≤ 250` — gastam 250, 232, 246 e
 * 250), senão o `seedIfEmpty` do boot lança e o app não sobe. E o duelo padrão
 * (os dois primeiros por nome) abre no dano mínimo de propósito: Petragon é 1
 * de velocidade mais rápido que Ignaruk e esbarra na defesa dele.
 */
export const SEED_MONSTERS: readonly Monster[] = [
  {
    id: 'seed-ignaruk',
    name: 'Ignaruk',
    hp: 105,
    attack: 88,
    defense: 52,
    speed: 75,
    imageUrl: IGNARUK_ART,
  },
  {
    id: 'seed-petragon',
    name: 'Petragon',
    hp: 150,
    attack: 48,
    defense: 58,
    speed: 76,
    imageUrl: PETRAGON_ART,
  },
  {
    id: 'seed-umbrafel',
    name: 'Umbrafel',
    hp: 140,
    attack: 76,
    defense: 64,
    speed: 60,
    imageUrl: UMBRAFEL_ART,
  },
  {
    id: 'seed-zefirion',
    name: 'Zefirion',
    hp: 100,
    attack: 92,
    defense: 25,
    speed: 100,
    imageUrl: ZEFIRION_ART,
  },
];

/**
 * Semeia os exemplos e devolve `true` se realmente semeou. Mora aqui, e não em
 * `roster.ts`, para uma página poder importar isto sem arrastar o singleton que
 * lê `window` na importação.
 */
export function seedRoster(target: RosterCollection): Promise<boolean> {
  return seedIfEmpty(target, SEED_MONSTERS);
}
