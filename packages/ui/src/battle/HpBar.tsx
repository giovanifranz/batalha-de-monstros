import { cn } from '../lib/utils.ts';

type Props = {
  current: number;
  max: number;
  label: string;
  /**
   * Prop, e não um `duration-700` fixo, porque quem sabe o ritmo é o reprodutor:
   * a batida de impacto dura 200 ms em 4x.
   */
  drainMs?: number;
};

function tone(ratio: number) {
  if (ratio > 0.5) return 'bg-hp-high';
  if (ratio > 0.2) return 'bg-hp-mid';
  return 'bg-hp-low';
}

export function HpBar({ current, max, label, drainMs = 700 }: Props) {
  // Clamp nos DOIS lados, em vez de confiar no `overflow-hidden`.
  const clamped = Math.min(Math.max(current, 0), max);
  const ratio = max > 0 ? clamped / max : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      className="border-foreground/60 bg-background h-2 w-full overflow-hidden rounded-full border"
    >
      {/* `transitionDuration` inline em vez de `duration-*`: o valor é
          calculado, e classe do Tailwind não sai de interpolação. A regra
          `prefers-reduced-motion` de `styles.css` usa `!important`, então ela
          continua ganhando deste style — o inline não fura a preferência. */}
      <div
        className={cn('h-full transition-[width] ease-out', tone(ratio))}
        style={{ width: `${ratio * 100}%`, transitionDuration: `${drainMs}ms` }}
      />
    </div>
  );
}
