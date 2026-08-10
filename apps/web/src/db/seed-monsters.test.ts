import { simulateBattle } from '@arena/domain/battle';
import { monsterSchema } from '@arena/domain/monster';
import { describe, expect, it } from 'vitest';
import { sortByName } from '@/hooks/useMonsterBrowser.ts';
import { SEED_MONSTERS } from './seed-monsters.ts';

/**
 * A semente é o único dado escrito sem passar por formulário, e roda no boot: um
 * monstro fora do schema derruba o app na entrada.
 */
describe('semente do roster', () => {
  it('cadastra apenas monstros que passam no monsterSchema', () => {
    // Arrange
    const seed = SEED_MONSTERS;

    // Act
    const rejected = seed
      .map((monster) => ({ monster, parsed: monsterSchema.safeParse(monster) }))
      .filter(({ parsed }) => !parsed.success)
      .map(({ monster, parsed }) => ({
        name: monster.name,
        issues: parsed.error?.issues.map((issue) => issue.message),
      }));

    // Assert: sem o `toHaveLength` uma semente vazia passaria sem rejeitar nada.
    expect(rejected).toEqual([]);
    expect(seed).toHaveLength(4);
  });

  it('abre o duelo padrão com as duas regras de dano numa batalha curta', () => {
    // Arrange: a dupla sai do MESMO `sortByName` do grid; reimplementar a ordem
    // aqui deixaria o teste verde defendendo uma primeira dupla que a tela não mostra.
    const [left, right] = sortByName(SEED_MONSTERS);

    // Act
    const result = simulateBattle(left, right);

    // Assert
    expect(result.turns.length).toBe(10);
    expect(result.turns.some((turn) => turn.isChip)).toBe(true);
    expect(result.turns.some((turn) => !turn.isChip)).toBe(true);
  });
});
