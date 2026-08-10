import type { Side } from '@arena/domain/battle';
import type { Monster } from '@arena/domain/monster';
import { cn } from '../lib/utils.ts';
import { MonsterArt } from '../monster/MonsterArt.tsx';
import { HpBar } from './HpBar.tsx';

// Classes arbitrárias precisam existir como string literal no source: o scanner
// do Tailwind não resolve interpolação.
const LUNGE: Record<Side, string> = {
  left: 'motion-safe:animate-[lunge-right_0.4s_ease-out]',
  right: 'motion-safe:animate-[lunge-left_0.4s_ease-out]',
};

// `rotate-*` no Tailwind 4 emite a propriedade `rotate`, independente de
// `transform`: a inclinação sobrevive às animações, que só mexem em `transform`.
const TILT: Record<Side, string> = { left: '-rotate-1', right: 'rotate-1' };

type Props = {
  monster: Monster;
  /** HP atual. A barra e o numeral saem daqui, nunca de `monster.hp`. */
  hp: number;
  /** Só orienta a investida e a inclinação da carta. Não muda a arte. */
  side: Side;
  isAttacking?: boolean;
  isTakingHit?: boolean;
  isDefeated?: boolean;
  /** Repassado para a `HpBar`: quanto tempo a barra leva para chegar no novo HP. */
  drainMs?: number;
  className?: string;
};

/**
 * UMA animação só, escolhida por precedência: derrota > golpe > investida >
 * ocioso. Duas classes `animate-[…]` no mesmo elemento NÃO se anulam — o
 * `tailwind-merge` as põe em grupos diferentes por causa da variante, e quem
 * vence passa a ser a ordem do CSS, que se inverte sob `reduced-motion`.
 */
function beatAnimation({
  side,
  isAttacking,
  isTakingHit,
  isDefeated,
}: Pick<Props, 'side' | 'isAttacking' | 'isTakingHit' | 'isDefeated'>): string {
  // Sem `motion-safe:`: com `forwards` a animação existe para deixar o estado final
  // aplicado. `grayscale` é filtro e preserva a luminância, então o contraste não muda.
  if (isDefeated) return 'animate-[defeat-drop_0.6s_ease-in_forwards] grayscale';
  // Quem pisca é a arte: baixar a opacidade da carta inteira derrubaria o
  // contraste do texto que ela carrega.
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
        // Estático, não animação: por isso não entra na precedência de `beatAnimation`.
        isAttacking && !isDefeated && 'ring-primary ring-4',
        beatAnimation({ side, isAttacking, isTakingHit, isDefeated }),
        className,
      )}
    >
      {/* `bg-foreground/text-background` é a única inversão que passa AA nos dois
          temas (12.05 claro, 5.61 escuro). */}
      <h3 className="bg-foreground text-background truncate px-3 py-1.5 text-sm font-semibold uppercase">
        {monster.name}
      </h3>

      {/* `min-h-0`: item de flex-col herda `min-height: auto`, e a altura intrínseca
          da arte ganharia do `aspect-[4/3]`. */}
      <div data-slot="art-frame" className="bg-muted aspect-4/3 min-h-0 w-full">
        {/* Decorativa (`alt=""` por default): o nome já está no banner acima. */}
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
