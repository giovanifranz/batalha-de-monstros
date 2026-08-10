import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@arena/ui/components/pagination';
import type { MouseEvent } from 'react';

type Props = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  hrefForPage: (page: number) => string;
};

function pageItems(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) items.push('ellipsis');
  for (let current = start; current <= end; current += 1) items.push(current);
  if (end < totalPages - 1) items.push('ellipsis');
  items.push(totalPages);

  return items;
}

function isPlainClick(event: MouseEvent): boolean {
  return !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0);
}

export function MonsterPagination({ page, totalPages, onChange, hrefForPage }: Props) {
  if (totalPages <= 1) return null;

  const go = (target: number) => (event: MouseEvent) => {
    if (!isPlainClick(event)) return;

    event.preventDefault();
    if (target !== page) onChange(target);
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            text="Anterior"
            aria-label="Ir para a página anterior"
            aria-disabled={page === 1}
            className={page === 1 ? 'pointer-events-none opacity-50' : undefined}
            href={page === 1 ? undefined : hrefForPage(page - 1)}
            onClick={go(page - 1)}
          />
        </PaginationItem>

        {pageItems(page, totalPages).map((item, index) => (
          <PaginationItem key={item === 'ellipsis' ? `ellipsis-${index}` : item}>
            {item === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                isActive={item === page}
                aria-label={`Ir para a página ${item}`}
                href={hrefForPage(item)}
                onClick={go(item)}
              >
                {item}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            text="Próxima"
            aria-label="Ir para a próxima página"
            aria-disabled={page === totalPages}
            className={page === totalPages ? 'pointer-events-none opacity-50' : undefined}
            href={page === totalPages ? undefined : hrefForPage(page + 1)}
            onClick={go(page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
