import { monsterFormSchema } from '@arena/domain/monster';
import { describe, expect, it } from 'vitest';
import { distributePoints, rollStats } from './roll-stats.ts';

describe('distributePoints', () => {
  it('nunca ultrapassa o teto de uma estatística mesmo pedindo mais do que ela comporta', () => {
    // Arrange: só uma estatística (teto 100) e um total que estouraria para 150.

    // Act
    const result = distributePoints(150, [[0, 100]]);

    // Assert
    expect(result).toEqual([100]);
  });

  it('devolve os mínimos quando o total não alcança nem a soma deles', () => {
    // Arrange: total 0, abaixo da soma dos mínimos (1 + 0 + 0 = 1).

    // Act
    const result = distributePoints(0, [
      [1, 100],
      [0, 100],
      [0, 100],
    ]);

    // Assert
    expect(result).toEqual([1, 0, 0]);
  });

  it('trata total NaN como "sem orçamento para distribuir" e devolve os mínimos', () => {
    // Arrange
    const total = Number.NaN;

    // Act
    const result = distributePoints(total, [
      [1, 100],
      [0, 100],
      [0, 100],
    ]);

    // Assert
    expect(result).toEqual([1, 0, 0]);
  });

  it('a soma bate com o total pedido quando ele cabe na capacidade conjunta', () => {
    // Arrange
    const limits = [
      [1, 100],
      [0, 100],
      [0, 100],
    ] as const;

    // Act: 500 chamadas reais, sem mockar Math.random.
    const sums = Array.from({ length: 500 }, () =>
      distributePoints(217, limits).reduce((sum, value) => sum + value, 0),
    );

    // Assert
    expect(sums.every((sum) => sum === 217)).toBe(true);
  });

  it('nenhuma estatística sai fora do próprio intervalo, em nenhuma das 500 rodadas', () => {
    // Arrange
    const limits = [
      [1, 100],
      [0, 100],
      [0, 100],
    ] as const;

    // Act
    const rounds = Array.from({ length: 500 }, () => distributePoints(217, limits));

    // Assert
    const withinBounds = rounds.every((values) =>
      values.every((value, index) => value >= limits[index][0] && value <= limits[index][1]),
    );
    expect(withinBounds).toBe(true);
  });
});

describe('rollStats', () => {
  it('nunca produz um monstro que monsterFormSchema rejeita', () => {
    // Arrange: contra o schema de verdade, não uma reimplementação da soma.
    const rolls = Array.from({ length: 500 }, () => ({
      name: 'Monstro de teste',
      ...rollStats(),
      imageUrl: 'https://example.com/monstro.png',
    }));

    // Act
    const results = rolls.map((values) => monsterFormSchema.safeParse(values));

    // Assert
    expect(results.every((result) => result.success)).toBe(true);
  });

  it('varia o total gasto entre sorteios — não trava sempre no teto do orçamento', () => {
    // Arrange
    const rolls = Array.from({ length: 50 }, () => rollStats());

    // Act: o mesmo "used" que o PointBudget calcula ao vivo.
    const spent = rolls.map(
      (roll) => roll.attack + roll.defense + roll.speed + Math.floor(roll.hp / 3),
    );

    // Assert: mais de um total distinto em 50 rodadas.
    expect(new Set(spent).size).toBeGreaterThan(1);
  });

  it('varia as estatísticas individuais — não converge sempre para partes iguais', () => {
    // Arrange
    const rolls = Array.from({ length: 30 }, () => rollStats());

    // Act
    const attacks = rolls.map((roll) => roll.attack);

    // Assert: a amplitude tem que sobrar espaço para arquétipos como 92/25/100.
    expect(Math.max(...attacks) - Math.min(...attacks)).toBeGreaterThan(15);
  });
});
