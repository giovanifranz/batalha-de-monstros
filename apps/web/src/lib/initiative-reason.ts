import type { Side } from '@arena/domain/battle';
import type { Monster } from '@arena/domain/monster';

export function initiativeReason(fighters: Record<Side, Monster>, first: Side): string | null {
  const starter = fighters[first];
  const opponent = fighters[first === 'left' ? 'right' : 'left'];

  if (starter.speed > opponent.speed) {
    return `velocidade maior (${starter.speed} vs ${opponent.speed})`;
  }
  if (starter.speed !== opponent.speed) return null;

  if (starter.attack > opponent.attack) {
    return `empate na velocidade e ataque maior (${starter.attack} vs ${opponent.attack})`;
  }
  if (starter.attack !== opponent.attack) return null;

  return first === 'left' ? 'empate total — o desempate fica com o Lutador 1' : null;
}
