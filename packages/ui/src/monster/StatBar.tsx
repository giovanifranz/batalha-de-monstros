import { cn } from '../lib/utils.ts';

/** Teto visual por stat, espelhando os limites do `monsterFormSchema`: hp e o resto têm escalas diferentes. */
const MAX_BY_TONE = {
  hp: 300,
  attack: 100,
  defense: 100,
  speed: 100,
} as const;

const TONE = {
  hp: 'bg-chart-1',
  attack: 'bg-chart-3',
  defense: 'bg-chart-2',
  speed: 'bg-chart-4',
} as const;

type Props = { label: string; value: number; tone: keyof typeof TONE; className?: string };

export function StatBar({ label, value, tone, className }: Props) {
  const pct = Math.min(100, (value / MAX_BY_TONE[tone]) * 100);

  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      <span className="text-muted-foreground w-9 shrink-0 uppercase">{label}</span>
      <span className="w-8 shrink-0 text-right font-mono tabular-nums">{value}</span>
      <span className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
        <span
          className={cn('block h-full rounded-full', TONE[tone])}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
