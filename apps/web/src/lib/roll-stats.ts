import { ATTRIBUTE_BUDGET, STAT_LIMITS, type MonsterFormValues } from '@arena/domain/monster';

export function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function distributePoints(
  total: number,
  limits: readonly (readonly [number, number])[],
): number[] {
  const mins = limits.map(([min]) => min);
  const maxs = limits.map(([, max]) => max);
  const minSum = mins.reduce((sum, value) => sum + value, 0);
  const target = Number.isFinite(total) ? Math.max(total, minSum) : minSum;
  const spendable = target - minSum;

  const cuts = Array.from({ length: limits.length - 1 }, () => randomInt(0, spendable)).sort(
    (a, b) => a - b,
  );
  const bounds = [0, ...cuts, spendable];
  const values = mins.map((min, index) => min + (bounds[index + 1] - bounds[index]));

  let overflow = 0;
  const clamped = values.map((value, index) => {
    if (value > maxs[index]) {
      overflow += value - maxs[index];
      return maxs[index];
    }
    return value;
  });

  while (overflow > 0) {
    const open = clamped.flatMap((value, index) => (value < maxs[index] ? [index] : []));
    if (open.length === 0) break;

    const pick = open[Math.floor(Math.random() * open.length)];
    clamped[pick] += 1;
    overflow -= 1;
  }

  return clamped;
}

const ROLLABLE_LIMITS = [
  [STAT_LIMITS.attack.min, STAT_LIMITS.attack.max],
  [STAT_LIMITS.defense.min, STAT_LIMITS.defense.max],
  [STAT_LIMITS.speed.min, STAT_LIMITS.speed.max],
] as const;

export function rollStats(): Pick<MonsterFormValues, 'attack' | 'defense' | 'speed' | 'hp'> {
  const hp = randomInt(STAT_LIMITS.hp.min, STAT_LIMITS.hp.max);
  const hpPoints = Math.floor(hp / 3);

  const minSpend = ROLLABLE_LIMITS.reduce((sum, [min]) => sum + min, 0);
  const maxCapacity = ROLLABLE_LIMITS.reduce((sum, [, max]) => sum + max, 0);
  const maxSpend = Math.min(ATTRIBUTE_BUDGET - hpPoints, maxCapacity);
  const spend = randomInt(minSpend, Math.max(minSpend, maxSpend));

  const [attack, defense, speed] = distributePoints(spend, ROLLABLE_LIMITS);

  return { attack, defense, speed, hp };
}
