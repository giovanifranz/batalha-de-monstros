import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '../components/alert.tsx';
import { cn } from '../lib/utils.ts';

type Props = {
  used: number;
  budget: number;
  error?: string;
};

function statusLabel(remaining: number): string {
  if (remaining < 0) {
    const over = Math.abs(remaining);
    return over === 1 ? '1 ponto acima do limite' : `${over} pontos acima do limite`;
  }

  return remaining === 1 ? 'Resta 1 ponto' : `Restam ${remaining} pontos`;
}

export function PointBudget({ used, budget, error }: Props) {
  const remaining = budget - used;
  const over = remaining < 0;
  const pct = Math.min(100, (used / budget) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs" role="status">
        <span
          className={cn(
            'flex items-center gap-1.5',
            over ? 'text-destructive-ink font-medium' : 'text-muted-foreground',
          )}
        >
          {over ? (
            <AlertTriangle className="size-3.5" aria-hidden />
          ) : (
            <CheckCircle2 className="size-3.5" aria-hidden />
          )}
          {statusLabel(remaining)}
        </span>

        <span className="font-mono tabular-nums" aria-hidden="true">
          {used}/{budget}
        </span>
        <span className="sr-only">{`. ${used} de ${budget} pontos usados.`}</span>
      </div>

      <span className="bg-muted block h-1.5 overflow-hidden rounded-full">
        <span
          className={cn(
            'block h-full rounded-full transition-[width]',
            over ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${pct}%` }}
        />
      </span>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
