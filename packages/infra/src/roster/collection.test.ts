import { MonsterNotFoundError } from '@arena/domain/errors';
import type { Monster } from '@arena/domain/monster';
import { type StorageApi, type StorageEventApi } from '@tanstack/db';
import { describe, expect, it } from 'vitest';
import {
  addMonster,
  createRosterCollection,
  findMonster,
  removeMonster,
  seedIfEmpty,
} from './collection.ts';

function aMonster(overrides: Partial<Monster> = {}): Monster {
  return {
    id: 'golem',
    name: 'Golem',
    attack: 50,
    defense: 30,
    speed: 10,
    hp: 200,
    imageUrl: 'https://exemplo.test/golem.png',
    ...overrides,
  };
}

/**
 * Fakes que se comportam como duas abas do mesmo navegador: escrever no `Map`
 * dispara os ouvintes do fake de eventos. `failNextWrite` faz o próximo
 * `setItem` lançar, simulando cota estourada.
 */
function createFakeBrowserStorage(): {
  storage: StorageApi;
  storageEventApi: StorageEventApi;
  failNextWrite(error: Error): void;
} {
  const store = new Map<string, string>();
  const listeners = new Set<(event: StorageEvent) => void>();
  let pendingFailure: Error | null = null;

  function notify(key: string, oldValue: string | null, newValue: string | null): void {
    const event = { key, oldValue, newValue, storageArea: storage } as StorageEvent;
    listeners.forEach((listener) => listener(event));
  }

  const storage: StorageApi = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      if (pendingFailure) {
        const error = pendingFailure;
        pendingFailure = null;
        throw error;
      }

      const oldValue = store.get(key) ?? null;
      store.set(key, value);
      notify(key, oldValue, value);
    },
    removeItem: (key) => {
      const oldValue = store.get(key) ?? null;
      store.delete(key);
      notify(key, oldValue, null);
    },
  };

  const storageEventApi: StorageEventApi = {
    addEventListener: (_type, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener);
    },
  };

  return {
    storage,
    storageEventApi,
    failNextWrite: (error) => {
      pendingFailure = error;
    },
  };
}

function openRoster() {
  return createRosterCollection(createFakeBrowserStorage());
}

describe('roster', () => {
  it('guarda o monstro cadastrado', async () => {
    // Arrange
    const roster = openRoster();

    // Act
    await addMonster(roster, aMonster());

    // Assert
    expect(roster.get('golem')).toMatchObject({ name: 'Golem', hp: 200 });
  });

  it('tira do roster o monstro removido', async () => {
    // Arrange
    const roster = openRoster();
    await addMonster(roster, aMonster());

    // Act
    await removeMonster(roster, 'golem');

    // Assert
    expect(roster.has('golem')).toBe(false);
  });

  it('lança MonsterNotFoundError ao remover um id que não existe no roster', async () => {
    // Arrange
    const roster = openRoster();

    // Act
    const removal = removeMonster(roster, 'inexistente');

    // Assert
    await expect(removal).rejects.toThrow(MonsterNotFoundError);
  });

  it('encontra pelo id o monstro cadastrado', async () => {
    // Arrange
    const roster = openRoster();
    await addMonster(roster, aMonster());

    // Act
    const found = await findMonster(roster, 'golem');

    // Assert
    expect(found).toEqual(aMonster());
  });

  it('lança MonsterNotFoundError quando o id não existe no roster', async () => {
    // Arrange
    const roster = openRoster();

    // Act
    const search = findMonster(roster, 'inexistente');

    // Assert
    await expect(search).rejects.toThrow(MonsterNotFoundError);
  });

  it('rejeita ao cadastrar um monstro que estoura o orçamento de 250 pontos', async () => {
    // Arrange
    const roster = openRoster();
    const overBudget = aMonster({ attack: 100, defense: 100, speed: 100, hp: 300 });

    // Act
    const insertion = addMonster(roster, overBudget);

    // Assert
    // A mensagem, não só a classe: distingue o schema do domínio de outro que rejeite pelo motivo errado.
    await expect(insertion).rejects.toThrow(/não pode ultrapassar 250 pontos/);
  });

  it('semeia o roster vazio com os monstros recebidos', async () => {
    // Arrange
    const roster = openRoster();

    // Act
    const seeded = await seedIfEmpty(roster, [aMonster(), aMonster({ id: 'wisp', name: 'Wisp' })]);

    // Assert
    expect(seeded).toBe(true);
  });

  it('não semeia quando o roster já tem monstro', async () => {
    // Arrange
    const roster = openRoster();
    await addMonster(roster, aMonster());

    // Act
    const seeded = await seedIfEmpty(roster, [aMonster({ id: 'wisp', name: 'Wisp' })]);

    // Assert
    expect(seeded).toBe(false);
  });

  it('não semeia quando a lista de monstros recebida está vazia', async () => {
    // Arrange
    const roster = openRoster();

    // Act
    const seeded = await seedIfEmpty(roster, []);

    // Assert
    expect(seeded).toBe(false);
  });

  it('não semeia de novo ao reabrir a coleção sobre um storage já populado', async () => {
    // Arrange
    const fakeBrowser = createFakeBrowserStorage();
    const firstRun = createRosterCollection(fakeBrowser);
    await seedIfEmpty(firstRun, [aMonster()]);
    const secondRun = createRosterCollection(fakeBrowser);

    // Act
    const seeded = await seedIfEmpty(secondRun, [aMonster()]);

    // Assert
    expect(seeded).toBe(false);
  });

  it('grava sob a chave de storage estável esperada pelo resto da aplicação', async () => {
    // Arrange
    const fakeBrowser = createFakeBrowserStorage();
    const roster = createRosterCollection(fakeBrowser);

    // Act
    await seedIfEmpty(roster, [aMonster()]);

    // Assert
    expect(fakeBrowser.storage.getItem('arena:roster')).not.toBeNull();
  });

  it('encontra o monstro cadastrado numa coleção reaberta sobre o mesmo storage', async () => {
    // Arrange
    const fakeBrowser = createFakeBrowserStorage();
    const firstRun = createRosterCollection(fakeBrowser);
    await addMonster(firstRun, aMonster());
    const secondRun = createRosterCollection(fakeBrowser);

    // Act
    const found = await findMonster(secondRun, 'golem');

    // Assert
    expect(found).toEqual(aMonster());
  });

  it('remove o monstro cadastrado numa coleção reaberta sobre o mesmo storage', async () => {
    // Arrange
    const fakeBrowser = createFakeBrowserStorage();
    const firstRun = createRosterCollection(fakeBrowser);
    await addMonster(firstRun, aMonster());
    const secondRun = createRosterCollection(fakeBrowser);
    const witness = createRosterCollection(fakeBrowser);
    await witness.preload();

    // Act
    await removeMonster(secondRun, 'golem');

    // Assert
    expect(witness.has('golem')).toBe(false);
  });

  it('guarda o monstro cadastrado numa coleção reaberta ao lado do que já existia', async () => {
    // Arrange
    const fakeBrowser = createFakeBrowserStorage();
    const firstRun = createRosterCollection(fakeBrowser);
    await addMonster(firstRun, aMonster());
    const secondRun = createRosterCollection(fakeBrowser);

    // Act
    await addMonster(secondRun, aMonster({ id: 'wisp', name: 'Wisp' }));

    // Assert
    expect(secondRun.size).toBe(2);
  });

  it('rejeita ao cadastrar quando a escrita no storage falha', async () => {
    // Arrange
    const fakeBrowser = createFakeBrowserStorage();
    const roster = createRosterCollection(fakeBrowser);
    fakeBrowser.failNextWrite(new Error('QuotaExceededError'));

    // Act
    const insertion = addMonster(roster, aMonster());

    // Assert
    await expect(insertion).rejects.toThrow('QuotaExceededError');
  });

  it('rejeita ao remover quando a escrita no storage falha', async () => {
    // Arrange
    const fakeBrowser = createFakeBrowserStorage();
    const roster = createRosterCollection(fakeBrowser);
    await addMonster(roster, aMonster());
    fakeBrowser.failNextWrite(new Error('QuotaExceededError'));

    // Act
    const removal = removeMonster(roster, 'golem');

    // Assert
    await expect(removal).rejects.toThrow('QuotaExceededError');
  });

  it('rejeita ao semear quando a escrita no storage falha', async () => {
    // Arrange
    const fakeBrowser = createFakeBrowserStorage();
    const roster = createRosterCollection(fakeBrowser);
    fakeBrowser.failNextWrite(new Error('QuotaExceededError'));

    // Act
    const seeding = seedIfEmpty(roster, [aMonster()]);

    // Assert
    await expect(seeding).rejects.toThrow('QuotaExceededError');
  });

  it('não deixa a próxima escrita bem-sucedida ressuscitar um monstro cuja gravação falhou', async () => {
    // Arrange
    const fakeBrowser = createFakeBrowserStorage();
    const roster = createRosterCollection(fakeBrowser);
    const reopened = createRosterCollection(fakeBrowser);
    fakeBrowser.failNextWrite(new Error('QuotaExceededError'));
    await addMonster(roster, aMonster()).catch(() => undefined);

    // Act
    await addMonster(roster, aMonster({ id: 'wisp', name: 'Wisp' }));

    // Assert
    await reopened.preload();
    expect(reopened.has('golem')).toBe(false);
  });

  it('não deixa uma escrita bem-sucedida ressuscitar um monstro cuja remoção falhou', async () => {
    // Arrange
    const fakeBrowser = createFakeBrowserStorage();
    const roster = createRosterCollection(fakeBrowser);
    const reopened = createRosterCollection(fakeBrowser);
    await addMonster(roster, aMonster());
    fakeBrowser.failNextWrite(new Error('QuotaExceededError'));
    await removeMonster(roster, 'golem').catch(() => undefined);

    // Act
    await addMonster(roster, aMonster({ id: 'wisp', name: 'Wisp' }));

    // Assert
    await reopened.preload();
    expect(reopened.has('golem')).toBe(true);
  });

  it('não deixa uma escrita bem-sucedida plantar a semente cuja gravação falhou', async () => {
    // Arrange
    const fakeBrowser = createFakeBrowserStorage();
    const roster = createRosterCollection(fakeBrowser);
    const reopened = createRosterCollection(fakeBrowser);
    fakeBrowser.failNextWrite(new Error('QuotaExceededError'));
    await seedIfEmpty(roster, [aMonster()]).catch(() => undefined);

    // Act
    await addMonster(roster, aMonster({ id: 'wisp', name: 'Wisp' }));

    // Assert
    await reopened.preload();
    expect(reopened.has('golem')).toBe(false);
  });

  it('não deixa uma escrita concorrente bem-sucedida ressuscitar o monstro cuja escrita concorrente falhou', async () => {
    // Arrange
    const fakeBrowser = createFakeBrowserStorage();
    const roster = createRosterCollection(fakeBrowser);
    const reopened = createRosterCollection(fakeBrowser);
    fakeBrowser.failNextWrite(new Error('QuotaExceededError'));

    // Act
    // Sem `await` entre as duas: é o entrelaçamento que o caso sequencial não cobre.
    const [golem, wisp] = await Promise.allSettled([
      addMonster(roster, aMonster()),
      addMonster(roster, aMonster({ id: 'wisp', name: 'Wisp' })),
    ]);

    // Assert
    expect(golem.status).toBe('rejected');
    expect(wisp.status).toBe('fulfilled');
    await reopened.preload();
    expect(reopened.has('golem')).toBe(false);
  });

  it('propaga para uma coleção o monstro cadastrado em outra que compartilha o mesmo storage', async () => {
    // Arrange
    const fakeBrowser = createFakeBrowserStorage();
    const tabA = createRosterCollection(fakeBrowser);
    const tabB = createRosterCollection(fakeBrowser);
    await tabB.preload();

    // Act
    await addMonster(tabA, aMonster());

    // Assert
    expect(tabB.get('golem')).toMatchObject({ name: 'Golem' });
  });
});
