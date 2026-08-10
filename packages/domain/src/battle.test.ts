import { describe, expect, it } from 'vitest';
import {
  MIN_DAMAGE,
  calculateDamage,
  hpAfterTurns,
  resolveFirstAttacker,
  simulateBattle,
} from './battle.ts';
import type { Monster } from './monster.ts';

function monster(overrides: Partial<Monster> = {}): Monster {
  return {
    id: 'm',
    name: 'Monstro',
    attack: 50,
    defense: 50,
    speed: 50,
    hp: 100,
    imageUrl: '',
    ...overrides,
  };
}

describe('calculateDamage', () => {
  it('subtrai a defesa do ataque', () => {
    // Arrange
    const attack = 80;
    const defense = 30;

    // Act
    const damage = calculateDamage(attack, defense);

    // Assert
    expect(damage).toBe(50);
  });

  it('usa dano mínimo quando o ataque é igual à defesa', () => {
    // Arrange
    const attack = 40;
    const defense = 40;

    // Act
    const damage = calculateDamage(attack, defense);

    // Assert
    expect(damage).toBe(MIN_DAMAGE);
  });

  it('usa dano mínimo quando o ataque é menor que a defesa', () => {
    // Arrange
    const attack = 10;
    const defense = 90;

    // Act
    const damage = calculateDamage(attack, defense);

    // Assert
    expect(damage).toBe(MIN_DAMAGE);
  });

  it('devolve a diferença quando o ataque supera a defesa por um', () => {
    // Arrange
    const attack = 41;
    const defense = 40;

    // Act
    const damage = calculateDamage(attack, defense);

    // Assert
    expect(damage).toBe(1);
  });
});

describe('resolveFirstAttacker', () => {
  it('a maior velocidade ataca primeiro', () => {
    // Arrange
    const left = monster({ speed: 10 });
    const right = monster({ speed: 99 });

    // Act
    const first = resolveFirstAttacker(left, right);

    // Assert
    expect(first).toBe('right');
  });

  it('com velocidades iguais, o maior ataque vai primeiro', () => {
    // Arrange
    const left = monster({ speed: 50, attack: 20 });
    const right = monster({ speed: 50, attack: 70 });

    // Act
    const first = resolveFirstAttacker(left, right);

    // Assert
    expect(first).toBe('right');
  });

  it('com velocidades iguais, se a esquerda tem o maior ataque, ela vai primeiro', () => {
    // Arrange
    const left = monster({ speed: 50, attack: 70 });
    const right = monster({ speed: 50, attack: 20 });

    // Act
    const first = resolveFirstAttacker(left, right);

    // Assert
    expect(first).toBe('left');
  });

  it('com velocidade e ataque iguais, a esquerda começa (desempate estável)', () => {
    // Arrange
    const left = monster();
    const right = monster();

    // Act
    const first = resolveFirstAttacker(left, right);

    // Assert
    expect(first).toBe('left');
  });
});

describe('simulateBattle', () => {
  it('vence quem zera o HP do inimigo primeiro', () => {
    // Arrange
    const left = monster({ id: 'l', speed: 60, attack: 70, defense: 30, hp: 100 });
    const right = monster({ id: 'r', speed: 10, attack: 30, defense: 20, hp: 100 });

    // Act
    const result = simulateBattle(left, right);

    // Assert
    expect(result.first).toBe('left');
    expect(result.winner).toBe('left');
    expect(result.loser).toBe('right');
    expect(result.turns).toHaveLength(3);
    expect(result.turns.at(-1)?.defenderHpAfter).toBe(0);
  });

  it('alterna os atacantes turno a turno', () => {
    // Arrange
    const left = monster({ speed: 99 });
    const right = monster({ speed: 1 });

    // Act
    const { turns } = simulateBattle(left, right);

    // Assert
    turns.forEach((turn, index) => {
      expect(turn.attacker).toBe(index % 2 === 0 ? 'left' : 'right');
      expect(turn.defender).not.toBe(turn.attacker);
    });
  });

  it('agrupa dois turnos por round', () => {
    // Arrange
    const left = monster({ speed: 99 });
    const right = monster({ speed: 1 });

    // Act
    const { turns } = simulateBattle(left, right);

    // Assert
    expect(turns[0].round).toBe(1);
    expect(turns[1].round).toBe(1);
    expect(turns[2].round).toBe(2);
  });

  it('nunca deixa o HP negativo', () => {
    // Arrange
    const left = monster({ speed: 99, attack: 999, defense: 0, hp: 10 });
    const right = monster({ speed: 1, attack: 1, defense: 0, hp: 5 });

    // Act
    const { turns } = simulateBattle(left, right);

    // Assert
    expect(turns.at(-1)?.defenderHpAfter).toBe(0);
  });

  it('termina mesmo quando os dois só causam dano mínimo', () => {
    // Arrange
    const tank = { attack: 1, defense: 999, hp: 20 };
    const left = monster({ ...tank, speed: 2 });
    const right = monster({ ...tank, speed: 1 });

    // Act
    const result = simulateBattle(left, right);

    // Assert
    expect(result.winner).toBe('left');
    expect(result.turns).toHaveLength(39);
  });

  it('marca isChip quando o dano foi limitado ao mínimo', () => {
    // Arrange
    const left = monster({ speed: 99, attack: 10, defense: 10 });
    const right = monster({ speed: 1, attack: 10, defense: 10 });

    // Act
    const { turns } = simulateBattle(left, right);

    // Assert
    expect(turns[0].isChip).toBe(true);
  });

  it('não marca isChip quando o dano supera o mínimo', () => {
    // Arrange
    const left = monster({ speed: 99, attack: 80, defense: 10 });
    const right = monster({ speed: 1, attack: 10, defense: 10 });

    // Act
    const { turns } = simulateBattle(left, right);

    // Assert
    expect(turns[0].isChip).toBe(false);
  });

  it('quando a direita é mais rápida, ela vence e o HP da esquerda chega a zero', () => {
    // Arrange
    const left = monster({ id: 'l', speed: 1, attack: 10, defense: 0, hp: 10 });
    const right = monster({ id: 'r', speed: 99, attack: 10, defense: 0, hp: 10 });

    // Act
    const result = simulateBattle(left, right);

    // Assert
    expect(result.winner).toBe('right');
    expect(result.turns).toHaveLength(1);
    expect(result.turns[0].defenderHpAfter).toBe(0);
  });

  it('funciona em espelho (mesmo id nos dois lados)', () => {
    // Arrange
    const clone = monster({ id: 'same', speed: 50, attack: 60, defense: 30, hp: 40 });

    // Act
    const result = simulateBattle(clone, { ...clone });

    // Assert
    expect(result.first).toBe('left');
    expect(result.winner).toBe('left');
  });

  it('acumula o dano total por lado', () => {
    // Arrange
    const left = monster({ speed: 99, attack: 60, defense: 10, hp: 100 });
    const right = monster({ speed: 1, attack: 40, defense: 10, hp: 100 });

    // Act
    const { totalDamage } = simulateBattle(left, right);

    // Assert
    expect(totalDamage.left).toBe(100);
    expect(totalDamage.right).toBe(30);
  });

  it('no golpe fatal, soma o HP que sobrava no perdedor, não o ataque bruto', () => {
    // Arrange
    const left = monster({ speed: 99, attack: 100, defense: 10, hp: 50 });
    const right = monster({ speed: 1, attack: 5, defense: 0, hp: 30 });

    // Act
    const { totalDamage } = simulateBattle(left, right);

    // Assert
    expect(totalDamage.left).toBe(right.hp);
  });

  it('guarda o HP inicial de cada lado', () => {
    // Arrange
    const left = monster({ hp: 78 });
    const right = monster({ hp: 79 });

    // Act
    const { startHp } = simulateBattle(left, right);

    // Assert
    expect(startHp).toEqual({ left: 78, right: 79 });
  });

  it('rejeita monstros que já começam sem HP', () => {
    // Arrange
    const fainted = monster({ hp: 0 });
    const healthy = monster();

    // Act
    const act = () => simulateBattle(fainted, healthy);

    // Assert
    expect(act).toThrow(/HP/i);
  });

  it('rejeita quando é o monstro da direita que já começa sem HP', () => {
    // Arrange
    const healthy = monster();
    const fainted = monster({ hp: 0 });

    // Act
    const act = () => simulateBattle(healthy, fainted);

    // Assert
    expect(act).toThrow(/HP/i);
  });
});

describe('hpAfterTurns', () => {
  it('reconstrói o HP de cada lado depois de um número parcial de turnos', () => {
    // Arrange
    const left = monster({ id: 'l', speed: 60, attack: 70, defense: 30, hp: 100 });
    const right = monster({ id: 'r', speed: 10, attack: 30, defense: 20, hp: 100 });
    const result = simulateBattle(left, right);

    // Act
    const midBattle = hpAfterTurns(result, result.startHp, 1);

    // Assert
    expect(midBattle).toEqual({ left: 100, right: 50 });
  });

  it('devolve o HP inicial quando nenhum turno foi aplicado', () => {
    // Arrange
    const left = monster({ id: 'l', speed: 60, hp: 100 });
    const right = monster({ id: 'r', speed: 10, hp: 90 });
    const result = simulateBattle(left, right);

    // Act
    const beforeAnyTurn = hpAfterTurns(result, result.startHp, 0);

    // Assert
    expect(beforeAnyTurn).toEqual({ left: 100, right: 90 });
  });
});
