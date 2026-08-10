import { hpAfterTurns, type BattleResult, type BattleTurn, type Side } from '@arena/domain/battle';
import {
  assertEvent,
  assign,
  setup,
  type ActorRefFrom,
  type EventFromLogic,
  type SnapshotFrom,
} from 'xstate';

export const INTRO_MS = 1200;
export const ANNOUNCE_MS = 900;
export const IMPACT_MS = 800;

type Context = {
  result: BattleResult;
  turnIndex: number;
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

  delays: {
    intro: ({ context }) => INTRO_MS / context.speed,
    announce: ({ context }) => ANNOUNCE_MS / context.speed,
    impact: ({ context }) => IMPACT_MS / context.speed,
  },
}).createMachine({
  id: 'battle',
  context: ({ input }) => ({ result: input.result, turnIndex: -1, speed: input.speed }),

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
      entry: ['jumpToLastTurn'],
    },
  },
});

export type BattleSnapshot = SnapshotFrom<typeof battleMachine>;

export function sendIfActive(
  actorRef: ActorRefFrom<typeof battleMachine>,
  event: EventFromLogic<typeof battleMachine>,
): void {
  if (actorRef.getSnapshot().status === 'active') {
    actorRef.send(event);
  }
}

function appliedTurns(snapshot: BattleSnapshot): number {
  const { turnIndex, result } = snapshot.context;

  if (snapshot.hasTag('intro')) return 0;
  if (snapshot.hasTag('finished')) return result.turns.length;
  return snapshot.hasTag('impacting') ? turnIndex + 1 : turnIndex;
}

export function selectHp(snapshot: BattleSnapshot): Record<Side, number> {
  const { result } = snapshot.context;
  const startHp = { left: result.startHp.left, right: result.startHp.right };
  return hpAfterTurns(result, startHp, appliedTurns(snapshot));
}

export function selectCurrentTurn(snapshot: BattleSnapshot): BattleTurn | undefined {
  const { turnIndex, result } = snapshot.context;
  return turnIndex >= 0 ? result.turns[turnIndex] : undefined;
}
