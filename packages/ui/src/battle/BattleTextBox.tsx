import type { BattleTurn, Side } from '@arena/domain/battle';
import type { Monster } from '@arena/domain/monster';
import { Card } from '../components/card.tsx';

export type Beat = 'announce' | 'impact';
export type PlaybackStatus = 'intro' | 'playing' | 'finished';

type Props = {
  fighters: Record<Side, Monster>;
  turn?: BattleTurn;
  beat: Beat;
  status: PlaybackStatus;
  winnerName: string;
};

function buildMessage({ fighters, turn, beat, status, winnerName }: Props): string {
  if (status === 'intro') {
    return `${fighters.left.name.toUpperCase()} vs ${fighters.right.name.toUpperCase()}!`;
  }
  if (status === 'finished' || !turn) {
    return `${winnerName.toUpperCase()} venceu a batalha!`;
  }

  const attacker = fighters[turn.attacker].name.toUpperCase();
  const defender = fighters[turn.defender].name.toUpperCase();

  if (beat === 'announce') return `${attacker} atacou!`;
  if (turn.defenderHpAfter === 0) return `${defender} foi derrotado!`;
  // Mostra a regra do dano mínimo acontecendo, em vez de escondê-la.
  if (turn.isChip) return `A defesa de ${defender} segurou! Só ${turn.damage} de dano.`;
  return `${defender} perdeu ${turn.damage} de HP!`;
}

export function BattleTextBox(props: Props) {
  return (
    <Card className="min-h-20 justify-center p-4" aria-live="polite" aria-atomic="true">
      <p className="leading-relaxed">{buildMessage(props)}</p>
    </Card>
  );
}
