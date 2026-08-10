import { resolveFirstAttacker, type Side } from '@arena/domain/battle';
import type { Monster } from '@arena/domain/monster';
import { describe, expect, it } from 'vitest';
import { initiativeReason } from './initiative-reason.ts';

function monster(overrides: Partial<Monster>): Monster {
  return {
    id: 'm',
    name: 'M',
    hp: 100,
    attack: 50,
    defense: 50,
    speed: 50,
    imageUrl: 'https://example.test/m.png',
    ...overrides,
  };
}

function fightersOf(left: Monster, right: Monster): Record<Side, Monster> {
  return { left, right };
}

describe('initiativeReason', () => {
  it('credita a velocidade quando ela é o que decide', () => {
    // Arrange
    const fighters = fightersOf(monster({ speed: 80 }), monster({ speed: 40 }));

    // Act
    const reason = initiativeReason(fighters, 'left');

    // Assert
    expect(reason).toBe('velocidade maior (80 vs 40)');
  });

  it('credita o ataque quando as velocidades empatam', () => {
    // Arrange
    const fighters = fightersOf(
      monster({ speed: 60, attack: 30 }),
      monster({ speed: 60, attack: 70 }),
    );

    // Act
    const reason = initiativeReason(fighters, 'right');

    // Assert
    expect(reason).toBe('empate na velocidade e ataque maior (70 vs 30)');
  });

  it('nomeia o desempate pelo Lutador 1 quando não há vantagem nenhuma', () => {
    // Arrange
    const fighters = fightersOf(
      monster({ speed: 55, attack: 55 }),
      monster({ speed: 55, attack: 55 }),
    );

    // Act
    const reason = initiativeReason(fighters, 'left');

    // Assert
    expect(reason).toBe('empate total — o desempate fica com o Lutador 1');
  });

  // Os dois testes abaixo descrevem começos que o domínio de HOJE não produz, e
  // que uma versão em cascata explicaria com uma frase falsa.

  it('fica calado quando quem começou era o mais lento', () => {
    // Arrange: a direita é mais lenta e mesmo assim começou.
    const fighters = fightersOf(monster({ speed: 90 }), monster({ speed: 10 }));

    // Act
    const reason = initiativeReason(fighters, 'right');

    // Assert
    expect(reason).toBeNull();
  });

  it('fica calado quando o empate total foi resolvido pelo Lutador 2', () => {
    // Arrange
    const fighters = fightersOf(
      monster({ speed: 50, attack: 50 }),
      monster({ speed: 50, attack: 50 }),
    );

    // Act
    const reason = initiativeReason(fighters, 'right');

    // Assert
    expect(reason).toBeNull();
  });

  /**
   * O canário: quem começa vem sempre do `resolveFirstAttacker` do domínio, então
   * um critério novo lá faz algum par cair no `null` e este teste fica vermelho.
   * CADA par entra nas DUAS ordenações de propósito — um critério baseado em
   * valor concorda com o desempate-pela-esquerda em no máximo uma delas.
   */
  it('explica todo começo que o domínio decide hoje', () => {
    // Arrange: os três degraus conhecidos, mais defesa e HP nas duas ordenações.
    const pairs: [Monster, Monster][] = [
      [monster({ speed: 80 }), monster({ speed: 40 })],
      [monster({ speed: 40 }), monster({ speed: 80 })],
      [monster({ speed: 60, attack: 90 }), monster({ speed: 60, attack: 20 })],
      [monster({ speed: 60, attack: 20 }), monster({ speed: 60, attack: 90 })],
      [monster({ speed: 50, attack: 50 }), monster({ speed: 50, attack: 50 })],
      [
        monster({ speed: 50, attack: 50, defense: 10 }),
        monster({ speed: 50, attack: 50, defense: 90 }),
      ],
      [
        monster({ speed: 50, attack: 50, defense: 90 }),
        monster({ speed: 50, attack: 50, defense: 10 }),
      ],
      [monster({ speed: 50, attack: 50, hp: 120 }), monster({ speed: 50, attack: 50, hp: 300 })],
      [monster({ speed: 50, attack: 50, hp: 300 }), monster({ speed: 50, attack: 50, hp: 120 })],
    ];

    // Act
    const reasons = pairs.map(([left, right]) =>
      initiativeReason(fightersOf(left, right), resolveFirstAttacker(left, right)),
    );

    // Assert
    expect(reasons.filter((reason) => reason === null)).toEqual([]);
  });
});
