import type { Monster } from '@arena/domain/monster';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../components/badge.tsx';
import { Button } from '../components/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/card.tsx';
import { cn } from '../lib/utils.ts';
import { MonsterArt } from './MonsterArt.tsx';
import { StatBar } from './StatBar.tsx';

type Props = {
  monster: Monster;
  selectedAs?: 'left' | 'right';
  onSelect?: (monster: Monster) => void;
  onEdit?: (monster: Monster) => void;
  onRemove?: (monster: Monster) => void;
};

const SLOT_LABEL = { left: 'Lutador 1', right: 'Lutador 2' } as const;

export function MonsterCard({ monster, selectedAs, onSelect, onEdit, onRemove }: Props) {
  const interactive = Boolean(onSelect);

  return (
    <Card
      className={cn(
        'relative gap-3 overflow-visible transition-all',
        interactive && 'hover:border-primary/60 cursor-pointer hover:-translate-y-1',
        selectedAs && 'border-primary ring-primary/30 ring-2',
      )}
      onClick={onSelect ? () => onSelect(monster) : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(monster);
              }
            }
          : undefined
      }
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? Boolean(selectedAs) : undefined}
    >
      {selectedAs && (
        <Badge className="absolute -top-2 left-3 z-10">{SLOT_LABEL[selectedAs]}</Badge>
      )}

      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <MonsterArt
          src={monster.imageUrl}
          width={64}
          height={64}
          loading="lazy"
          className="bg-muted size-16 shrink-0 rounded-md object-contain"
          iconClassName="size-6"
        />
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base">{monster.name}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-1.5">
        <StatBar label="HP" value={monster.hp} tone="hp" />
        <StatBar label="ATK" value={monster.attack} tone="attack" />
        <StatBar label="DEF" value={monster.defense} tone="defense" />
        <StatBar label="SPD" value={monster.speed} tone="speed" />

        {(onEdit || onRemove) && (
          <div className={cn('mt-1 grid gap-2', onEdit && onRemove && 'grid-cols-2')}>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full"
                aria-label={`Editar ${monster.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(monster);
                }}
              >
                <Pencil className="size-3.5" /> Editar
              </Button>
            )}
            {onRemove && <RemoveButton monster={monster} onRemove={onRemove} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RemoveButton({
  monster,
  onRemove,
}: {
  monster: Monster;
  onRemove: (monster: Monster) => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive-ink hover:text-destructive-ink hover:bg-destructive/10 dark:hover:bg-destructive/20 h-8 w-full"
      aria-label={`Excluir ${monster.name}`}
      onClick={(event) => {
        event.stopPropagation();
        onRemove(monster);
      }}
    >
      <Trash2 className="size-3.5" /> Excluir
    </Button>
  );
}
