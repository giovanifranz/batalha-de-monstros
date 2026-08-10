import { count, ilike, type InitialQueryBuilder } from '@tanstack/db';
import type { RosterCollection } from './collection.ts';

export type RosterWindow = {
  term: string;
  limit: number;
  offset: number;
};

function filtered(query: InitialQueryBuilder, roster: RosterCollection, term: string) {
  const base = query.from({ monster: roster });

  return term ? base.where(({ monster }) => ilike(monster.name, `%${term}%`)) : base;
}

/** Quantos monstros o termo deixa passar. Termo vazio conta o roster inteiro. */
export function countOfRoster(roster: RosterCollection, term: string) {
  return (query: InitialQueryBuilder) =>
    filtered(query, roster, term).select(({ monster }) => ({ total: count(monster.id) }));
}

/** A fatia que a página mostra, já ordenada por nome. */
export function pageOfRoster(roster: RosterCollection, { term, limit, offset }: RosterWindow) {
  return (query: InitialQueryBuilder) =>
    filtered(query, roster, term)
      .orderBy(({ monster }) => monster.name, 'asc')
      .limit(limit)
      .offset(offset);
}

/**
 * Um agregado sem `groupBy` emite UMA linha, e ZERO linha quando nada casa —
 * nunca uma linha com `total: 0`.
 */
export function readCount(rows: readonly { total: number }[] | undefined): number {
  return rows?.[0]?.total ?? 0;
}
