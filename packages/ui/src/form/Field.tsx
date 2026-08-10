import { useId, type ReactNode } from 'react';
import { Label } from '../components/label.tsx';
import { cn } from '../lib/utils.ts';

type ControlProps = {
  id: string;
  'aria-invalid': boolean | undefined;
  'aria-describedby': string | undefined;
};

type Props = {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (control: ControlProps) => ReactNode;
};

export function Field({ label, error, hint, className, children }: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>

      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': cn(error && errorId, hint && !error && hintId) || undefined,
      })}

      {hint && !error && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-destructive-ink text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
