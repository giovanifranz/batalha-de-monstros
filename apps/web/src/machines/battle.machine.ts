import { hpAfterTurns, type BattleResult, type BattleTurn, type Side } from '@arena/domain/battle';
import {
  assertEvent,
  assign,
  setup,
  type ActorRefFrom,
  type EventFromLogic,
  type SnapshotFrom,
} from 'xstate';

/*
 * Reprodutor do log que `simulateBattle` já calculou inteiro. Nada aqui decide
 * dano, iniciativa ou vencedor — a única coisa que avança é o relógio.
 *
 *   intro ──after(intro)──► battling ──────────────────────────► finished (final)
 *     │                       ├─ announcing ──after(announce)──► impacting
 *     │                       └─ impacting ──after(impact)──┬─[hasNextTurn]─► announcing (+advanceTurn)
 *     │                                                     └─[senão]───────► finished
 *     └────────────────── battle.skip ──────────────────────────────────────►┘
 */

/** Duração de cada batida em 1x. Exportadas para o teste não repetir os números na mão. */
export const INTRO_MS = 1200;
export const ANNOUNCE_MS = 900;
export const IMPACT_MS = 800;

type Context = {
  result: BattleResult;
  /** Turno em cena. -1 durante a abertura, antes do primeiro golpe. */
  turnIndex: number;
  /** Divisor das durações: 1x, 2x ou 4x. */
  speed: number;
};

export const battleMachine = setup({
  types: {
    context: {} as Context,
    input: {} as { result: BattleResult; speed: number },
    events: {} as { type: 'battle.skip' } | { type: 'speed.changed'; speed: number },
  },

  actions: {
    advanceTurn: assign({ turnIndex: ({ context }) => context.turnIndex + 1 }),
    jumpToLastTurn: assign({ turnIndex: ({ context }) => context.result.turns.length - 1 }),
    setSpeed: assign({
      speed: ({ event }) => {
        assertEvent(event, 'speed.changed');
        return event.speed;
      },
    }),
  },

  guards: {
    hasNextTurn: ({ context }) => context.turnIndex + 1 < context.result.turns.length,
  },

  // Lidos na ENTRADA do estado: mudar a velocidade no meio de uma batida só vale da próxima.
  delays: {
    intro: ({ context }) => INTRO_MS / context.speed,
    announce: ({ context }) => ANNOUNCE_MS / context.speed,
    impact: ({ context }) => IMPACT_MS / context.speed,
  },
}).createMachine({
  id: 'battle',
  context: ({ input }) => ({ result: input.result, turnIndex: -1, speed: input.speed }),

  // Transição interna (sem `target`): não reentra nenhum estado, então os `after` já agendados continuam valendo.
  on: {
    'speed.changed': { actions: ['setSpeed'] },
  },

  initial: 'intro',
  states: {
    intro: {
      tags: ['intro'],
      after: { intro: { target: 'battling' } },
      on: { 'battle.skip': { target: 'finished' } },
    },

    battling: {
      // Tira o turnIndex de -1: o primeiro golpe entra em cena.
      entry: ['advanceTurn'],
      on: { 'battle.skip': { target: 'finished' } },

      initial: 'announcing',
      states: {
        announcing: {
          tags: ['announcing'],
          after: { announce: { target: 'impacting' } },
        },
        impacting: {
          tags: ['impacting'],
          after: {
            impact: [
              { guard: 'hasNextTurn', target: 'announcing', actions: ['advanceTurn'] },
              { target: '#battle.finished' },
            ],
          },
        },
      },
    },

    finished: {
      type: 'final',
      tags: ['finished'],
      // Idempotente na chegada natural; essencial vindo do 'battle.skip'.
      entry: ['jumpToLastTurn'],
    },
  },
});

export type BattleSnapshot = SnapshotFrom<typeof battleMachine>;

/**
 * Manda um evento só se o ator ainda estiver de pé: `finished` é final da RAIZ,
 * então chegar nele PARA o ator, e o controle de velocidade continua clicável
 * depois do fim. Função de MÓDULO para a identidade ser estável.
 */
export function sendIfActive(
  actorRef: ActorRefFrom<typeof battleMachine>,
  event: EventFromLogic<typeof battleMachine>,
): void {
  if (actorRef.getSnapshot().status === 'active') {
    actorRef.send(event);
  }
}

/** Quantos turnos já tiveram o dano aplicado no que está na tela. */
function appliedTurns(snapshot: BattleSnapshot): number {
  const { turnIndex, result } = snapshot.context;

  if (snapshot.hasTag('intro')) return 0;
  if (snapshot.hasTag('finished')) return result.turns.length;
  // No 'announcing' o golpe está no ar; o HP só cai no 'impacting'.
  return snapshot.hasTag('impacting') ? turnIndex + 1 : turnIndex;
}

/** HP de cada lado no frame atual. */
export function selectHp(snapshot: BattleSnapshot): Record<Side, number> {
  const { result } = snapshot.context;
  const startHp = { left: result.startHp.left, right: result.startHp.right };
  return hpAfterTurns(result, startHp, appliedTurns(snapshot));
}

/** Turno em cena, ou `undefined` durante a abertura (nenhum golpe ainda). */
export function selectCurrentTurn(snapshot: BattleSnapshot): BattleTurn | undefined {
  const { turnIndex, result } = snapshot.context;
  return turnIndex >= 0 ? result.turns[turnIndex] : undefined;
}
