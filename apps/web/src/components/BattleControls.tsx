import { Button } from '@arena/ui/components/button';
import { ToggleGroup, ToggleGroupItem } from '@arena/ui/components/toggle-group';
import { useSelector } from '@xstate/react';
import { FastForward } from 'lucide-react';
import { PLAYBACK_SPEEDS, settingsStore } from '@/stores/settings.store.ts';

type Props = {
  /** Vem de `snapshot.can({ type: 'battle.skip' })`, não de um `status`. */
  canSkip: boolean;
  onSkip: () => void;
};

/** A velocidade mora no `settingsStore` persistido: quem escolheu 4x não reescolhe a cada batalha. */
export function BattleControls({ canSkip, onSkip }: Props) {
  const speed = useSelector(settingsStore, (snapshot) => snapshot.context.speed);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <ToggleGroup
        type="single"
        variant="outline"
        value={String(speed)}
        onValueChange={(value) => {
          // `find` e não `Number(value)`: o Radix emite `''` ao clicar no item já
          // ativo, e o `0` resultante viraria duração `Infinity` — que a spec do
          // `setTimeout` converte para ~0, passando a batalha inteira num piscar.
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

      {/* Some em vez de virar "Rever batalha": um ternário entre dois `<Button>` na
          mesma posição é o mesmo elemento para o React, e o segundo clique de um
          duplo clique acertaria o botão de reiniciar recém-nascido ali. */}
      {canSkip && (
        <Button variant="secondary" onClick={onSkip}>
          <FastForward /> Pular para o fim
        </Button>
      )}
    </div>
  );
}
