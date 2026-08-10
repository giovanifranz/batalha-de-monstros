import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '../components/alert.tsx';
import { cn } from '../lib/utils.ts';

type Props = {
  /** `attack + defense + speed + ⌊hp / 3⌋`, já somado por quem chama. */
  used: number;
  budget: number;
  /** Mensagem literal do refine de `monsterFormSchema`, já resolvida por quem chama. */
  error?: string;
};

/** Concorda em número: 1 vira singular, dos dois lados. */
function statusLabel(remaining: number): string {
  if (remaining < 0) {
    const over = Math.abs(remaining);
    return over === 1 ? '1 ponto acima do limite' : `${over} pontos acima do limite`;
  }

  return remaining === 1 ? 'Resta 1 ponto' : `Restam ${remaining} pontos`;
}

/**
 * Indicador ao vivo do orçamento. Existe porque a soma é validação de OBJETO e
 * não aparece em `field.state.meta.errors` de nenhum campo.
 *
 * `text-destructive-ink` e não `text-destructive`: sobre `--card` o token de
 * preenchimento mede abaixo de 4.5 (o `-ink` dá 8.49 claro / 6.18 escuro). A cor
 * é REFORÇO — o texto já diz tudo, como manda a 1.4.1.
 *
 * `role="status"` na linha do contador: sem ele o único elemento anunciado era o
 * `<Alert>`, que carrega o texto CONSTANTE do schema e não o número que muda.
 */
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

        {/* O numeral é visual; quem é ANUNCIADO é a frase ao lado. A região é
            `aria-atomic` e relida inteira, então o ponto inicial da frase é o
            único separador entre as duas sentenças. */}
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
