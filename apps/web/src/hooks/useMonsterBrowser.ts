import { useEffect, useRef } from 'react';
import type { Monster } from '@arena/domain/monster';
import { toMonster, type RosterCollection } from '@arena/infra/roster/collection';
import { useLiveQuery } from '@tanstack/react-db';
import { useLocation } from '@tanstack/react-router';
import { debounce, useQueryStates } from 'nuqs';
import { browserParsers, serializeBrowserSearch } from '@/lib/search-params.ts';

export const PAGE_SIZE = 8;

export function sortByName(monsters: readonly Monster[]): Monster[] {
  return [...monsters].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}

export type MonsterBrowser = {
  q: string;
  monsters: Monster[];
  totalItems: number;
  rosterSize: number;
  totalPages: number;
  page: number;
  setQuery: (value: string) => void;
  setPage: (value: number) => void;
  hrefForPage: (value: number) => string;
};

export function useMonsterBrowser(roster: RosterCollection): MonsterBrowser {
  const [{ q, page }, setSearch] = useQueryStates(browserParsers);

  const pathname = useLocation({ select: (location) => location.pathname });

  const { data } = useLiveQuery(roster);

  const all = sortByName((data ?? []).map(toMonster));

  const term = q.trim().toLocaleLowerCase('pt-BR');
  const filtered = term
    ? all.filter((monster) => monster.name.toLocaleLowerCase('pt-BR').includes(term))
    : all;

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;

  const arrivalNormalized = useRef(false);
  useEffect(() => {
    if (arrivalNormalized.current) return;

    arrivalNormalized.current = true;
    if (page !== safePage) {
      void setSearch({ page: safePage }, { history: 'replace' });
    }
  }, [page, safePage, setSearch]);

  return {
    q,
    monsters: filtered.slice(start, start + PAGE_SIZE),
    totalItems,
    rosterSize: all.length,
    totalPages,
    page: safePage,

    setQuery: (value: string) =>
      void setSearch({ q: value, page: 1 }, { history: 'replace', limitUrlUpdates: debounce(300) }),

    setPage: (value: number) => void setSearch({ page: value }, { history: 'push' }),

    hrefForPage: (value: number) => serializeBrowserSearch(pathname, { q, page: value }),
  };
}
