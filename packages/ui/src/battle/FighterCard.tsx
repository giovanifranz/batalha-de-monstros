import type { Side } from '@arena/domain/battle';
import type { Monster } from '@arena/domain/monster';
import { cn } from '../lib/utils.ts';
import { MonsterArt } from '../monster/MonsterArt.tsx';
import { HpBar } from './HpBar.tsx';

const LUNGE: Record<Side, string> = {
  left: 'motion-safe:animate-[lunge-right_0.4s_ease-out]',
  right: 'motion-safe:animate-[lunge-left_0.4s_ease-out]',
};

const TILT: Record<Side, string> = { left: '-rotate-1', right: 'rotate-1' };

type Props = {
  monster: Monster;
  hp: number;
  side: Side;
  isAttacking?: boolean;
  isTakingHit?: boolean;
  isDefeated?: boolean;
  drainMs?: number;
  className?: string;
};

function beatAnimation({
  side,
  isAttacking,
  isTakingHit,
  isDefeated,
}: Pick<Props, 'side' | 'isAttacking' | 'isTakingHit' | 'isDefeated'>): string {
  if (isDefeated) return 'animate-[defeat-drop_0.6s_ease-in_forwards] grayscale';
  if (isTakingHit) return 'motion-safe:animate-[hit-shake_0.45s_ease-in-out]';
  if (isAttacking) return LUNGE[side];
  return 'motion-safe:animate-[idle-bob_2.4s_ease-in-out_infinite]';
}

export function FighterCard({
  monster,
  hp,
  side,
  isAttacking,
  isTakingHit,
  isDefeated,
  drainMs,
  className,
}: Props) {
  return (
    <article
      data-side={side}
      className={cn(
        'bg-card text-card-foreground ring-foreground/15 flex w-full max-w-64 flex-col overflow-hidden rounded-xl ring-1',
        TILT[side],
        isAttacking && !isDefeated && 'ring-primary ring-4',
        beatAnimation({ side, isAttacking, isTakingHit, isDefeated }),
        className,
      )}
    >
      <h3 className="bg-foreground text-background truncate px-3 py-1.5 text-sm font-semibold uppercase">
        {monster.name}
      </h3>

      <div data-slot="art-frame" className="bg-muted aspect-4/3 min-h-0 w-full">
        <MonsterArt
          src={monster.imageUrl}
          iconClassName="size-10"
          className={cn(
            'size-full object-cover',
            isTakingHit && 'motion-safe:animate-[hit-flash_0.45s_steps(2,end)_2]',
          )}
        />
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold tracking-widest">HP</span>
          <HpBar current={hp} max={monster.hp} label={`HP de ${monster.name}`} drainMs={drainMs} />
          <span className="font-mono text-xs tabular-nums">
            {hp}/{monster.hp}
          </span>
        </div>

        <p className="flex justify-center gap-2 border-t pt-2 font-mono text-xs tabular-nums">
          <span>ATK {monster.attack}</span>
          <span aria-hidden="true">·</span>
          <span>DEF {monster.defense}</span>
          <span aria-hidden="true">·</span>
          <span>SPD {monster.speed}</span>
        </p>
      </div>
    </article>
  );
}
