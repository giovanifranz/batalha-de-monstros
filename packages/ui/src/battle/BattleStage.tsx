import type { Side } from '@arena/domain/battle';
import type { Monster } from '@arena/domain/monster';
import { FighterCard } from './FighterCard.tsx';

type Props = {
  fighters: Record<Side, Monster>;
  hp: Record<Side, number>;
  attacking?: Side;
  takingHit?: Side;
  /** Duração do esvaziamento das barras de HP: quem sabe o ritmo é o reprodutor em `apps/web`. */
  drainMs?: number;
};

export function BattleStage({ fighters, hp, attacking, takingHit, drainMs }: Props) {
  return (
    <div className="from-arena-sky to-arena-ground overflow-hidden rounded-xl border bg-linear-to-b p-4 sm:p-6">
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
        <FighterCard
          monster={fighters.left}
          hp={hp.left}
          side="left"
          isAttacking={attacking === 'left'}
          isTakingHit={takingHit === 'left'}
          isDefeated={hp.left === 0}
          drainMs={drainMs}
        />

        {/* Chip opaco em vez de texto solto: o fundo daqui é um gradiente, e
            texto sobre gradiente não tem contraste que se possa medir. */}
        <p className="bg-card text-card-foreground ring-foreground/15 shrink-0 rounded-full px-3 py-2 font-mono text-sm font-bold ring-1">
          VS
        </p>

        <FighterCard
          monster={fighters.right}
          hp={hp.right}
          side="right"
          isAttacking={attacking === 'right'}
          isTakingHit={takingHit === 'right'}
          isDefeated={hp.right === 0}
          drainMs={drainMs}
        />
      </div>
    </div>
  );
}
