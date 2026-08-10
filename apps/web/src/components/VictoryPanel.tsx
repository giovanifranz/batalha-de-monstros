import type { BattleResult, Side } from '@arena/domain/battle';
import type { Monster } from '@arena/domain/monster';
import { Button } from '@arena/ui/components/button';
import { Card, CardContent, CardHeader } from '@arena/ui/components/card';
import { MonsterArt } from '@arena/ui/monster/MonsterArt';
import { Link } from '@tanstack/react-router';
import { ArrowLeftRight, RotateCcw, Swords, Trophy } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { initiativeReason } from '@/lib/initiative-reason.ts';

type Props = {
  left: Monster;
  right: Monster;
  result: BattleResult;
  onReplay: () => void;
};

export function VictoryPanel({ left, right, result, onReplay }: Props) {
  const fighters: Record<Side, Monster> = { left, right };
  const winner = fighters[result.winner];
  const starter = fighters[result.first];
  const reason = initiativeReason(fighters, result.first);

  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <Card
      ref={panelRef}
      tabIndex={-1}
      role="region"
      aria-label="Resultado da batalha: vencedor"
      className="focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none"
    >
      <CardHeader className="flex flex-row items-center gap-3">
        <Trophy className="text-primary size-6 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="text-lg leading-snug font-semibold">{winner.name} venceu a batalha!</h2>
          <p className="text-muted-foreground text-sm">
            {reason
              ? `${starter.name} atacou primeiro por ${reason}.`
              : `${starter.name} atacou primeiro.`}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <MonsterArt
            src={winner.imageUrl}
            width={64}
            height={64}
            className="bg-muted size-16 shrink-0 rounded-lg object-contain"
            iconClassName="size-6"
          />

          <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground text-xs uppercase">Rounds</dt>
              <dd className="font-mono tabular-nums">{result.rounds}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase">Golpes</dt>
              <dd className="font-mono tabular-nums">{result.turns.length}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground truncate text-xs uppercase">
                Dano de {left.name}
              </dt>
              <dd className="font-mono tabular-nums">{result.totalDamage.left}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground truncate text-xs uppercase">
                Dano de {right.name}
              </dt>
              <dd className="font-mono tabular-nums">{result.totalDamage.right}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onReplay}>
            <RotateCcw /> Rever batalha
          </Button>

          <Button asChild variant="secondary">
            <Link to="/battle/$leftId/$rightId" params={{ leftId: right.id, rightId: left.id }}>
              <ArrowLeftRight /> Inverter lados
            </Link>
          </Button>

          <Button asChild variant="secondary">
            <Link to="/battle">
              <Swords /> Nova batalha
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
