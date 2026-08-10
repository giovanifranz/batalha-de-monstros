import type { Side } from '@arena/domain/battle';
import type { Monster } from '@arena/domain/monster';
import { produce } from 'immer';
import { assertEvent, assign, setup } from 'xstate';

type Context = {
  left: Monster | null;
  right: Monster | null;
  activeSlot: Side;
};

type Events =
  | { type: 'fighter.picked'; monster: Monster }
  | { type: 'sides.swapped' }
  | { type: 'selection.cleared' };

const EMPTY: Context = { left: null, right: null, activeSlot: 'left' };

export const battleSetupMachine = setup({
  types: { context: {} as Context, events: {} as Events },

  actions: {
    togglePick: assign(({ context, event }) => {
      assertEvent(event, 'fighter.picked');
      const { monster } = event;

      return produce(context, (draft) => {
        const alreadyPicked: Side | undefined =
          draft.left?.id === monster.id
            ? 'left'
            : draft.right?.id === monster.id
              ? 'right'
              : undefined;

        if (alreadyPicked) {
          draft[alreadyPicked] = null;
          draft.activeSlot = alreadyPicked;
          return;
        }

        draft[draft.activeSlot] = monster;
        draft.activeSlot = draft.activeSlot === 'left' ? 'right' : 'left';
      });
    }),

    swapSides: assign(({ context }) =>
      produce(context, (draft) => {
        [draft.left, draft.right] = [draft.right, draft.left];

        if (Boolean(draft.left) !== Boolean(draft.right)) {
          draft.activeSlot = draft.left ? 'right' : 'left';
        }
      }),
    ),

    clearSelection: assign(() => EMPTY),
  },

  guards: {
    hasBothFighters: ({ context }) => Boolean(context.left && context.right),
    hasNoFighter: ({ context }) => !context.left && !context.right,
    hasOneFighter: ({ context }) => Boolean(context.left) !== Boolean(context.right),
  },
}).createMachine({
  id: 'battleSetup',
  context: EMPTY,

  on: {
    'fighter.picked': { actions: ['togglePick'] },
    'sides.swapped': { actions: ['swapSides'] },
    'selection.cleared': { actions: ['clearSelection'] },
  },

  initial: 'empty',
  states: {
    empty: {
      always: [
        { guard: 'hasBothFighters', target: 'ready' },
        { guard: 'hasOneFighter', target: 'partial' },
      ],
    },
    partial: {
      always: [
        { guard: 'hasBothFighters', target: 'ready' },
        { guard: 'hasNoFighter', target: 'empty' },
      ],
    },
    ready: {
      tags: ['can-fight'],
      always: [
        { guard: 'hasNoFighter', target: 'empty' },
        { guard: 'hasOneFighter', target: 'partial' },
      ],
    },
  },
});
