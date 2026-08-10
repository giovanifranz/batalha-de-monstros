import { useEffect, useRef } from 'react';
import type { Monster } from '@arena/domain/monster';
import { toMonster, type RosterCollection } from '@arena/infra/roster/collection';
import { countOfRoster, pageOfRoster, readCount } from '@arena/infra/roster/queries';
import { useLiveQuery } from '@tanstack/react-db';
import { useLocation } from '@tanstack/react-router';
import { debounce, useQueryStates } from 'nuqs';
import { paginate } from '@/lib/pagination.ts';
import { browserParsers, serializeBrowserSearch } from '@/lib/search-params.ts';

export const PAGE_SIZE = 8;

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

  const term = q.trim();

  const { data: rosterTotal } = useLiveQuery(countOfRoster(roster, ''));
  const { data: filteredTotal } = useLiveQuery(countOfRoster(roster, term), [term]);

  const rosterSize = readCount(rosterTotal);
  const totalItems = readCount(filteredTotal);

  const { totalPages, page: safePage, offset } = paginate(totalItems, PAGE_SIZE, page);

  const { data: pageRows } = useLiveQuery(
    pageOfRoster(roster, { term, limit: PAGE_SIZE, offset }),
    [term, offset],
  );

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
    monsters: pageRows.map(toMonster),
    totalItems,
    rosterSize,
    totalPages,
    page: safePage,

    setQuery: (value: string) =>
      void setSearch({ q: value, page: 1 }, { history: 'replace', limitUrlUpdates: debounce(300) }),

    setPage: (value: number) => void setSearch({ page: value }, { history: 'push' }),

    hrefForPage: (value: number) => serializeBrowserSearch(pathname, { q, page: value }),
  };
}
