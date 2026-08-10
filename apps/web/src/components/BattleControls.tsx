import { Button } from '@arena/ui/components/button';
import { ToggleGroup, ToggleGroupItem } from '@arena/ui/components/toggle-group';
import { useSelector } from '@xstate/react';
import { FastForward } from 'lucide-react';
import { PLAYBACK_SPEEDS, settingsStore } from '@/stores/settings.store.ts';

type Props = {
  canSkip: boolean;
  onSkip: () => void;
};

export function BattleControls({ canSkip, onSkip }: Props) {
  const speed = useSelector(settingsStore, (snapshot) => snapshot.context.speed);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <ToggleGroup
        type="single"
        variant="outline"
        value={String(speed)}
        onValueChange={(value) => {
          const next = PLAYBACK_SPEEDS.find((option) => String(option) === value);
          if (next) settingsStore.trigger.speedSet({ speed: next });
        }}
        aria-label="Velocidade da batalha"
      >
        {PLAYBACK_SPEEDS.map((option) => (
          <ToggleGroupItem key={option} value={String(option)} aria-label={`Velocidade ${option}x`}>
            {option}x
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {canSkip && (
        <Button variant="secondary" onClick={onSkip}>
          <FastForward /> Pular para o fim
        </Button>
      )}
    </div>
  );
}
