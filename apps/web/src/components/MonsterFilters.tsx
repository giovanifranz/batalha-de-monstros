import { Button } from '@arena/ui/components/button';
import { Input } from '@arena/ui/components/input';
import { Search, X } from 'lucide-react';

type Props = {
  q: string;
  onQueryChange: (value: string) => void;
};

export function MonsterFilters({ q, onQueryChange }: Props) {
  return (
    <div className="relative max-w-sm">
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        type="search"
        value={q}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Buscar por nome"
        aria-label="Buscar monstro por nome"
        className="h-9 pr-9 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {q !== '' && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
          onClick={() => onQueryChange('')}
          aria-label="Limpar campo de busca"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
