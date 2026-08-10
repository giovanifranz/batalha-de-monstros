import { MonsterNotFoundError } from '@arena/domain/errors';
import { monsterSchema, type Monster, type MonsterFormValues } from '@arena/domain/monster';
import {
  createCollection,
  DeleteKeyNotFoundError,
  localOnlyCollectionOptions,
  UpdateKeyNotFoundError,
} from '@tanstack/db';

export type RosterCollectionOptions = {
  initialData?: Monster[];
};

export function createRosterCollection({ initialData }: RosterCollectionOptions = {}) {
  return createCollection(
    localOnlyCollectionOptions({
      getKey: (monster) => monster.id,
      schema: monsterSchema,
      initialData,
    }),
  );
}

export type RosterCollection = ReturnType<typeof createRosterCollection>;

export function toMonster(row: Monster): Monster {
  const { id, name, attack, defense, speed, hp, imageUrl } = row;

  return { id, name, attack, defense, speed, hp, imageUrl };
}

export async function addMonster(roster: RosterCollection, monster: Monster): Promise<Monster> {
  await roster.preload();

  const transaction = roster.insert(monster);
  await transaction.isPersisted.promise;

  return monster;
}

export async function updateMonster(
  roster: RosterCollection,
  monsterId: string,
  values: MonsterFormValues,
): Promise<Monster> {
  await roster.preload();

  const patch: MonsterFormValues = {
    name: values.name,
    attack: values.attack,
    defense: values.defense,
    speed: values.speed,
    hp: values.hp,
    imageUrl: values.imageUrl,
  };

  let transaction: ReturnType<RosterCollection['update']>;
  try {
    transaction = roster.update(monsterId, (draft) => {
      Object.assign(draft, patch);
    });
  } catch (error) {
    // Stryker disable next-line ConditionalExpression: `roster.update` lança outros erros (CollectionInErrorStateError) que a coleção em memória não consegue provocar.
    if (error instanceof UpdateKeyNotFoundError) {
      throw new MonsterNotFoundError(monsterId);
    }

    throw error;
  }

  await transaction.isPersisted.promise;

  return { id: monsterId, ...patch };
}

export async function removeMonster(roster: RosterCollection, monsterId: string): Promise<void> {
  await roster.preload();

  let transaction: ReturnType<RosterCollection['delete']>;
  try {
    transaction = roster.delete(monsterId);
  } catch (error) {
    // Stryker disable next-line ConditionalExpression: `roster.delete` lança outros erros (CollectionInErrorStateError) que a coleção em memória não consegue provocar.
    if (error instanceof DeleteKeyNotFoundError) {
      throw new MonsterNotFoundError(monsterId);
    }

    throw error;
  }

  await transaction.isPersisted.promise;
}

export async function findMonster(roster: RosterCollection, monsterId: string): Promise<Monster> {
  await roster.preload();

  const found = roster.get(monsterId);

  if (!found) {
    throw new MonsterNotFoundError(monsterId);
  }

  return toMonster(found);
}

export async function seedIfEmpty(
  roster: RosterCollection,
  monsters: readonly Monster[],
): Promise<boolean> {
  await roster.preload();

  if (roster.size > 0 || monsters.length === 0) {
    return false;
  }

  const transaction = roster.insert(Array.from(monsters));
  await transaction.isPersisted.promise;

  return true;
}
