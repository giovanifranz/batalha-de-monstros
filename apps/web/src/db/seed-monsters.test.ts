import { simulateBattle } from '@arena/domain/battle';
import { monsterSchema, type Monster } from '@arena/domain/monster';
import { createRosterCollection } from '@arena/infra/roster/collection';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import {
  readSeedOverride,
  SEED_MONSTERS,
  SEED_OVERRIDE_KEY,
  seedExamples,
  seedRoster,
} from './seed-monsters.ts';

function fakeStorage(entries: Record<string, string> = {}) {
  const store = new Map(Object.entries(entries));

  return { getItem: (key: string) => store.get(key) ?? null };
}

function aMonster(overrides: Partial<Monster> = {}): Monster {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Fixture',
    attack: 50,
    defense: 30,
    speed: 10,
    hp: 200,
    imageUrl: 'https://exemplo.test/fixture.png',
    ...overrides,
  };
}

describe('semente do roster', () => {
  it('cadastra apenas monstros que passam no monsterSchema', () => {
    // Arrange
    const seed = SEED_MONSTERS;

    // Act
    const rejected = seed
      .map((monster) => ({ monster, parsed: monsterSchema.safeParse(monster) }))
      .filter(({ parsed }) => !parsed.success)
      .map(({ monster, parsed }) => ({
        name: monster.name,
        issues: parsed.error?.issues.map((issue) => issue.message),
      }));

    // Assert
    expect(rejected).toEqual([]);
    expect(seed).toHaveLength(12);
  });

  it('abre o duelo padrão com as duas regras de dano numa batalha curta', () => {
    // Arrange
    const [left, right] = [...SEED_MONSTERS].sort((a, b) => a.name.localeCompare(b.name));

    // Act
    const result = simulateBattle(left, right);

    // Assert
    expect(result.turns.length).toBe(13);
    expect(result.turns.some((turn) => turn.isChip)).toBe(true);
    expect(result.turns.some((turn) => !turn.isChip)).toBe(true);
  });

  it('usa ids no formato que o monsterSchema exige', () => {
    // Arrange
    const ids = SEED_MONSTERS.map((monster) => monster.id);

    // Act
    const invalid = ids.filter((id) => !monsterSchema.shape.id.safeParse(id).success);

    // Assert
    expect(invalid).toEqual([]);
    expect(new Set(ids).size).toBe(SEED_MONSTERS.length);
  });
});

describe('elenco alternativo da semente', () => {
  it('devolve null quando a chave não existe', () => {
    // Arrange
    const storage = fakeStorage();

    // Act
    const override = readSeedOverride(storage);

    // Assert
    expect(override).toBeNull();
  });

  it('devolve os monstros gravados na chave', () => {
    // Arrange
    const cast = [aMonster({ name: 'Aurox' })];
    const storage = fakeStorage({ [SEED_OVERRIDE_KEY]: JSON.stringify(cast) });

    // Act
    const override = readSeedOverride(storage);

    // Assert
    expect(override).toEqual(cast);
  });

  it('devolve null para uma lista vazia, deixando a semente do app entrar', () => {
    // Arrange
    const storage = fakeStorage({ [SEED_OVERRIDE_KEY]: '[]' });

    // Act
    const override = readSeedOverride(storage);

    // Assert
    expect(override).toBeNull();
  });

  it('devolve null para JSON inválido', () => {
    // Arrange
    const storage = fakeStorage({ [SEED_OVERRIDE_KEY]: '{ nao é json' });

    // Act
    const override = readSeedOverride(storage);

    // Assert
    expect(override).toBeNull();
  });

  it('devolve null quando um dos monstros não passa no schema', () => {
    // Arrange
    const cast = [aMonster(), { ...aMonster({ id: 'nao-e-uuid' }) }];
    const storage = fakeStorage({ [SEED_OVERRIDE_KEY]: JSON.stringify(cast) });

    // Act
    const override = readSeedOverride(storage);

    // Assert
    expect(override).toBeNull();
  });

  it('ignora a chave fora do modo de desenvolvimento', () => {
    // Arrange
    onTestFinished(() => {
      vi.unstubAllEnvs();
    });
    vi.stubEnv('DEV', false);
    const storage = fakeStorage({ [SEED_OVERRIDE_KEY]: JSON.stringify([aMonster()]) });

    // Act
    const override = readSeedOverride(storage);

    // Assert
    expect(override).toBeNull();
  });
});

describe('semente aplicada na coleção', () => {
  it('planta os doze exemplos numa coleção vazia', async () => {
    // Arrange
    const roster = createRosterCollection();

    // Act
    const seeded = await seedExamples(roster);

    // Assert
    expect(seeded).toBe(true);
    expect(roster.size).toBe(12);
    expect(roster.get(SEED_MONSTERS[0].id)).toMatchObject({ name: 'Aurevanto' });
  });

  it('não planta os exemplos numa coleção que já tem monstro', async () => {
    // Arrange
    const roster = createRosterCollection({ initialData: [aMonster({ name: 'Aurox' })] });

    // Act
    const seeded = await seedExamples(roster);

    // Assert
    expect(seeded).toBe(false);
    expect(roster.size).toBe(1);
  });

  it('planta o elenco alternativo do storage quando ele existe', async () => {
    // Arrange
    const roster = createRosterCollection();
    const cast = [aMonster({ name: 'Aurox' })];
    const storage = fakeStorage({ [SEED_OVERRIDE_KEY]: JSON.stringify(cast) });

    // Act
    const seeded = await seedRoster(roster, storage);

    // Assert
    expect(seeded).toBe(true);
    expect(roster.size).toBe(1);
    expect(roster.get(cast[0].id)).toMatchObject({ name: 'Aurox' });
  });

  it('planta os monstros da aplicação quando o storage não tem elenco alternativo', async () => {
    // Arrange
    const roster = createRosterCollection();
    const storage = fakeStorage();

    // Act
    const seeded = await seedRoster(roster, storage);

    // Assert
    expect(seeded).toBe(true);
    expect(roster.size).toBe(SEED_MONSTERS.length);
    expect(roster.get(SEED_MONSTERS[0].id)).toMatchObject({ name: 'Aurevanto' });
  });

  it('não planta nada quando a coleção já tem monstro', async () => {
    // Arrange
    const roster = createRosterCollection({ initialData: [aMonster({ name: 'Aurox' })] });
    const storage = fakeStorage();

    // Act
    const seeded = await seedRoster(roster, storage);

    // Assert
    expect(seeded).toBe(false);
    expect(roster.size).toBe(1);
  });
});
