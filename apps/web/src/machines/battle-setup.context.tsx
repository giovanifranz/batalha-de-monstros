import { createActorContext } from '@xstate/react';
import { battleSetupMachine } from './battle-setup.machine.ts';

export const BattleSetupActor = createActorContext(battleSetupMachine);
