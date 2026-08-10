import type { Monster } from '@arena/domain/monster';
import { Trash2 } from 'lucide-react';
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
  onRemove?: (monster: Monster) => void;
};

const SLOT_LABEL = { left: 'Lutador 1', right: 'Lutador 2' } as const;

export function MonsterCard({ monster, selectedAs, onSelect, onRemove }: Props) {
  const interactive = Boolean(onSelect);

  return (
    <Card
      className={cn(
        'relative gap-3 transition-all',
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

        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            /*
             * O hover PRECISA ser um tint de `--destructive`: com o cinza que o
             * `ghost` traz, o rótulo media 3.74 contra o fundo do hover. Aqui dá
             * 7.34 claro / 5.84 escuro.
             *
             * `dark:hover:` explícito não é redundância — o `ghost` traz
             * `dark:hover:bg-muted/50`, um conjunto de variantes DIFERENTE, que o
             * tailwind-merge não descarta.
             */
            className="text-destructive-ink hover:text-destructive-ink hover:bg-destructive/10 dark:hover:bg-destructive/20 mt-1 h-8 w-full"
            /*
             * O rótulo VISÍVEL continua "Excluir"; o ACESSÍVEL carrega o dono,
             * porque seis botões "Excluir" numa lista não dizem qual monstro sai.
             * A 2.5.3 (Label in Name) segue satisfeita: o visível é PREFIXO do
             * acessível, então comando de voz ainda casa.
             */
            aria-label={`Excluir ${monster.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onRemove(monster);
            }}
          >
            <Trash2 className="size-3.5" /> Excluir
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
