import type { Monster } from '@arena/domain/monster';
import { createLiveQueryCollection } from '@tanstack/db';
import { describe, expect, it } from 'vitest';
import { addMonster, createRosterCollection, type RosterCollection } from './collection.ts';
import { countOfRoster, pageOfRoster, readCount } from './queries.ts';

const IDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
];

function aMonster(id: string, name: string): Monster {
  return {
    id,
    name,
    attack: 50,
    defense: 30,
    speed: 10,
    hp: 200,
    imageUrl: 'https://exemplo.test/m.png',
  };
}

async function rosterWith(...names: string[]): Promise<RosterCollection> {
  const roster = createRosterCollection();
  for (const [index, name] of names.entries()) {
    await addMonster(roster, aMonster(IDS[index]!, name));
  }

  return roster;
}

async function namesOf(roster: RosterCollection, slice: Parameters<typeof pageOfRoster>[1]) {
  const collection = createLiveQueryCollection(pageOfRoster(roster, slice));
  await collection.preload();

  return [...collection.values()].map((monster) => monster.name);
}

async function countOf(roster: RosterCollection, term: string) {
  const collection = createLiveQueryCollection(countOfRoster(roster, term));
  await collection.preload();

  return readCount([...collection.values()]);
}

describe('a página do roster', () => {
  it('ordena por nome, e não pela ordem de cadastro', async () => {
    // Arrange
    const roster = await rosterWith('Zefirion', 'Aurevanto', 'Petragon');

    // Act
    const names = await namesOf(roster, { term: '', limit: 10, offset: 0 });

    // Assert
    expect(names).toEqual(['Aurevanto', 'Petragon', 'Zefirion']);
  });

  it('devolve no máximo o tamanho da página', async () => {
    // Arrange
    const roster = await rosterWith('Aurevanto', 'Brumalgo', 'Cravenor');

    // Act
    const names = await namesOf(roster, { term: '', limit: 2, offset: 0 });

    // Assert
    expect(names).toEqual(['Aurevanto', 'Brumalgo']);
  });

  it('pula os monstros das páginas anteriores', async () => {
    // Arrange
    const roster = await rosterWith('Aurevanto', 'Brumalgo', 'Cravenor');

    // Act
    const names = await namesOf(roster, { term: '', limit: 2, offset: 2 });

    // Assert
    expect(names).toEqual(['Cravenor']);
  });

  it('devolve vazio numa página além do fim', async () => {
    // Arrange
    const roster = await rosterWith('Aurevanto');

    // Act
    const names = await namesOf(roster, { term: '', limit: 2, offset: 10 });

    // Assert
    expect(names).toEqual([]);
  });

  it('filtra pelo termo ignorando a caixa', async () => {
    // Arrange
    const roster = await rosterWith('Aurevanto', 'Brumalgo');

    // Act
    const names = await namesOf(roster, { term: 'BRUM', limit: 10, offset: 0 });

    // Assert
    expect(names).toEqual(['Brumalgo']);
  });

  it('casa o termo no MEIO do nome, não só no começo', async () => {
    // Arrange
    const roster = await rosterWith('Aurevanto', 'Brumalgo');

    // Act
    const names = await namesOf(roster, { term: 'malg', limit: 10, offset: 0 });

    // Assert
    expect(names).toEqual(['Brumalgo']);
  });

  it('devolve o roster inteiro quando o termo está vazio', async () => {
    // Arrange
    const roster = await rosterWith('Aurevanto', 'Brumalgo');

    // Act
    const names = await namesOf(roster, { term: '', limit: 10, offset: 0 });

    // Assert
    expect(names).toEqual(['Aurevanto', 'Brumalgo']);
  });

  it('devolve vazio quando nenhum nome casa', async () => {
    // Arrange
    const roster = await rosterWith('Aurevanto', 'Brumalgo');

    // Act
    const names = await namesOf(roster, { term: 'zzzz', limit: 10, offset: 0 });

    // Assert
    expect(names).toEqual([]);
  });

  it('ordena igual ao localeCompare, inclusive com acento', async () => {
    // Arrange
    const withAccent = ['Zefirion', 'Ígnis', 'Ignaruk'];
    const roster = await rosterWith(...withAccent);

    // Act
    const names = await namesOf(roster, { term: '', limit: 10, offset: 0 });

    // Assert
    expect(names).toEqual([...withAccent].sort((a, b) => a.localeCompare(b)));
  });

  it('pagina o resultado JÁ filtrado, não o roster todo', async () => {
    // Arrange
    const roster = await rosterWith('Brasa', 'Brisa', 'Bruma', 'Zefirion');

    // Act
    const names = await namesOf(roster, { term: 'br', limit: 2, offset: 2 });

    // Assert
    expect(names).toEqual(['Bruma']);
  });
});

describe('a contagem do roster', () => {
  it('conta o roster inteiro quando o termo está vazio', async () => {
    // Arrange
    const roster = await rosterWith('Aurevanto', 'Brumalgo', 'Cravenor');

    // Act
    const total = await countOf(roster, '');

    // Assert
    expect(total).toBe(3);
  });

  it('conta só o que o termo deixa passar', async () => {
    // Arrange
    const roster = await rosterWith('Brasa', 'Brisa', 'Zefirion');

    // Act
    const total = await countOf(roster, 'br');

    // Assert
    expect(total).toBe(2);
  });

  it('conta ZERO quando nenhum nome casa', async () => {
    // Arrange
    const roster = await rosterWith('Aurevanto');

    // Act
    const total = await countOf(roster, 'zzzz');

    // Assert
    expect(total).toBe(0);
  });

  it('conta ZERO num roster vazio', async () => {
    // Arrange
    const roster = await rosterWith();

    // Act
    const total = await countOf(roster, '');

    // Assert
    expect(total).toBe(0);
  });

  it('ignora a caixa do termo ao contar', async () => {
    // Arrange
    const roster = await rosterWith('Brumalgo');

    // Act
    const total = await countOf(roster, 'BRUMALGO');

    // Assert
    expect(total).toBe(1);
  });
});

describe('readCount', () => {
  it('devolve zero quando o agregado não emitiu linha nenhuma', () => {
    // Arrange
    const rows: { total: number }[] = [];

    // Act
    const total = readCount(rows);

    // Assert
    expect(total).toBe(0);
  });

  it('devolve zero antes de a query carregar', () => {
    // Arrange
    const rows = undefined;

    // Act
    const total = readCount(rows);

    // Assert
    expect(total).toBe(0);
  });

  it('devolve o total da única linha do agregado', () => {
    // Arrange
    const rows = [{ total: 7 }];

    // Act
    const total = readCount(rows);

    // Assert
    expect(total).toBe(7);
  });
});
