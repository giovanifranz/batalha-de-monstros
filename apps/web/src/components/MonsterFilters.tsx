import { Button } from '@arena/ui/components/button';
import { Input } from '@arena/ui/components/input';
import { Search, X } from 'lucide-react';

type Props = {
  q: string;
  onQueryChange: (value: string) => void;
};

/**
 * Sem estado local espelhando o valor: o `limitUrlUpdates` do nuqs atrasa só a
 * escrita na URL, e um `useState` aqui criaria a corrida de "a URL chegou
 * atrasada e sobrescreveu o que o usuário acabou de digitar".
 */
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
        // O X nativo do WebKit não segue o tema; o botão abaixo faz o mesmo papel.
        className="h-9 pr-9 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {q !== '' && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
          onClick={() => onQueryChange('')}
          // "Limpar campo de busca" e não "Limpar busca": o card de "nenhum
          // resultado" mostra um botão com esse nome ao mesmo tempo que este X.
          aria-label="Limpar campo de busca"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
