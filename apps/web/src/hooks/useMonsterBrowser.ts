import { useEffect, useRef } from 'react';
import type { Monster } from '@arena/domain/monster';
import { toMonster, type RosterCollection } from '@arena/infra/roster/collection';
import { useLiveQuery } from '@tanstack/react-db';
import { useLocation } from '@tanstack/react-router';
import { debounce, useQueryStates } from 'nuqs';
import { browserParsers, serializeBrowserSearch } from '@/search-params.ts';

export const PAGE_SIZE = 6;

/**
 * A definição da ordem em que o grid mostra o roster — quem precisa saber qual é
 * a primeira dupla chama isto em vez de reimplementar o `sort`. Ordena numa
 * CÓPIA: a coleção do TanStack DB não pode ser reordenada no lugar.
 */
export function sortByName(monsters: readonly Monster[]): Monster[] {
  return [...monsters].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}

export type MonsterBrowser = {
  q: string;
  /** Os monstros da página atual. */
  monsters: Monster[];
  /** Quantos monstros o filtro deixou passar, somando todas as páginas. */
  totalItems: number;
  /** Quantos monstros existem no roster, ignorando o filtro. */
  rosterSize: number;
  totalPages: number;
  page: number;
  setQuery: (value: string) => void;
  setPage: (value: number) => void;
  hrefForPage: (value: number) => string;
};

/**
 * Lê o roster e a URL, e devolve a fatia que a página renderiza. Zero `useMemo`:
 * é o cálculo derivado que o React Compiler memoiza sozinho.
 */
export function useMonsterBrowser(roster: RosterCollection): MonsterBrowser {
  const [{ q, page }, setSearch] = useQueryStates(browserParsers);

  // Mais de uma rota usa este hook: um pathname fixo daria o `href` errado para
  // teclado e "abrir em nova aba", e o clique comum esconderia o bug.
  const pathname = useLocation({ select: (location) => location.pathname });

  // É `useLiveQuery` que assina as mudanças e faz a tela reagir a outra aba.
  const { data } = useLiveQuery(roster);

  // Sem `orderBy` a ordem é a do mapa interno da coleção, reconstruído a cada
  // resincronização — ordenar aqui impede as cartas de trocarem de lugar.
  const all = sortByName((data ?? []).map(toMonster));

  const term = q.trim().toLocaleLowerCase('pt-BR');
  const filtered = term
    ? all.filter((monster) => monster.name.toLocaleLowerCase('pt-BR').includes(term))
    : all;

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  // A URL é texto livre: `?page=99` mostra a última página, não uma tela vazia.
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;

  // Arruma a URL UMA VEZ, na chegada, e nunca a cada mudança de `totalPages`:
  // uma escrita que falha é aplicada de forma otimista antes de falhar, então
  // corrigir sempre apagaria o `?page=2` e o rollback não o devolveria.
  // `replace`, não `push`: é correção, não navegação.
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

    // `replace` + debounce: digitar não pode criar uma entrada de histórico por
    // tecla. `limitUrlUpdates` atrasa só a escrita na URL, não o `q` devolvido.
    setQuery: (value: string) =>
      void setSearch({ q: value, page: 1 }, { history: 'replace', limitUrlUpdates: debounce(300) }),

    // Paginação SIM merece histórico: o "voltar" tem de funcionar.
    setPage: (value: number) => void setSearch({ page: value }, { history: 'push' }),

    hrefForPage: (value: number) => serializeBrowserSearch(pathname, { q, page: value }),
  };
}
