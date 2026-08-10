import type { Side } from '@arena/domain/battle';
import type { Monster } from '@arena/domain/monster';

/**
 * Explica POR QUE o lado `first` começou, sem nunca decidir quem começa.
 *
 * Toda comparação confere a PRÓPRIA premissa em vez de cair de degrau em
 * degrau: se um critério novo entrar no domínio, uma cascata diria "empate na
 * velocidade" sobre dois monstros de velocidades diferentes. Aqui um começo que
 * esta escada não explica devolve `null`, e o painel não diz nada.
 */
export function initiativeReason(fighters: Record<Side, Monster>, first: Side): string | null {
  const starter = fighters[first];
  const opponent = fighters[first === 'left' ? 'right' : 'left'];

  if (starter.speed > opponent.speed) {
    return `velocidade maior (${starter.speed} vs ${opponent.speed})`;
  }
  // Começou sendo mais lento: nenhum degrau conhecido explica isso.
  if (starter.speed !== opponent.speed) return null;

  if (starter.attack > opponent.attack) {
    return `empate na velocidade e ataque maior (${starter.attack} vs ${opponent.attack})`;
  }
  if (starter.attack !== opponent.attack) return null;

  // Empate nos dois: o domínio desempata pela esquerda. Se um dia começar pela
  // direita, esta frase estaria errada — por isso ela também é condicional.
  return first === 'left' ? 'empate total — o desempate fica com o Lutador 1' : null;
}
