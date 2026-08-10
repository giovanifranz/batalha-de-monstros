import type { Monster } from './monster.ts';

export type Side = 'left' | 'right';

export type BattleTurn = {
  index: number;
  /** Round do jogo: dois turnos por round. */
  round: number;
  attacker: Side;
  defender: Side;
  damage: number;
  defenderHpBefore: number;
  defenderHpAfter: number;
  /** true quando ataque <= defesa e o dano caiu no piso de 1. */
  isChip: boolean;
};

export type BattleResult = {
  first: Side;
  winner: Side;
  loser: Side;
  turns: BattleTurn[];
  rounds: number;
  totalDamage: Record<Side, number>;
  startHp: Record<Side, number>;
};

export const MIN_DAMAGE = 1;

/**
 * Rede de segurança. `simulateBattle` não valida em tempo de execução: para um
 * monstro válido pelo schema o pior caso é 599 turnos, mas uma chamada direta
 * com HP ≥ 10 001 nos dois lados alcança este limite de verdade.
 */
const MAX_TURNS = 20_000;

const other = (side: Side): Side => (side === 'left' ? 'right' : 'left');

/** Regra do jogo: dano = ataque - defesa; se ataque <= defesa, dano = 1. */
export function calculateDamage(attack: number, defense: number): number {
  // A condição compara ataque e defesa, não o dano bruto com o piso: as duas só
  // coincidem enquanto o piso valer 1.
  return attack > defense ? attack - defense : MIN_DAMAGE;
}

/**
 * Regra do jogo: maior velocidade começa; empate resolve pelo maior ataque.
 * Empate duplo cai na esquerda para manter o resultado determinístico.
 */
export function resolveFirstAttacker(left: Monster, right: Monster): Side {
  if (left.speed !== right.speed) {
    // Stryker disable next-line EqualityOperator: sob esta guarda `>` e `>=` são equivalentes.
    return left.speed > right.speed ? 'left' : 'right';
  }
  if (left.attack !== right.attack) {
    // Stryker disable next-line EqualityOperator: sob esta guarda `>` e `>=` são equivalentes.
    return left.attack > right.attack ? 'left' : 'right';
  }
  return 'left';
}

/**
 * Roda a batalha inteira de uma vez e devolve o log completo.
 * Função pura: mesmos monstros, mesmo resultado. A UI só reproduz o log.
 */
export function simulateBattle(left: Monster, right: Monster): BattleResult {
  if (left.hp <= 0 || right.hp <= 0) {
    throw new Error('Ambos os monstros precisam começar com HP maior que zero.');
  }

  const fighters: Record<Side, Monster> = { left, right };
  const hp: Record<Side, number> = { left: left.hp, right: right.hp };
  const totalDamage: Record<Side, number> = { left: 0, right: 0 };

  const first = resolveFirstAttacker(left, right);
  const turns: BattleTurn[] = [];

  let index = 0;
  while (hp.left > 0 && hp.right > 0) {
    // Stryker disable next-line all: rede de segurança inalcançável por monstro válido no schema; não force com teste artificial.
    if (index >= MAX_TURNS) {
      // Stryker disable next-line all: mesma rede de segurança do guard acima.
      throw new Error('A batalha não convergiu — verifique os atributos dos monstros.');
    }

    const attacker: Side = index % 2 === 0 ? first : other(first);
    const defender = other(attacker);

    const damage = calculateDamage(fighters[attacker].attack, fighters[defender].defense);
    const defenderHpBefore = hp[defender];
    const defenderHpAfter = Math.max(0, defenderHpBefore - damage);

    hp[defender] = defenderHpAfter;
    // Conta o HP realmente removido (com o clamp em 0), não o `damage` bruto —
    // num golpe de overkill os dois divergem de propósito.
    totalDamage[attacker] += defenderHpBefore - defenderHpAfter;

    turns.push({
      index,
      round: Math.floor(index / 2) + 1,
      attacker,
      defender,
      damage,
      defenderHpBefore,
      defenderHpAfter,
      isChip: fighters[attacker].attack <= fighters[defender].defense,
    });

    index += 1;
  }

  const lastTurn = turns[turns.length - 1];

  return {
    first,
    winner: lastTurn.attacker,
    loser: lastTurn.defender,
    turns,
    rounds: lastTurn.round,
    totalDamage,
    startHp: { left: left.hp, right: right.hp },
  };
}

/** HP de cada lado depois de aplicar os `appliedTurns` primeiros turnos. */
export function hpAfterTurns(
  result: BattleResult,
  startHp: Record<Side, number>,
  appliedTurns: number,
): Record<Side, number> {
  const hp = { ...startHp };
  for (const turn of result.turns.slice(0, appliedTurns)) {
    hp[turn.defender] = turn.defenderHpAfter;
  }
  return hp;
}
