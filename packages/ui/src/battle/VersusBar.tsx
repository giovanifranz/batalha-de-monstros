import type { Side } from '@arena/domain/battle';
import type { Monster } from '@arena/domain/monster';
import { ArrowLeftRight, Swords, X } from 'lucide-react';
import { Button } from '../components/button.tsx';
import { Card } from '../components/card.tsx';
import { cn } from '../lib/utils.ts';
import { MonsterArt } from '../monster/MonsterArt.tsx';

type Props = {
  left: Monster | null;
  right: Monster | null;
  /** Slot que vai receber a próxima seleção feita no grid. `null` quando os dois já estão cheios. */
  activeSlot: Side | null;
  /** Prop, não derivação: quem decide é a máquina de seleção em `apps/web`. */
  canFight: boolean;
  onClear: (slot: Side) => void;
  onSwap: () => void;
  onFight: () => void;
};

const SLOT_LABEL: Record<Side, string> = { left: 'Lutador 1', right: 'Lutador 2' };

/**
 * O que a barra anuncia depois de cada clique no grid: o foco fica no card, e
 * qual slot é o da vez era informação só do contorno colorido.
 */
function announcement(
  left: Monster | null,
  right: Monster | null,
  activeSlot: Side | null,
): string {
  if (activeSlot === null) {
    return left && right ? `Dupla completa: ${left.name} contra ${right.name}.` : 'Dupla completa.';
  }

  const occupant = activeSlot === 'left' ? left : right;
  const target = SLOT_LABEL[activeSlot];

  return occupant
    ? `Próxima escolha substitui ${occupant.name} no ${target}.`
    : `Próxima escolha preenche o ${target}.`;
}

function Slot({
  side,
  monster,
  active,
  onClear,
}: {
  side: Side;
  monster: Monster | null;
  active: boolean;
  onClear: (slot: Side) => void;
}) {
  return (
    <Card
      // `aria-current` e o "próximo" abaixo carregam o mesmo sinal que o contorno
      // colorido: sem eles a cor seria a única portadora (reprova a 1.4.1).
      aria-current={active ? 'true' : undefined}
      className={cn(
        // `w-28` e não `w-32`: a 320px os dois slots mais o botão somavam 312px
        // contra 288px disponíveis, e o "Lutar!" subia de linha.
        'relative w-28 items-center gap-1 p-3 text-center sm:w-40',
        active && 'border-primary bg-primary/5',
      )}
    >
      <span className="text-muted-foreground text-xs uppercase">{SLOT_LABEL[side]}</span>

      {/* `invisible` em vez de não renderizar: reserva a altura nos dois slots, e
          `visibility: hidden` também tira o nó da árvore de acessibilidade. */}
      <span
        className={cn(
          'text-[10px] leading-none font-semibold uppercase',
          active ? 'text-foreground' : 'invisible',
        )}
      >
        próximo
      </span>

      {monster ? (
        <>
          <MonsterArt
            src={monster.imageUrl}
            width={48}
            height={48}
            className="size-12 object-contain"
            iconClassName="size-5"
          />
          <p className="w-full truncate text-sm">{monster.name}</p>
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute top-1 right-1"
            aria-label={`Remover ${monster.name}`}
            onClick={() => onClear(side)}
          >
            <X />
          </Button>
        </>
      ) : (
        <span
          aria-hidden="true"
          className="text-muted-foreground flex size-12 items-center justify-center text-2xl"
        >
          ?
        </span>
      )}
    </Card>
  );
}

export function VersusBar({ left, right, activeSlot, canFight, onClear, onSwap, onFight }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Slot side="left" monster={left} active={activeSlot === 'left'} onClear={onClear} />

      <Button variant="outline" size="icon" aria-label="Inverter lutadores" onClick={onSwap}>
        <ArrowLeftRight />
      </Button>

      <Slot side="right" monster={right} active={activeSlot === 'right'} onClear={onClear} />

      <Button disabled={!canFight} onClick={onFight}>
        <Swords /> Lutar!
      </Button>

      {/* `role="status"` é polite: espera a fala em curso terminar, então completa
          o anúncio do `aria-pressed` do card em vez de atropelá-lo. */}
      <p role="status" className="sr-only">
        {announcement(left, right, activeSlot)}
      </p>
    </div>
  );
}
