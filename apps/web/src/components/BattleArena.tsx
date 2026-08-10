import type { BattleResult, Side } from '@arena/domain/battle';
import type { Monster } from '@arena/domain/monster';
import { BattleStage } from '@arena/ui/battle/BattleStage';
import { BattleTextBox } from '@arena/ui/battle/BattleTextBox';
import { useMachine, useSelector } from '@xstate/react';
import { useEffect } from 'react';
import {
  battleMachine,
  IMPACT_MS,
  selectCurrentTurn,
  selectHp,
  sendIfActive,
} from '@/machines/battle.machine.ts';
import { settingsStore } from '@/stores/settings.store.ts';
import { BattleControls } from './BattleControls.tsx';
import { VictoryPanel } from './VictoryPanel.tsx';

type Props = {
  left: Monster;
  right: Monster;
  result: BattleResult;
  onReplay: () => void;
};

export function BattleArena({ left, right, result, onReplay }: Props) {
  const speed = useSelector(settingsStore, (snapshot) => snapshot.context.speed);
  const [snapshot, , actorRef] = useMachine(battleMachine, { input: { result, speed } });

  useEffect(() => {
    sendIfActive(actorRef, { type: 'speed.changed', speed });
  }, [speed, actorRef]);

  const fighters: Record<Side, Monster> = { left, right };
  const currentTurn = selectCurrentTurn(snapshot);
  const finished = snapshot.hasTag('finished');

  return (
    <div className="space-y-4">
      <div className="arena space-y-4">
        <h2 className="sr-only">Lutadores</h2>

        <BattleStage
          fighters={fighters}
          hp={selectHp(snapshot)}
          attacking={snapshot.hasTag('announcing') ? currentTurn?.attacker : undefined}
          takingHit={snapshot.hasTag('impacting') ? currentTurn?.defender : undefined}
          drainMs={Math.min(700, Math.round(IMPACT_MS / speed))}
        />

        <BattleTextBox
          fighters={fighters}
          turn={currentTurn}
          beat={snapshot.hasTag('impacting') ? 'impact' : 'announce'}
          status={snapshot.hasTag('intro') ? 'intro' : finished ? 'finished' : 'playing'}
          winnerName={fighters[result.winner].name}
        />
      </div>

      <BattleControls
        canSkip={snapshot.can({ type: 'battle.skip' })}
        onSkip={() => sendIfActive(actorRef, { type: 'battle.skip' })}
      />

      {finished && <VictoryPanel left={left} right={right} result={result} onReplay={onReplay} />}
    </div>
  );
}
