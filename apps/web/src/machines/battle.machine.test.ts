import { hpAfterTurns, simulateBattle } from '@arena/domain/battle';
import type { Monster } from '@arena/domain/monster';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import {
  ANNOUNCE_MS,
  IMPACT_MS,
  INTRO_MS,
  battleMachine,
  selectCurrentTurn,
  selectHp,
  type BattleSnapshot,
} from './battle.machine.ts';

/*
 * Duelo curto conferido na mão: 30-5 = 25 tira a direita de 30 para 5; 20-10 = 10
 * tira a esquerda de 40 para 30; outro 25 zera a direita. Três turnos, dois rounds.
 */
const FAST: Monster = {
  id: 'fast',
  name: 'Fast',
  hp: 40,
  attack: 30,
  defense: 10,
  speed: 20,
  imageUrl: 'https://example.test/fast.png',
};

const SLOW: Monster = {
  id: 'slow',
  name: 'Slow',
  hp: 30,
  attack: 20,
  defense: 5,
  speed: 10,
  imageUrl: 'https://example.test/slow.png',
};

const result = simulateBattle(FAST, SLOW);
const finalHp = hpAfterTurns(result, result.startHp, result.turns.length);

function startActor(speed = 1) {
  const actor = createActor(battleMachine, { input: { result, speed } });
  actor.start();

  return actor;
}

/**
 * Roda a batalha inteira em passos finos e devolve o último frame. O teto de
 * passos é obrigatório: `advanceTimersByTime` roda num laço SÍNCRONO que o
 * timeout do Vitest não interrompe, então uma máquina que parasse de avançar
 * penduraria o `vp test` inteiro em vez de falhar.
 */
function playToEnd(actor: ReturnType<typeof startActor>, stepMs = 50): BattleSnapshot {
  const expectedMs = INTRO_MS + result.turns.length * (ANNOUNCE_MS + IMPACT_MS);
  // Folga de 2x sobre o pior caso conhecido (velocidade 1x).
  const maxSteps = Math.ceil((expectedMs * 2) / stepMs);

  let snapshot = actor.getSnapshot();
  for (let step = 0; step < maxSteps; step += 1) {
    if (snapshot.hasTag('finished')) return snapshot;

    vi.advanceTimersByTime(stepMs);
    snapshot = actor.getSnapshot();
  }

  throw new Error(
    `A batalha não terminou em ${maxSteps} passos de ${stepMs} ms — a máquina travou.`,
  );
}

describe('battleMachine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('abre sem nenhum golpe em cena e com o HP cheio dos dois lados', () => {
    // Arrange
    const actor = startActor();

    // Act
    const snapshot = actor.getSnapshot();

    // Assert
    expect(snapshot.hasTag('intro')).toBe(true);
    expect(selectCurrentTurn(snapshot)).toBeUndefined();
    expect(selectHp(snapshot)).toEqual({ left: FAST.hp, right: SLOW.hp });
  });

  it('mantém o HP intacto enquanto o golpe está apenas anunciado', () => {
    // Arrange
    const actor = startActor();

    // Act
    vi.advanceTimersByTime(INTRO_MS);

    // Assert
    const snapshot = actor.getSnapshot();
    expect(snapshot.hasTag('announcing')).toBe(true);
    expect(selectCurrentTurn(snapshot)).toEqual(result.turns[0]);
    expect(selectHp(snapshot)).toEqual({ left: FAST.hp, right: SLOW.hp });
  });

  it('aplica o dano do turno assim que a batida de impacto entra', () => {
    // Arrange
    const actor = startActor();
    vi.advanceTimersByTime(INTRO_MS);

    // Act
    vi.advanceTimersByTime(ANNOUNCE_MS);

    // Assert
    const snapshot = actor.getSnapshot();
    expect(snapshot.hasTag('impacting')).toBe(true);
    expect(selectHp(snapshot)).toEqual(hpAfterTurns(result, result.startHp, 1));
  });

  it('termina no mesmo HP final que o log do domínio', () => {
    // Arrange
    const actor = startActor();

    // Act
    const snapshot = playToEnd(actor);

    // Assert
    expect(snapshot.hasTag('finished')).toBe(true);
    expect(selectHp(snapshot)).toEqual(finalHp);
    expect(selectHp(snapshot)[result.loser]).toBe(0);
    expect(selectCurrentTurn(snapshot)).toEqual(result.turns[result.turns.length - 1]);
  });

  it('pular leva ao último turno com o mesmo HP de quem assistiu tudo', () => {
    // Arrange
    const actor = startActor();

    // Act
    actor.send({ type: 'battle.skip' });

    // Assert
    const snapshot = actor.getSnapshot();
    expect(snapshot.hasTag('finished')).toBe(true);
    expect(selectHp(snapshot)).toEqual(finalHp);
    expect(selectCurrentTurn(snapshot)).toEqual(result.turns[result.turns.length - 1]);
  });

  it('deixa de aceitar o pedido de pular depois que a batalha terminou', () => {
    // Arrange
    const actor = startActor();
    actor.send({ type: 'battle.skip' });

    // Act
    const canSkip = actor.getSnapshot().can({ type: 'battle.skip' });

    // Assert
    expect(canSkip).toBe(false);
  });

  it('divide a duração das batidas pela velocidade escolhida', () => {
    // Arrange
    const actor = startActor(4);

    // Act
    vi.advanceTimersByTime(INTRO_MS / 4);

    // Assert
    expect(actor.getSnapshot().hasTag('announcing')).toBe(true);
  });

  it('não encurta a batida em curso quando a velocidade muda no meio dela', () => {
    // Arrange: a abertura já passou; a batida de anúncio começou em 1x.
    const actor = startActor();
    vi.advanceTimersByTime(INTRO_MS);

    // Act
    actor.send({ type: 'speed.changed', speed: 4 });

    // Assert: a batida em curso mantém os 900 ms com que foi agendada — em 4x já teria acabado aos 225 ms.
    vi.advanceTimersByTime(ANNOUNCE_MS / 4);
    expect(actor.getSnapshot().hasTag('announcing')).toBe(true);

    // ...e a SEGUINTE já sai encurtada: aos 2300 ms a máquina anuncia o turno 1,
    // enquanto em 1x ainda estaria no impacto do turno 0.
    vi.advanceTimersByTime(ANNOUNCE_MS - ANNOUNCE_MS / 4 + IMPACT_MS / 4);
    const nextBeat = actor.getSnapshot();
    expect(nextBeat.hasTag('announcing')).toBe(true);
    expect(nextBeat.context.turnIndex).toBe(1);
  });

  /**
   * O invariante é a EXCLUSIVIDADE das tags, não o aninhamento: o frame ambíguo
   * (uma carta com o anel de ataque aceso durante a animação de golpe recebido)
   * só existe se um ÚNICO snapshot carregar 'announcing' e 'impacting'.
   */
  it('nunca carrega as tags de anúncio e de impacto no mesmo snapshot', () => {
    // Arrange
    const actor = startActor();
    vi.advanceTimersByTime(INTRO_MS);
    const announcing = actor.getSnapshot();

    // Act
    vi.advanceTimersByTime(ANNOUNCE_MS);

    // Assert
    const impacting = actor.getSnapshot();
    expect([announcing.hasTag('announcing'), announcing.hasTag('impacting')]).toEqual([
      true,
      false,
    ]);
    expect([impacting.hasTag('announcing'), impacting.hasTag('impacting')]).toEqual([false, true]);
  });
});
