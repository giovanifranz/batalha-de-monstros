import { MonsterNotFoundError } from '@arena/domain/errors';
import type { Monster } from '@arena/domain/monster';
import { describe, expect, it } from 'vitest';
import {
  addMonster,
  createRosterCollection,
  findMonster,
  removeMonster,
  seedIfEmpty,
  toMonster,
  updateMonster,
} from './collection.ts';

const GOLEM_ID = '11111111-1111-4111-8111-111111111111';
const WISP_ID = '22222222-2222-4222-8222-222222222222';
const AUSENTE_ID = '33333333-3333-4333-8333-333333333333';

function aMonster(overrides: Partial<Monster> = {}): Monster {
  return {
    id: GOLEM_ID,
    name: 'Golem',
    attack: 50,
    defense: 30,
    speed: 10,
    hp: 200,
    imageUrl: 'https://exemplo.test/golem.png',
    ...overrides,
  };
}

function formValuesOf({ id: _id, ...values }: Monster) {
  return values;
}

describe('roster', () => {
  it('guarda o monstro cadastrado', async () => {
    // Arrange
    const roster = createRosterCollection();

    // Act
    await addMonster(roster, aMonster());

    // Assert
    expect(roster.get(GOLEM_ID)).toMatchObject({ name: 'Golem', hp: 200 });
  });

  it('nasce com o elenco inicial recebido', async () => {
    // Arrange
    const roster = createRosterCollection({ initialData: [aMonster()] });

    // Act
    await roster.preload();

    // Assert
    expect(roster.size).toBe(1);
  });

  it('nasce vazio quando nenhum elenco inicial é passado', async () => {
    // Arrange
    const roster = createRosterCollection();

    // Act
    await roster.preload();

    // Assert
    expect(roster.size).toBe(0);
  });

  it('tira do roster o monstro removido', async () => {
    // Arrange
    const roster = createRosterCollection();
    await addMonster(roster, aMonster());

    // Act
    await removeMonster(roster, GOLEM_ID);

    // Assert
    expect(roster.has(GOLEM_ID)).toBe(false);
  });

  it('lança MonsterNotFoundError ao remover um id que não existe no roster', async () => {
    // Arrange
    const roster = createRosterCollection();

    // Act
    const removal = removeMonster(roster, AUSENTE_ID);

    // Assert
    await expect(removal).rejects.toThrow(MonsterNotFoundError);
  });

  it('encontra pelo id o monstro cadastrado', async () => {
    // Arrange
    const roster = createRosterCollection();
    await addMonster(roster, aMonster());

    // Act
    const found = await findMonster(roster, GOLEM_ID);

    // Assert
    expect(found).toEqual(aMonster());
  });

  it('lança MonsterNotFoundError quando o id não existe no roster', async () => {
    // Arrange
    const roster = createRosterCollection();

    // Act
    const search = findMonster(roster, AUSENTE_ID);

    // Assert
    await expect(search).rejects.toThrow(MonsterNotFoundError);
  });

  it('devolve o monstro sem as propriedades virtuais da coleção', async () => {
    // Arrange
    const roster = createRosterCollection();
    await addMonster(roster, aMonster());

    // Act
    const found = await findMonster(roster, GOLEM_ID);

    // Assert
    expect(Object.keys(found).sort()).toEqual([
      'attack',
      'defense',
      'hp',
      'id',
      'imageUrl',
      'name',
      'speed',
    ]);
  });

  it('tira as propriedades virtuais de uma linha lida direto da coleção', async () => {
    // Arrange
    const roster = createRosterCollection();
    await addMonster(roster, aMonster());
    const row = roster.get(GOLEM_ID);

    // Act
    const limpo = toMonster(row!);

    // Assert
    expect(limpo).toEqual(aMonster());
  });

  it('rejeita ao cadastrar um monstro que estoura o orçamento de 250 pontos', async () => {
    // Arrange
    const roster = createRosterCollection();
    const overBudget = aMonster({ attack: 100, defense: 100, speed: 100, hp: 300 });

    // Act
    const insertion = addMonster(roster, overBudget);

    // Assert
    await expect(insertion).rejects.toThrow(/não pode ultrapassar 250 pontos/);
  });

  it('rejeita ao cadastrar um monstro cujo id não é um UUID', async () => {
    // Arrange
    const roster = createRosterCollection();

    // Act
    const insertion = addMonster(roster, aMonster({ id: 'golem' }));

    // Assert
    await expect(insertion).rejects.toThrow();
  });

  it('semeia o roster vazio com os monstros recebidos', async () => {
    // Arrange
    const roster = createRosterCollection();

    // Act
    const seeded = await seedIfEmpty(roster, [aMonster(), aMonster({ id: WISP_ID, name: 'Wisp' })]);

    // Assert
    expect(seeded).toBe(true);
    expect(roster.size).toBe(2);
  });

  it('não semeia quando o roster já tem monstro', async () => {
    // Arrange
    const roster = createRosterCollection();
    await addMonster(roster, aMonster());

    // Act
    const seeded = await seedIfEmpty(roster, [aMonster({ id: WISP_ID, name: 'Wisp' })]);

    // Assert
    expect(seeded).toBe(false);
    expect(roster.has(WISP_ID)).toBe(false);
  });

  it('não semeia quando a lista de monstros recebida está vazia', async () => {
    // Arrange
    const roster = createRosterCollection();

    // Act
    const seeded = await seedIfEmpty(roster, []);

    // Assert
    expect(seeded).toBe(false);
  });
});

describe('roster editado', () => {
  it('atualiza os atributos do monstro editado', async () => {
    // Arrange
    const roster = createRosterCollection();
    await addMonster(roster, aMonster());

    // Act
    await updateMonster(
      roster,
      GOLEM_ID,
      formValuesOf(aMonster({ name: 'Golem II', attack: 60, hp: 210 })),
    );

    // Assert
    expect(roster.get(GOLEM_ID)).toMatchObject({ name: 'Golem II', attack: 60, hp: 210 });
  });

  it('devolve o monstro atualizado com o id preservado', async () => {
    // Arrange
    const roster = createRosterCollection();
    await addMonster(roster, aMonster());

    // Act
    const atualizado = await updateMonster(
      roster,
      GOLEM_ID,
      formValuesOf(aMonster({ name: 'Golem II' })),
    );

    // Assert
    expect(atualizado).toEqual(aMonster({ name: 'Golem II' }));
  });

  it('não troca o número de monstros ao editar', async () => {
    // Arrange
    const roster = createRosterCollection();
    await addMonster(roster, aMonster());
    await addMonster(roster, aMonster({ id: WISP_ID, name: 'Wisp' }));

    // Act
    await updateMonster(roster, GOLEM_ID, formValuesOf(aMonster({ name: 'Golem II' })));

    // Assert
    expect(roster.size).toBe(2);
  });

  it('não mexe nos outros monstros ao editar um', async () => {
    // Arrange
    const roster = createRosterCollection();
    await addMonster(roster, aMonster());
    await addMonster(roster, aMonster({ id: WISP_ID, name: 'Wisp' }));

    // Act
    await updateMonster(roster, GOLEM_ID, formValuesOf(aMonster({ name: 'Golem II' })));

    // Assert
    expect(roster.get(WISP_ID)).toMatchObject({ name: 'Wisp' });
  });

  it('lança MonsterNotFoundError ao editar um id que não existe no roster', async () => {
    // Arrange
    const roster = createRosterCollection();

    // Act
    const edicao = updateMonster(roster, AUSENTE_ID, formValuesOf(aMonster()));

    // Assert
    await expect(edicao).rejects.toThrow(MonsterNotFoundError);
  });

  it('rejeita ao editar um monstro para além do orçamento de 250 pontos', async () => {
    // Arrange
    const roster = createRosterCollection();
    await addMonster(roster, aMonster());

    // Act
    const edicao = updateMonster(
      roster,
      GOLEM_ID,
      formValuesOf(aMonster({ attack: 100, defense: 100, speed: 100, hp: 300 })),
    );

    // Assert
    await expect(edicao).rejects.toThrow(/não pode ultrapassar 250 pontos/);
  });

  it('apara o nome ao editar', async () => {
    // Arrange
    const roster = createRosterCollection();
    await addMonster(roster, aMonster());

    // Act
    await updateMonster(roster, GOLEM_ID, formValuesOf(aMonster({ name: '  Golem II  ' })));

    // Assert
    expect(roster.get(GOLEM_ID)).toMatchObject({ name: 'Golem II' });
  });

  it('resolve sem mudar nada quando a edição não altera atributo nenhum', async () => {
    // Arrange
    const roster = createRosterCollection();
    await addMonster(roster, aMonster());

    // Act
    const atualizado = await updateMonster(roster, GOLEM_ID, formValuesOf(aMonster()));

    // Assert
    expect(atualizado).toEqual(aMonster());
  });
});
