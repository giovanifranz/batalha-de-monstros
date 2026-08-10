import { MonsterNotFoundError } from '@arena/domain/errors';
import { monsterSchema, type Monster } from '@arena/domain/monster';
import {
  createCollection,
  DeleteKeyNotFoundError,
  localStorageCollectionOptions,
  type StorageApi,
  type StorageEventApi,
} from '@tanstack/db';

const STORAGE_KEY = 'arena:roster';

export type RosterCollectionOptions = {
  storage?: StorageApi;
  storageEventApi?: StorageEventApi;
};

/**
 * O roster persistido no storage do navegador e sincronizado entre abas.
 * `createCollection` vem de `@tanstack/db`, NUNCA de `@tanstack/react-db` — é o
 * que mantém este pacote livre de React.
 *
 * LACUNA CONHECIDA: o carregamento inicial só confere se o JSON é serializável,
 * nunca roda `monsterSchema`. Uma linha gravada por um formato antigo volta com
 * campos `undefined` e o TypeScript segue achando que é um `Monster` completo.
 */
export function createRosterCollection({
  storage = window.localStorage,
  storageEventApi = window,
}: RosterCollectionOptions = {}) {
  return createCollection(
    localStorageCollectionOptions({
      storageKey: STORAGE_KEY,
      getKey: (monster) => monster.id,
      schema: monsterSchema,
      storage,
      storageEventApi,
    }),
  );
}

export type RosterCollection = ReturnType<typeof createRosterCollection>;

/**
 * Tira as propriedades virtuais do TanStack DB (`$synced`, `$origin`, `$key`,
 * `$collectionId`) que `get`/`toArray` acrescentam à linha e que vazam em spread.
 */
export function toMonster(row: Monster): Monster {
  const { id, name, attack, defense, speed, hp, imageUrl } = row;
  return { id, name, attack, defense, speed, hp, imageUrl };
}

/**
 * Fila de escrita por coleção: sem ela, duas escritas sem `await` entre si
 * correm juntas e a segunda grava o cache que a primeira poluiu ao falhar,
 * ressuscitando a mutação já relatada como erro a quem chamou.
 */
const mutationQueues = new WeakMap<RosterCollection, Promise<unknown>>();

function enqueueMutation<T>(roster: RosterCollection, task: () => Promise<T>): Promise<T> {
  const tail = mutationQueues.get(roster) ?? Promise.resolve();
  const settled = tail.then(task, task);
  mutationQueues.set(roster, settled);

  return settled;
}

/**
 * A biblioteca aplica a mutação ao seu cache ANTES de salvar e não desfaz isso
 * quando o `setItem` lança; `cleanup() + preload()` é o único par público que
 * descarta o resíduo sem recriar a coleção.
 *
 * EFEITO COLATERAL: reemite um evento de mudança para CADA linha, não só para a
 * que falhou — código que dependa da identidade do evento quebra, não é um bug.
 */
async function resyncFromStorage(roster: RosterCollection): Promise<void> {
  await roster.cleanup();
  await roster.preload();
}

/**
 * Cadastra um monstro e só resolve depois de persistido. `preload()` primeiro:
 * sem ele a checagem de duplicata do `insert` olha um estado que ainda não
 * carregou o que já está gravado.
 */
export function addMonster(roster: RosterCollection, monster: Monster): Promise<Monster> {
  return enqueueMutation(roster, async () => {
    await roster.preload();

    const transaction = roster.insert(monster);
    try {
      await transaction.isPersisted.promise;
    } catch (error) {
      await resyncFromStorage(roster);
      throw error;
    }

    return monster;
  });
}

/**
 * Tira um monstro do roster, traduzindo o `DeleteKeyNotFoundError` da
 * biblioteca para o `MonsterNotFoundError` do domínio.
 */
export function removeMonster(roster: RosterCollection, monsterId: string): Promise<void> {
  return enqueueMutation(roster, async () => {
    await roster.preload();

    let transaction: ReturnType<RosterCollection['delete']>;
    try {
      transaction = roster.delete(monsterId);
    } catch (error) {
      // Stryker disable next-line ConditionalExpression: `roster.delete` lança outros erros (CollectionInErrorStateError) que o fake de storage não consegue provocar.
      if (error instanceof DeleteKeyNotFoundError) {
        throw new MonsterNotFoundError(monsterId);
      }

      throw error;
    }

    try {
      await transaction.isPersisted.promise;
    } catch (error) {
      await resyncFromStorage(roster);
      throw error;
    }
  });
}

/** Busca pontual para quem não pode assinar a coleção. Ausente vira `MonsterNotFoundError`. */
export async function findMonster(roster: RosterCollection, monsterId: string): Promise<Monster> {
  await roster.preload();

  const found = roster.get(monsterId);

  if (!found) {
    throw new MonsterNotFoundError(monsterId);
  }

  return toMonster(found);
}

/**
 * Semeia o roster na primeira execução — e só nela; devolve `false` também para
 * uma semente vazia. `preload()` é obrigatório: `size` é leitura síncrona do
 * estado em memória, e uma coleção nova sobre um storage já populado lê `0` e
 * semeia por cima do que existe.
 */
export function seedIfEmpty(
  roster: RosterCollection,
  monsters: readonly Monster[],
): Promise<boolean> {
  return enqueueMutation(roster, async () => {
    await roster.preload();

    if (roster.size > 0 || monsters.length === 0) {
      return false;
    }

    const transaction = roster.insert(Array.from(monsters));
    try {
      await transaction.isPersisted.promise;
    } catch (error) {
      await resyncFromStorage(roster);
      throw error;
    }

    return true;
  });
}
